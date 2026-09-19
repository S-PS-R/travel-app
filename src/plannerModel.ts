import type { Place } from "./model";
import { isFlightRecord, type FlightRecord } from "./flightModel.ts";

export const transports = {
  flight: { label: "Flight", icon: "✈", color: "#ffc98b" },
  train: { label: "Train", icon: "🚆", color: "#73d9ce" },
  car: { label: "Car", icon: "🚗", color: "#b0b6ff" },
  bus: { label: "Bus", icon: "🚌", color: "#f3a6cc" },
  ferry: { label: "Ferry", icon: "⛴", color: "#71bfff" },
  bicycle: { label: "Bicycle", icon: "🚲", color: "#b6db83" },
  walk: { label: "Walk", icon: "🚶", color: "#f0de96" },
} as const;
export type Transport = keyof typeof transports;
export type PlanStop = { id: string; place: Place; mode: Transport; incomingFlight?:FlightRecord };
export type TransportDetails = { operator?: string; serviceNumber?: string; departureDate?: string; departureTime?: string; fromStation?: string; toStation?: string; notes?: string };
export type TravelLeg = { fromId: string; toId: string; mode: Transport; details?: Partial<Record<Transport, TransportDetails>>; flight?:FlightRecord };
export type TravelPlan = { title: string; stops: PlanStop[]; startDate?: string; endDate?: string; legs?: TravelLeg[] };
export const emptyPlan = (): TravelPlan => ({ title: "My next adventure", stops: [] });
export function parsePlan(raw: string): TravelPlan {
  const p = JSON.parse(raw);
  if (!p || typeof p.title !== "string" || !Array.isArray(p.stops) || p.stops.length > 50) throw new Error("This saved plan could not be read.");
  const ids = new Set();
  for (const stop of p.stops) {
    const place = stop?.place;
    if (!stop || typeof stop.id !== "string" || ids.has(stop.id) || !Object.hasOwn(transports, stop.mode) || !place ||
      typeof place.city !== "string" || typeof place.country !== "string" || typeof place.countryId !== "string" ||
      !Number.isFinite(place.lat) || Math.abs(place.lat) > 90 || !Number.isFinite(place.lon) || Math.abs(place.lon) > 180) throw new Error("This saved plan contains an invalid stop.");
    ids.add(stop.id);
  }
  if(p.legs!==undefined) {
    if(!Array.isArray(p.legs))throw new Error("Invalid saved transport details.");
    const pairs=new Set<string>();
    for(const leg of p.legs) {
      const pair=JSON.stringify([leg?.fromId,leg?.toId]);
      if(!leg||!ids.has(leg.fromId)||!ids.has(leg.toId)||leg.fromId===leg.toId||pairs.has(pair)||!Object.hasOwn(transports,leg.mode))throw new Error("Invalid saved connection.");
      pairs.add(pair);
      if(leg.flight!==undefined&&!isFlightRecord(leg.flight))throw new Error("Invalid saved flight details.");
      if(leg.details!==undefined) {
        if(!leg.details||typeof leg.details!=="object"||Array.isArray(leg.details))throw new Error("Invalid saved transport details.");
        for(const [mode,details] of Object.entries(leg.details)) {
          if(!Object.hasOwn(transports,mode)||!details||typeof details!=="object"||Array.isArray(details))throw new Error("Invalid saved transport details.");
          for(const [key,value] of Object.entries(details)) {
            if(!["operator","serviceNumber","departureDate","departureTime","fromStation","toStation","notes"].includes(key)||typeof value!=="string"||value.length>2000)throw new Error("Invalid saved transport field.");
          }
        }
      }
    }
  }
  return p;
}
// Old plans stored the arrival mode on the destination stop. Convert only when
// editing connections; the original records remain readable without rewriting.
export function storedLegs(plan: TravelPlan): TravelLeg[] {
  return plan.legs ?? plan.stops.slice(1).map((stop,i)=>({fromId:plan.stops[i].id,toId:stop.id,mode:stop.mode}));
}
export function connection(plan:TravelPlan,fromId:string,toId:string):TravelLeg {
  return storedLegs(plan).find(leg=>leg.fromId===fromId&&leg.toId===toId)??{fromId,toId,mode:"flight"};
}
export function updateConnection(plan:TravelPlan,leg:TravelLeg):TravelPlan {
  return {...plan,legs:[...storedLegs(plan).filter(l=>l.fromId!==leg.fromId||l.toId!==leg.toId),leg]};
}
export function reorderPlanStops(plan:TravelPlan,fromId:string,toId:string):TravelPlan {
  const from=plan.stops.findIndex(s=>s.id===fromId),to=plan.stops.findIndex(s=>s.id===toId);
  if(from<0||to<0||from===to)return plan;
  const stops=[...plan.stops];const [moved]=stops.splice(from,1);stops.splice(to,0,moved);
  return {...plan,stops,legs:storedLegs(plan)};
}
export function removePlanStop(plan:TravelPlan,id:string):TravelPlan {
  return {...plan,stops:plan.stops.filter(s=>s.id!==id),legs:storedLegs(plan).filter(l=>l.fromId!==id&&l.toId!==id)};
}
export function mapRoute(plan:TravelPlan):PlanStop[] {
  return plan.stops.map((stop,i)=>{const leg=i?connection(plan,plan.stops[i-1].id,stop.id):null;return {...stop,mode:leg?.mode??stop.mode,incomingFlight:leg?.mode==="flight"?leg.flight:undefined};});
}
export function distanceKm(a: Place, b: Place) {
  const r = Math.PI / 180;
  const h = Math.sin((b.lat-a.lat)*r/2)**2 + Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function moveStop(stops: PlanStop[], index: number, delta: number) {
  const target = index + delta;
  if (index < 0 || index >= stops.length || target < 0 || target >= stops.length) return stops;
  const next = [...stops];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

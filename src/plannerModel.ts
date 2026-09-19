import type { Place } from "./model";

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
export type PlanStop = { id: string; place: Place; mode: Transport };
export type TravelPlan = { title: string; stops: PlanStop[]; startDate?: string; endDate?: string };
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
  return p;
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

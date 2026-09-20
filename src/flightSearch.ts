import airports from '../assets/airports.json' with {type:'json'};
import {flightQuery,normalizeFlightNumber,isFlightRecord,type FlightRecord,type FlightSegment} from './flightModel.ts';
export function searchQuery(from:string,to:string,date:string,number='',today=new Date().toISOString().slice(0,10)) {
  const departure=from.trim().toUpperCase(),arrival=to.trim().toUpperCase();
  if(!/^[A-Z]{3}$/.test(departure)||!airports.some(a=>a.code===departure)||!/^[A-Z]{3}$/.test(arrival)||!airports.some(a=>a.code===arrival))throw new Error('Choose valid three-letter airport codes, for example JFK and LHR.');
  if(departure===arrival)throw new Error('Choose different departure and arrival airports.');
  flightQuery('AA1',date);
  if(date<today)throw new Error('Choose today or a future departure date.');
  const normalized=number.trim()?flightQuery(number,date).number:'';
  return {from:departure,to:arrival,date,number:normalized};
}
export function nearbyAirports(place:{lat:number;lon:number}) {
  const r=Math.PI/180;
  return airports.filter(a=>a.scheduled).map(a=>({...a,distance:Math.sin((a.lat-place.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(place.lat*r)*Math.sin((a.lon-place.lon)*r/2)**2})).sort((a,b)=>a.distance-b.distance).slice(0,5);
}
const text=(v:unknown)=>typeof v==='string'?v.slice(0,250):typeof v==='number'&&Number.isFinite(v)?String(v):'';
const airport=(code:string)=>{const a=airports.find(a=>a.code===code);return a?{code:a.code,name:a.name.slice(0,250),lat:a.lat,lon:a.lon}:undefined;};
// Whitelist provider fields: never forward search metadata, API URLs, or tokens.
export function normalizeSearchResponse(data:any,query:ReturnType<typeof searchQuery>):FlightRecord[] {
  const results:FlightRecord[]=[];const seen=new Set<string>();
  for(const offer of [...(Array.isArray(data?.best_flights)?data.best_flights:[]),...(Array.isArray(data?.other_flights)?data.other_flights:[])]) {
    if(!Array.isArray(offer?.flights)||!offer.flights.length||offer.flights.length>8)continue;
    const raw=offer.flights,first=raw[0],last=raw[raw.length-1];
    if(first?.departure_airport?.id!==query.from||last?.arrival_airport?.id!==query.to||text(first?.departure_airport?.time).slice(0,10)!==query.date)continue;
    if(raw.some((s:any,i:number)=>!s?.flight_number||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s?.departure_airport?.time)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s?.arrival_airport?.time)||(i>0&&s.departure_airport.id!==raw[i-1].arrival_airport?.id)))continue;
    const segments:FlightSegment[]=raw.map((s:any)=>({number:normalizeFlightNumber(text(s.flight_number)),airline:text(s.airline),from:text(s.departure_airport.id),to:text(s.arrival_airport.id),departure:text(s.departure_airport.time),arrival:text(s.arrival_airport.time),duration:text(s.duration),aircraft:text(s.airplane)}));
    if(query.number&&!segments.some(s=>s.number===query.number))continue;
    const id=JSON.stringify(segments);if(seen.has(id))continue;seen.add(id);
    const points=[airport(segments[0].from),...segments.map(s=>airport(s.to))];
    const flight:FlightRecord={provider:'serpapi',number:segments.map(s=>s.number).join(' / '),departureDate:query.date,airline:[...new Set(segments.map(s=>s.airline))].join(' / ').slice(0,250),departureAirport:`${query.from} · ${text(first.departure_airport.name)}`.slice(0,250),arrivalAirport:`${query.to} · ${text(last.arrival_airport.name)}`.slice(0,250),departureTime:segments[0].departure.slice(11),arrivalTime:segments.at(-1)!.arrival.slice(11),arrivalDate:segments.at(-1)!.arrival.slice(0,10),status:'Planned schedule',duration:text(offer.total_duration),aircraft:[...new Set(segments.map(s=>s.aircraft))].join(' / ').slice(0,250),departureTerminal:'',departureGate:'',arrivalTerminal:'',arrivalGate:'',baggage:'',delay:'',estimatedDeparture:'',estimatedArrival:'',retrievedAt:new Date().toISOString(),price:typeof offer.price==='number'&&Number.isFinite(offer.price)?`USD ${offer.price}`:'',segments,departure:points[0],arrival:points.at(-1),waypoints:points.every(Boolean)?points as NonNullable<typeof points[number]>[]:undefined};
    if(isFlightRecord(flight))results.push(flight);
  }
  return results.slice(0,30);
}

export type FlightAirport = { code:string; name:string; lat:number; lon:number };
export type FlightSegment = {number:string;airline:string;from:string;to:string;departure:string;arrival:string;duration:string;aircraft:string};
export type FlightRecord = {
  number:string; departureDate:string; airline:string; departureAirport:string; arrivalAirport:string;
  departureTime:string; arrivalTime:string; arrivalDate:string; status:string;
  departureTerminal:string; departureGate:string; arrivalTerminal:string; arrivalGate:string;
  baggage:string; duration:string; delay:string; aircraft:string; estimatedDeparture:string; estimatedArrival:string;
  retrievedAt:string; departure?:FlightAirport; arrival?:FlightAirport;
  provider?:"serpapi"; price?:string; segments?:FlightSegment[]; waypoints?:FlightAirport[];
};
export function normalizeFlightNumber(value:string) { return value.replace(/[\s-]/g,"").toUpperCase(); }
export function flightQuery(number:string,date:string) {
  const normalized=normalizeFlightNumber(number);
  const match=normalized.match(/^([A-Z0-9]{2}|[A-Z]{3})(\d{1,4}[A-Z]?)$/);
  if(!match)throw new Error("Enter a full flight number, including the airline code (for example AI 101).");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error("Choose a valid departure date.");
  return {number:normalized,date,parameter:match[1].length===3?"flight_icao":"flight_iata"};
}
export function isFlightRecord(value:unknown):value is FlightRecord {
  if(!value||typeof value!=="object")return false;
  const f=value as FlightRecord;
  const fields=["number","departureDate","airline","departureAirport","arrivalAirport","departureTime","arrivalTime","arrivalDate","status","departureTerminal","departureGate","arrivalTerminal","arrivalGate","baggage","duration","delay","aircraft","estimatedDeparture","estimatedArrival","retrievedAt"] as const;
  if(!fields.every(key=>typeof f[key]==="string"&&f[key].length<=250))return false;
  const airport=(a:FlightAirport)=>a&&typeof a.code==="string"&&a.code.length<=3&&typeof a.name==="string"&&a.name.length<=250&&Number.isFinite(a.lat)&&Math.abs(a.lat)<=90&&Number.isFinite(a.lon)&&Math.abs(a.lon)<=180;
  if(f.provider!==undefined&&f.provider!=="serpapi")return false;
  if(f.price!==undefined&&(typeof f.price!=="string"||f.price.length>50))return false;
  if(f.segments!==undefined&&(!Array.isArray(f.segments)||!f.segments.length||f.segments.length>8||!f.segments.every(s=>s&&["number","airline","from","to","departure","arrival","duration","aircraft"].every(k=>typeof s[k as keyof FlightSegment]==="string"&&s[k as keyof FlightSegment].length<=250))))return false;
  if(f.waypoints!==undefined&&(!Array.isArray(f.waypoints)||f.waypoints.length>16||!f.waypoints.every(airport)))return false;
  return [f.departure,f.arrival].every(a=>a===undefined||airport(a));
}

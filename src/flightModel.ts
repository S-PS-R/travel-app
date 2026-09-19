export type FlightAirport = { code:string; name:string; lat:number; lon:number };
export type FlightRecord = {
  number:string; departureDate:string; airline:string; departureAirport:string; arrivalAirport:string;
  departureTime:string; arrivalTime:string; arrivalDate:string; status:string;
  departureTerminal:string; departureGate:string; arrivalTerminal:string; arrivalGate:string;
  baggage:string; duration:string; delay:string; aircraft:string; estimatedDeparture:string; estimatedArrival:string;
  retrievedAt:string; departure?:FlightAirport; arrival?:FlightAirport;
};
export function normalizeFlightNumber(value:string) { return value.replace(/[\s-]/g,"").toUpperCase(); }
export function flightQuery(number:string,date:string) {
  const normalized=normalizeFlightNumber(number);
  const match=normalized.match(/^([A-Z0-9]{2}|[A-Z]{3})(\d{1,4}[A-Z]?)$/);
  if(!match)throw new Error("Enter a full flight number, including the airline code (for example AI 101).");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error("Choose a valid departure date.");
  return {number:normalized,date,parameter:match[1].length===3?"flight_icao":"flight_iata"};
}
const text=(value:unknown)=>typeof value==="string"?value.slice(0,250):typeof value==="number"?String(value):"";
export function normalizeFlightResponse(raw:unknown,number:string,date:string):FlightRecord {
  const query=flightQuery(number,date);const data=raw as Record<string,unknown>;
  if(!data||typeof data!=="object"||normalizeFlightNumber(text(data[query.parameter]))!==query.number)throw new Error("No matching flight was returned. Check the flight number or enter details manually.");
  const dep=text(data.dep_time),arr=text(data.arr_time);
  if(dep.slice(0,10)!==date)throw new Error("No flight was found for that departure date. This service returns the nearest scheduled/live flight; future or past dates may be unavailable. You can save details manually.");
  return {
    number:query.number,departureDate:date,airline:text(data.airline_name)||text(data.airline_iata),
    departureAirport:[text(data.dep_iata),text(data.dep_name)].filter(Boolean).join(" · "),
    arrivalAirport:[text(data.arr_iata),text(data.arr_name)].filter(Boolean).join(" · "),
    departureTime:dep.slice(11,16),arrivalDate:arr.slice(0,10),arrivalTime:arr.slice(11,16),status:text(data.status),
    departureTerminal:text(data.dep_terminal),departureGate:text(data.dep_gate),arrivalTerminal:text(data.arr_terminal),arrivalGate:text(data.arr_gate),
    baggage:text(data.arr_baggage),duration:text(data.duration),delay:text(data.delayed??data.dep_delayed),aircraft:text(data.aircraft_icao),
    estimatedDeparture:text(data.dep_estimated),estimatedArrival:text(data.arr_estimated),retrievedAt:new Date().toISOString(),
  };
}
export function isFlightRecord(value:unknown):value is FlightRecord {
  if(!value||typeof value!=="object")return false;
  const f=value as FlightRecord;
  const fields=["number","departureDate","airline","departureAirport","arrivalAirport","departureTime","arrivalTime","arrivalDate","status","departureTerminal","departureGate","arrivalTerminal","arrivalGate","baggage","duration","delay","aircraft","estimatedDeparture","estimatedArrival","retrievedAt"] as const;
  if(!fields.every(key=>typeof f[key]==="string"&&f[key].length<=250))return false;
  return [f.departure,f.arrival].every(a=>a===undefined||(a&&typeof a.code==="string"&&typeof a.name==="string"&&Number.isFinite(a.lat)&&Math.abs(a.lat)<=90&&Number.isFinite(a.lon)&&Math.abs(a.lon)<=180));
}

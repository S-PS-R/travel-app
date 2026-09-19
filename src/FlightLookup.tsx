import React, { useEffect, useState } from "react";
import { View, Text, Platform } from "react-native";
import { Button, useTheme } from "./ui";
import { flightQuery, isFlightRecord, type FlightRecord } from "./flightModel";

export function FlightSummary({flight}:{flight:FlightRecord}) {
  const {s}=useTheme();
  return <View style={{gap:6}}><Text style={s.body}>{flight.airline} · {flight.number}</Text>
    <Text style={s.muted}>{flight.departureAirport} → {flight.arrivalAirport}</Text>
    <Text style={s.muted}>Departure {flight.departureDate} {flight.departureTime} · arrival {flight.arrivalDate} {flight.arrivalTime} (local times)</Text>
    {!!flight.status&&<Text style={s.muted}>Status: {flight.status}</Text>}
    {(!!flight.departureTerminal||!!flight.departureGate)&&<Text style={s.muted}>Departure · terminal {flight.departureTerminal||"—"} · gate {flight.departureGate||"—"}</Text>}
    {(!!flight.arrivalTerminal||!!flight.arrivalGate)&&<Text style={s.muted}>Arrival · terminal {flight.arrivalTerminal||"—"} · gate {flight.arrivalGate||"—"}</Text>}
    {!!flight.baggage&&<Text style={s.muted}>Baggage belt: {flight.baggage}</Text>}
    {!!flight.duration&&<Text style={s.muted}>Duration: {flight.duration} min{flight.delay?` · delay: ${flight.delay} min`:""}</Text>}
    {!!flight.estimatedDeparture&&<Text style={s.muted}>Estimated departure: {flight.estimatedDeparture}</Text>}
    {!!flight.estimatedArrival&&<Text style={s.muted}>Estimated arrival: {flight.estimatedArrival}</Text>}
    {!!flight.aircraft&&<Text style={s.muted}>Aircraft: {flight.aircraft}</Text>}
    <Text style={[s.muted,{fontSize:12}]}>AirLabs snapshot · {new Date(flight.retrievedAt).toLocaleString()}. Check with the airline for changes.</Text>
    <Text style={[s.muted,{fontSize:12}]}>{flight.departure&&flight.arrival?"Map preview uses these airports. AirLabs did not supply a flown track.":"Airport coordinates unavailable; the map retains the city-to-city preview."}</Text>
  </View>;
}
export default function FlightLookup({number,date,disabled,onUse}:{number:string;date:string;disabled:boolean;onUse:(flight:FlightRecord)=>void}) {
  const {s}=useTheme();const [busy,setBusy]=useState(false),[error,setError]=useState("");const [result,setResult]=useState<FlightRecord|null>(null);
  const [abort]=useState(()=>new AbortController());useEffect(()=>()=>abort.abort(),[abort]);
  async function lookup(){
    setError("");setResult(null);setBusy(true);
    try {
      const query=flightQuery(number,date);
      const local=Platform.OS==="web"&&typeof location!=="undefined"&&["127.0.0.1","127.0.0.2","localhost"].includes(location.hostname);
      const base=process.env.EXPO_PUBLIC_FLIGHT_LOOKUP_URL||(local?"http://127.0.0.1:8082":"");
      if(!base)throw new Error("Flight lookup is available in the local website. You can save details manually here.");
      const response=await fetch(`${base}/flight`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({number:query.number,date}),signal:abort.signal});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Flight lookup failed.");
      if(!isFlightRecord(payload))throw new Error("The flight-data service returned incomplete information.");
      setResult(payload);
    }catch(e){if(!abort.signal.aborted)setError(e instanceof TypeError?"Flight lookup is unavailable. Restart the local host or enter details manually.":e instanceof Error?e.message:"Flight lookup failed.");}
    finally{if(!abort.signal.aborted)setBusy(false);}
  }
  return <View style={{gap:12}}><Button disabled={disabled||busy} onPress={lookup}>{busy?"Looking up flight…":"Look up flight"}</Button>
    <Text style={[s.muted,{fontSize:12}]}>Search by flight number and departure date. Availability depends on the airline and date; no booking is made.</Text>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {result&&<><FlightSummary flight={result}/><Text style={s.muted}>Check that these airports match this connection before using the details.</Text><Button disabled={disabled} onPress={()=>{onUse(result);setResult(null);}}>Use these flight details</Button></>}
  </View>;
}

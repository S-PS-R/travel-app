import React, { useEffect, useRef, useState } from "react";
import { View, Text, Platform, ScrollView } from "react-native";
import { Button, useTheme } from "./ui";
import { isFlightRecord, type FlightRecord } from "./flightModel";
import { resolveAirline, searchQuery } from "./flightSearch";


export function FlightSummary({flight}:{flight:FlightRecord}) {
  const {s}=useTheme();
  return <View style={{gap:6}}><Text style={s.body}>{flight.airline} · {flight.number}</Text>
    <Text style={s.muted}>{flight.departureAirport} → {flight.arrivalAirport}</Text>
    <Text style={s.muted}>Departure {flight.departureDate} {flight.departureTime} · arrival {flight.arrivalDate} {flight.arrivalTime} (local airport times)</Text>
    {!!flight.price&&<Text style={s.body}>{flight.price} · one adult, economy, one way · price snapshot</Text>}
    {!!flight.duration&&<Text style={s.muted}>Total duration: {flight.duration} min</Text>}
    {flight.segments?.map((segment,i)=><View key={i} style={{gap:4}}><Text style={s.body}>{i+1}. {segment.number} · {segment.from} → {segment.to}</Text><Text style={s.muted}>{segment.departure} → {segment.arrival} · {segment.duration} min{segment.aircraft?` · ${segment.aircraft}`:""}</Text>{i<flight.segments!.length-1&&<Text style={s.muted}>Connection at {segment.to} · next departure {flight.segments![i+1].departure}</Text>}</View>)}
    <Text style={[s.muted,{fontSize:12}]}>{flight.provider==="serpapi"?"Google Flights via SerpApi":"Previously saved flight"} · {new Date(flight.retrievedAt).toLocaleString()}. Schedules and prices can change; this is not a booking.</Text>
    <Text style={[s.muted,{fontSize:12}]}>{flight.waypoints?.length?"Map shows airport connections, including layovers, as geographic arcs—not a flown track.":"Map is a geographic preview; complete airport routing may be unavailable."}</Text>
  </View>;
}
export default function FlightLookup({airline,date,from,to,disabled,onUse}:{airline:string;date:string;from:string;to:string;disabled:boolean;onUse:(flight:FlightRecord)=>void}) {
  const {s}=useTheme();
  const [busy,setBusy]=useState(false),[error,setError]=useState("");const [results,setResults]=useState<FlightRecord[]|null>(null);
  const abort=useRef<AbortController|null>(null);useEffect(()=>()=>abort.current?.abort(),[]);
  const invalidate=()=>{abort.current?.abort();abort.current=null;setBusy(false);setResults(null);setError("");};
  async function lookup(){
    invalidate();const controller=new AbortController();abort.current=controller;setBusy(true);
    try {
      const carrier=resolveAirline(airline);
      if(!carrier)throw new Error("Enter an airline name or its two-character code, such as American Airlines or AA.");
      const query=searchQuery(from,to,date,'',undefined,carrier);
      const local=Platform.OS==="web"&&typeof location!=="undefined"&&["127.0.0.1","127.0.0.2","localhost"].includes(location.hostname);
      const base=process.env.EXPO_PUBLIC_FLIGHT_LOOKUP_URL||(local?"http://127.0.0.1:8082":"");
      if(!base)throw new Error("Flight search is available in the local website. You can save details manually here.");
      const response=await fetch(`${base}/flight`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(query),signal:controller.signal});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Flight search failed.");
      if(!Array.isArray(payload.flights)||!payload.flights.every(isFlightRecord))throw new Error("The flight-data service returned incomplete information.");
      if(!controller.signal.aborted)setResults(payload.flights);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof TypeError?"Flight search is unavailable. Restart the local host or enter details manually.":e instanceof Error?e.message:"Flight search failed.");}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <View style={{gap:12}}>
    <Button disabled={disabled||busy} onPress={lookup}>{busy?"Searching flights…":"Search flights"}</Button>
    <Text style={[s.muted,{fontSize:12}]}>Searches the entered airline, route and departure date. One-way fares for one adult in economy, USD. Search runs only when clicked; no booking is made.</Text>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {results?.length===0&&<Text accessibilityRole="alert" style={s.muted}>No matching itineraries returned. Try another airport or date, check the airline, or enter details manually. Results are not exhaustive.</Text>}
    {results&&results.length>0&&<Text style={s.body}>{results.length} itineraries · choose one to fill the flight number and departure time</Text>}
    {!!results?.length&&<ScrollView nestedScrollEnabled style={{maxHeight:640}} contentContainerStyle={{gap:12}}>{results.map((flight,i)=><View key={i} style={[s.card,{gap:12}]}><FlightSummary flight={flight}/><Button disabled={disabled} onPress={()=>{onUse(flight);setResults(null);}}>Use itinerary {i+1}</Button></View>)}</ScrollView>}
  </View>;
}

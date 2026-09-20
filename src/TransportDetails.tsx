import React from "react";
import { View, Text } from "react-native";
import { Field, useTheme } from "./ui";
import DateField from "./DateField";
import FlightLookup, { FlightSummary } from "./FlightLookup";
import { type TravelLeg, type TransportDetails as Details, transports } from "./plannerModel";
import type { Place } from "./model";

export default function TransportDetails({leg,onChange,disabled,fromPlace,toPlace}:{leg:TravelLeg;onChange:(leg:TravelLeg)=>void;disabled:boolean;fromPlace:Place;toPlace:Place}) {
  const {s}=useTheme();const mode=leg.mode;const details=leg.details?.[mode]??{};
  const service=["flight","train","bus","ferry"].includes(mode);
  const update=(patch:Partial<Details>)=>onChange({...leg,flight:mode==="flight"&&["serviceNumber","departureDate","fromStation","toStation"].some(key=>key in patch)?undefined:leg.flight,details:{...leg.details,[mode]:{...details,...patch}}});
  const operator=mode==="flight"?"Airline (optional)":mode==="car"?"Rental company / driver":"Operator";
  const number=mode==="flight"?"Flight number (airline code + number)":mode==="train"?"Train number":mode==="bus"?"Bus route / service number":"Ferry / sailing number";
  const station=mode==="flight"?"airport":mode==="train"?"station":mode==="bus"?"bus stop":mode==="ferry"?"port":"place";
  return <View style={{gap:12}}>
    <Text style={s.eyebrow}>{transports[mode].label.toUpperCase()} DETAILS</Text>
    {mode==="flight"&&<Text style={s.muted}>Choose a departure date to search future flights, or enter flight details manually. Times are local to each airport.</Text>}
    {(service||mode==="car")&&<Field label={operator} value={details.operator??""} editable={!disabled} maxLength={120} onChangeText={operator=>update({operator})}/>}
    {service&&<Field label={number} placeholder={mode==="flight"?"e.g. AI 101":undefined} value={details.serviceNumber??""} editable={!disabled} maxLength={80} onChangeText={serviceNumber=>update({serviceNumber})}/>}
    <DateField label="Departure date" value={details.departureDate??""} disabled={disabled} onChange={departureDate=>update({departureDate})}/>
    {mode==="flight"&&<FlightLookup key={`${leg.fromId}:${leg.toId}:${details.serviceNumber}:${details.departureDate}`} fromPlace={fromPlace} toPlace={toPlace} number={details.serviceNumber??""} date={details.departureDate??""} disabled={disabled} onUse={flight=>onChange({...leg,flight,details:{...leg.details,flight:{...details,operator:flight.airline,serviceNumber:flight.number,departureDate:flight.departureDate,departureTime:flight.departureTime,fromStation:flight.departureAirport,toStation:flight.arrivalAirport}}})}/>}
    {mode==="flight"&&leg.flight&&<FlightSummary flight={leg.flight}/>}
    <Field label="Departure time (local, optional)" placeholder="HH:MM" value={details.departureTime??""} editable={!disabled} maxLength={5} onChangeText={departureTime=>update({departureTime})}/>
    <Field label={`Departure ${station} (optional)`} value={details.fromStation??""} editable={!disabled} maxLength={180} onChangeText={fromStation=>update({fromStation})}/>
    <Field label={`Arrival ${station} (optional)`} value={details.toStation??""} editable={!disabled} maxLength={180} onChangeText={toStation=>update({toStation})}/>
    <Field label="Transport notes (optional)" multiline value={details.notes??""} editable={!disabled} maxLength={2000} onChangeText={notes=>update({notes})}/>
    <Text style={[s.muted,{fontSize:12}]}>Saved with this connection when you save the plan. Train, bus and other transport details are entered manually.</Text>
  </View>;
}

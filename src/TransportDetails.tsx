import React from "react";
import { View, Text } from "react-native";
import { Field, useTheme } from "./ui";
import DateField from "./DateField";
import FlightLookup from "./FlightLookup";
import { type TravelLeg, type TransportDetails as Details, transports } from "./plannerModel";
import type { Place } from "./model";
import { normalizeFlightNumber } from "./flightModel";

export default function TransportDetails({leg,onChange,disabled,fromPlace,toPlace}:{leg:TravelLeg;onChange:(leg:TravelLeg)=>void;disabled:boolean;fromPlace:Place;toPlace:Place}) {
  const {s}=useTheme();const mode=leg.mode;const details=leg.details?.[mode]??{};
  const service=["flight","train","bus","ferry"].includes(mode);
  const update=(patch:Partial<Details>)=>onChange({...leg,flight:mode==="flight"&&["operator","serviceNumber","departureDate","fromStation","toStation"].some(key=>key in patch)?undefined:leg.flight,details:{...leg.details,[mode]:{...details,...patch}}});
  const operator=mode==="flight"?"Airline":mode==="car"?"Rental company / driver":"Operator";
  const number=mode==="flight"?"Flight number (optional)":mode==="train"?"Train number":mode==="bus"?"Bus route / service number":"Ferry / sailing number";
  const station=mode==="flight"?"airport":mode==="train"?"station":mode==="bus"?"bus stop":mode==="ferry"?"port":"place";
  return <View style={{gap:12}}>
    <Text style={s.eyebrow}>{transports[mode].label.toUpperCase()} DETAILS</Text>
    {mode==="flight"&&<Text style={s.muted}>Choose a departure date to search future flights, or enter flight details manually. Times are local to each airport.</Text>}
    {(service||mode==="car")&&<Field label={operator} value={details.operator??""} editable={!disabled} placeholder={mode==="flight"?"e.g. American Airlines or AA":undefined} maxLength={120} onChangeText={operator=>update({operator})}/>}
    {service&&<Field label={number} placeholder={mode==="flight"?"e.g. AA292":undefined} value={details.serviceNumber??""} editable={!disabled} maxLength={80} onChangeText={serviceNumber=>update({serviceNumber:mode==="flight"?normalizeFlightNumber(serviceNumber):serviceNumber})}/>}
    <DateField label="Departure date" value={details.departureDate??""} disabled={disabled} onChange={departureDate=>update({departureDate})}/>
    <Field label={mode==="flight"?"Departure airport code":`Departure ${station}`} value={mode==="flight"?(details.fromStation??"").split(" · ")[0]:details.fromStation??""} placeholder={mode==="flight"?"e.g. JFK":undefined} editable={!disabled} maxLength={mode==="flight"?3:180} onChangeText={fromStation=>update({fromStation:mode==="flight"?fromStation.replace(/\s/g,"").toUpperCase():fromStation})}/>
    <Field label={mode==="flight"?"Arrival airport code":`Arrival ${station}`} value={mode==="flight"?(details.toStation??"").split(" · ")[0]:details.toStation??""} placeholder={mode==="flight"?"e.g. LHR":undefined} editable={!disabled} maxLength={mode==="flight"?3:180} onChangeText={toStation=>update({toStation:mode==="flight"?toStation.replace(/\s/g,"").toUpperCase():toStation})}/>
    {mode==="flight"&&<><Text style={s.muted}>Search flights for this airline, route and date. Google Flights requires both airports and may not return every scheduled flight.</Text><FlightLookup key={JSON.stringify([leg.fromId,leg.toId,details.operator,details.departureDate,details.fromStation,details.toStation])} airline={details.operator??""} from={(details.fromStation??"").split(" · ")[0]} to={(details.toStation??"").split(" · ")[0]} date={details.departureDate??""} disabled={disabled} onUse={flight=>onChange({...leg,flight,details:{...leg.details,flight:{...details,serviceNumber:flight.number,departureTime:flight.departureTime}}})}/></>}
    <Field label="Departure time (local)" placeholder="HH:MM" value={details.departureTime??""} editable={!disabled} maxLength={5} onChangeText={departureTime=>update({departureTime})}/>
    <Field label="Transport notes" multiline value={details.notes??""} editable={!disabled} maxLength={2000} onChangeText={notes=>update({notes})}/>
    <Text style={[s.muted,{fontSize:12}]}>Saved with this connection when you save the plan. Train, bus and other transport details are entered manually.</Text>
  </View>;
}

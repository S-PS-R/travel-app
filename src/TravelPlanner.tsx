import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { places, uid, placeKey, type Place } from "./model";
import { transports, emptyPlan, parsePlan, moveStop, distanceKm, type TravelPlan, type Transport } from "./plannerModel";
import { Button, Field, useTheme } from "./ui";
import WorldMap from "./WorldMap";

const KEY = "veyfar.planner.v1";
export default function TravelPlanner() {
  const { s, colors } = useTheme();
  const compact = useWindowDimensions().width < 1050;
  const [plan, setPlan] = useState<TravelPlan>(emptyPlan);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY).then(raw => { if (alive && raw) setPlan(parsePlan(raw)); })
      .catch(() => { if (alive) { setFailed(true);setMessage("Your saved plan could not be loaded. Reopen the app to retry; the saved copy has not been changed."); } })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  function change(next: TravelPlan) { setPlan(next); setDirty(true); setMessage(""); }
  function add(place: Place) {
    if (!ready || failed || busy || plan.stops.length >= 50) return;
    change({ ...plan, stops: [...plan.stops, {id:uid(),place,mode:"flight"}] });
    setSelected(placeKey(place)); setQuery("");
  }
  async function save() {
    setBusy(true); setMessage("");
    try { await AsyncStorage.setItem(KEY, JSON.stringify(plan)); setDirty(false); setMessage("Plan saved on this device."); }
    catch { setMessage("Could not save the plan. Your changes are still here; please try again."); }
    finally { setBusy(false); }
  }
  const results = places.filter(p => `${p.city} ${p.country}`.toLowerCase().includes(query.toLowerCase())).slice(0,6);
  const total = plan.stops.reduce((sum, st, i, all) => sum+(i ? distanceKm(all[i-1].place,st.place) : 0),0);
  const editable = ready && !failed && !busy;
  return <ScrollView contentContainerStyle={{padding:compact?20:36,gap:24,maxWidth:1600,width:"100%",alignSelf:"center",paddingBottom:60}} keyboardShouldPersistTaps="handled">
    <View style={[s.spread,{flexWrap:"wrap"}]}>
      <View style={{gap:8}}><Text style={s.eyebrow}>GO WHERE CURIOSITY TAKES YOU</Text><Text accessibilityRole="header" style={s.title}>A journey taking shape.</Text><Text style={s.muted}>Connect the places. Choose how you get there.</Text></View>
      <View style={s.row}><Text style={s.muted}>{!ready?"Opening plan…":dirty?"Unsaved changes":"Saved on this device"}</Text><Button disabled={!editable||!dirty} onPress={save}>{busy?"Saving…":"Save plan"}</Button></View>
    </View>
    {!!message&&<Text accessibilityRole="alert" style={failed?s.error:s.muted}>{message}</Text>}
    <View style={{flexDirection:compact?"column":"row",gap:24,alignItems:"stretch"}}>
      <View style={{flex:1,minWidth:0}}><WorldMap trips={[]} planner route={plan.stops} selected={selected} onSelect={p=>setSelected(placeKey(p))} onAddPlace={editable?add:undefined}/></View>
      <View style={[s.card,{width:compact?"100%":350,gap:18}]}>
        <Text style={s.eyebrow}>YOUR ITINERARY</Text>
        <Field label="Journey name" maxLength={120} editable={editable} value={plan.title} onChangeText={title=>change({...plan,title})}/>
        <View style={[s.row,{gap:24}]}><View><Text style={s.subtitle}>{plan.stops.length}</Text><Text style={s.muted}>stops</Text></View><View><Text style={s.subtitle}>{Math.round(total).toLocaleString()} km</Text><Text style={s.muted}>direct distance</Text></View></View>
        <Field label="Find a destination" placeholder="City or country" editable={editable&&plan.stops.length<50} value={query} onChangeText={setQuery}/>
        {(query||!plan.stops.length)&&<View style={{gap:3}}>{results.map(p=><Pressable key={placeKey(p)} accessibilityRole="button" accessibilityLabel={`Add ${p.city} to plan`} disabled={!editable} onPress={()=>add(p)} style={[s.spread,{paddingVertical:10,borderBottomWidth:1,borderBottomColor:colors.line}]}><View><Text style={s.body}>{p.city}</Text><Text style={s.muted}>{p.country}</Text></View><Text style={{color:colors.teal,fontSize:22}}>＋</Text></Pressable>)}{!results.length&&<Text style={s.muted}>Not in the quick list? Click its location on the map, add a stop, and rename it below.</Text>}</View>}
        {!plan.stops.length&&<View style={{gap:12}}><Text style={s.muted}>Start with a city above, or click anywhere on land. Each new stop gets its own transport choice.</Text><Button quiet disabled={!editable} onPress={()=>{change({title:"Across the Atlantic",stops:["New York","London","Paris","Rome"].map((city,i)=>({id:uid(),place:places.find(p=>p.city===city)!,mode:i===2?"train":"flight"}))});}}>Try a sample route</Button></View>}
        {!!plan.stops.length&&<Text style={s.muted}>Choose transport on each arrival leg. Drag the globe to explore, or use Fit route to see your journey.</Text>}
        {plan.stops.length>=50&&<Text style={s.muted}>This plan has reached its 50-stop limit.</Text>}
        <Text style={[s.muted,{fontSize:12}]}>Route lines and distances are geographic previews. They do not check roads, service availability, fares, or travel times.</Text>
      </View>
    </View>
    {!!plan.stops.length&&<>
      <View style={s.spread}><Text style={s.subtitle}>One stop leads to another.</Text><Button quiet disabled={!editable} onPress={()=>setConfirmClear(!confirmClear)}>Clear plan</Button></View>
      {confirmClear&&<View style={[s.card,s.spread,{flexWrap:"wrap"}]}><Text style={s.body}>Clear all stops from this draft?</Text><Button danger disabled={!editable} onPress={()=>{change(emptyPlan());setSelected(null);setConfirmClear(false);}}>Clear draft</Button><Button quiet onPress={()=>setConfirmClear(false)}>Keep plan</Button></View>}
      <View style={{flexDirection:"row",flexWrap:"wrap",gap:16}}>{plan.stops.map((stop,i)=><View key={stop.id} style={[s.card,{width:compact?"100%":"31.9%",minWidth:compact?0:280,borderColor:selected===placeKey(stop.place)?colors.teal:colors.line}]}>
        <View style={s.spread}><Text style={s.eyebrow}>{i===0?"START HERE":`STOP ${String(i+1).padStart(2,"0")}`}</Text><View style={{flexDirection:"row",gap:6}}><Button quiet disabled={!editable||i===0} onPress={()=>change({...plan,stops:moveStop(plan.stops,i,-1)})}>←</Button><Button quiet disabled={!editable||i===plan.stops.length-1} onPress={()=>change({...plan,stops:moveStop(plan.stops,i,1)})}>→</Button></View></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${stop.place.city}`} onPress={()=>setSelected(placeKey(stop.place))}><Text style={s.subtitle}>{stop.place.city}</Text><Text style={s.muted}>{stop.place.country}</Text></Pressable>
        <Field label="Stop name" value={stop.place.city} maxLength={100} editable={editable} onChangeText={city=>change({...plan,stops:plan.stops.map(st=>st.id===stop.id?{...st,place:{...st.place,city}}:st)})}/>
        {i>0&&<><Text style={s.muted}>From {plan.stops[i-1].place.city} · {Math.round(distanceKm(plan.stops[i-1].place,stop.place)).toLocaleString()} km direct</Text><View style={{flexDirection:"row",gap:6,flexWrap:"wrap"}}>{(Object.keys(transports) as Transport[]).map(mode=><Pressable key={mode} accessibilityRole="radio" accessibilityState={{checked:stop.mode===mode}} accessibilityLabel={`${transports[mode].label} to ${stop.place.city}`} disabled={!editable} onPress={()=>change({...plan,stops:plan.stops.map(st=>st.id===stop.id?{...st,mode}:st)})} style={{padding:10,borderRadius:10,borderWidth:1,borderColor:stop.mode===mode?colors.teal:colors.line,backgroundColor:stop.mode===mode?colors.pale:colors.surface}}><Text style={{color:colors.ink,fontSize:12}}>{transports[mode].icon} {transports[mode].label}</Text></Pressable>)}</View></>}
        <Button quiet disabled={!editable} onPress={()=>change({...plan,stops:plan.stops.filter(st=>st.id!==stop.id)})}>Remove stop</Button>
      </View>)}</View>
    </>}
  </ScrollView>;
}

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { places, uid, placeKey, type Place } from "./model";
import { transports, emptyPlan, moveStop, distanceKm, type TravelPlan, type Transport } from "./plannerModel";
import { PLAN_LIBRARY_KEY, LEGACY_PLAN_KEY, loadPlanLibrary, saveToLibrary, type PlanLibrary, type SavedPlan } from "./planLibrary";
import DestinationInput from "./DestinationInput";
import DateField from "./DateField";
import { Button, Field, useTheme } from "./ui";
import WorldMap from "./WorldMap";

export default function TravelPlanner({view,onNavigate}:{view:"plan"|"upcoming";onNavigate:(view:"plan"|"upcoming")=>void}) {
  const { s, colors } = useTheme();
  const compact = useWindowDimensions().width < 1050;
  const [plan, setPlan] = useState<TravelPlan>(emptyPlan);
  const [library,setLibrary] = useState<PlanLibrary>({version:2,plans:[]});
  const [editingId,setEditingId] = useState<string|null>(null);
  const [pending,setPending] = useState<SavedPlan|"new"|null>(null);
  const [deleteId,setDeleteId] = useState<string|null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(PLAN_LIBRARY_KEY).then(async raw => {
      const data=loadPlanLibrary(raw,raw===null?await AsyncStorage.getItem(LEGACY_PLAN_KEY):null);
      if(alive) {setLibrary(data);if(data.plans[0]){setPlan(data.plans[0]);setEditingId(data.plans[0].id);}}
    })
      .catch(() => { if (alive) { setFailed(true);setMessage("Your saved plan could not be loaded. Reopen the app to retry; the saved copy has not been changed."); } })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  function change(next: TravelPlan) { setPlan(next); setDirty(true); setMessage(""); }
  function add(place: Place) {
    if (!ready || failed || busy || plan.stops.length >= 50) return;
    change({ ...plan, stops: [...plan.stops, {id:uid(),place,mode:"flight"}] });
    setSelected(placeKey(place));
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const id=editingId??uid();const next=saveToLibrary(library,plan,id);
      await AsyncStorage.setItem(PLAN_LIBRARY_KEY, JSON.stringify(next));
      setLibrary(next);setEditingId(id);setDirty(false);setMessage("Saved to Upcoming trips on this device.");
    }
    catch (error) { setMessage(error instanceof Error?error.message:"Could not save the plan. Your changes are still here; please try again."); }
    finally { setBusy(false); }
  }
  function openPlan(next:SavedPlan|"new") {
    setPlan(next==="new"?emptyPlan():next);setEditingId(next==="new"?null:next.id);
    setSelected(null);setDirty(false);setPending(null);setMessage("");setConfirmClear(false);onNavigate("plan");
  }
  function requestOpen(next:SavedPlan|"new") {
    if(next!=="new"&&next.id===editingId){onNavigate("plan");return;}
    if(dirty)setPending(next);else openPlan(next);
  }
  async function removePlan(id:string) {
    setBusy(true);setMessage("");
    try {
      const next:PlanLibrary={version:2,plans:library.plans.filter(p=>p.id!==id)};
      await AsyncStorage.setItem(PLAN_LIBRARY_KEY,JSON.stringify(next));setLibrary(next);setDeleteId(null);
      if(id===editingId){setEditingId(null);setPlan(emptyPlan());setDirty(false);setSelected(null);}
    }catch{setMessage("Could not remove this plan. Please try again.");}finally{setBusy(false);}
  }
  const total = plan.stops.reduce((sum, st, i, all) => sum+(i ? distanceKm(all[i-1].place,st.place) : 0),0);
  const editable = ready && !failed && !busy;
  const discardPrompt = pending&&<View style={[s.card,{gap:12}]}><Text style={s.body}>Your current plan has unsaved changes. Discard them to open {pending==="new"?"a new journey":pending.title}?</Text><Button danger disabled={busy} onPress={()=>openPlan(pending)}>Discard changes and continue</Button><Button quiet onPress={()=>setPending(null)}>Keep editing</Button></View>;
  if(view==="upcoming")return <ScrollView contentContainerStyle={{padding:compact?20:36,gap:24,maxWidth:1300,width:"100%",alignSelf:"center",paddingBottom:60}}>
    <View style={[s.spread,{flexWrap:"wrap"}]}><View style={{gap:8}}><Text style={s.eyebrow}>SOMETHING TO LOOK FORWARD TO</Text><Text accessibilityRole="header" style={s.title}>Upcoming trips</Text><Text style={s.muted}>Your saved plans, ready to revisit. Dates can stay undecided. Stored on this device.</Text></View><Button disabled={!editable} onPress={()=>requestOpen("new")}>＋ Plan a new trip</Button></View>
    {!!message&&<Text accessibilityRole="alert" style={failed?s.error:s.muted}>{message}</Text>}
    {!ready&&<Text style={s.muted}>Opening your plans…</Text>}
    {dirty&&<Button quiet onPress={()=>onNavigate("plan")}>Continue editing unsaved changes</Button>}
    {discardPrompt}
    {ready&&!failed&&!library.plans.length&&<View style={s.card}><Text style={s.subtitle}>Where will you go next?</Text><Text style={s.muted}>Add destinations in Plan a trip and choose Save plan. Your journeys will appear here.</Text></View>}
    {library.plans.map(saved=><View key={saved.id} style={[s.card,{gap:14}]}>
      <Text style={s.subtitle}>{saved.title}</Text><Text style={s.muted}>{saved.startDate||"Start date undecided"} → {saved.endDate||"End date undecided"}</Text>
      <Text style={s.body}>{saved.stops.map(st=>st.place.city).join(" → ")}</Text><Text style={s.muted}>{saved.stops.length} stops · {Math.round(saved.stops.reduce((sum,st,i,all)=>sum+(i?distanceKm(all[i-1].place,st.place):0),0)).toLocaleString()} km direct</Text>
      <View style={[s.row,{flexWrap:"wrap"}]}><Button disabled={!editable} onPress={()=>requestOpen(saved)}>Edit {saved.title}</Button><Button quiet disabled={!editable} onPress={()=>setDeleteId(saved.id)}>Remove plan</Button></View>
      {deleteId===saved.id&&<><Text style={s.error}>Remove this saved plan{saved.id===editingId&&dirty?" and its unsaved changes":""}? This cannot be undone.</Text><Button danger disabled={!editable} onPress={()=>removePlan(saved.id)}>Remove permanently</Button><Button quiet onPress={()=>setDeleteId(null)}>Keep plan</Button></>}
    </View>)}
  </ScrollView>;
  return <ScrollView contentContainerStyle={{padding:compact?20:36,gap:24,maxWidth:1600,width:"100%",alignSelf:"center",paddingBottom:60}} keyboardShouldPersistTaps="handled">
    <View style={[s.spread,{flexWrap:"wrap"}]}>
      <View style={{gap:8}}><Text style={s.eyebrow}>GO WHERE CURIOSITY TAKES YOU</Text><Text accessibilityRole="header" style={s.title}>A journey taking shape.</Text><Text style={s.muted}>Connect the places. Choose how you get there.</Text></View>
      <View style={[s.row,{flexWrap:"wrap"}]}><Text style={s.muted}>{!ready?"Opening plan…":dirty?"Unsaved changes":editingId?"Saved on this device":"New plan"}</Text><Button disabled={!editable||!dirty} onPress={save}>{busy?"Saving…":"Save plan"}</Button><Button quiet disabled={!editable} onPress={()=>requestOpen("new")}>New plan</Button><Button quiet onPress={()=>onNavigate("upcoming")}>View upcoming trips</Button></View>
    </View>
    {!!message&&<Text accessibilityRole="alert" style={failed?s.error:s.muted}>{message}</Text>}
    {discardPrompt}
    <View style={{flexDirection:compact?"column":"row",gap:24,alignItems:"stretch"}}>
      <View style={{flex:1,minWidth:0}}><WorldMap trips={[]} planner route={plan.stops} selected={selected} onSelect={p=>setSelected(placeKey(p))} onAddPlace={editable?add:undefined}/></View>
      <View style={[s.card,{width:compact?"100%":350,gap:18}]}>
        <Text style={s.eyebrow}>YOUR ITINERARY</Text>
        <Field label="Journey name" maxLength={120} editable={editable} value={plan.title} onChangeText={title=>change({...plan,title})}/>
        <DateField label="Journey start" value={plan.startDate??""} disabled={!editable} onChange={startDate=>change({...plan,startDate})}/>
        <DateField label="Journey end" value={plan.endDate??""} min={plan.startDate} disabled={!editable} onChange={endDate=>change({...plan,endDate})}/>
        <View style={[s.row,{gap:24}]}><View><Text style={s.subtitle}>{plan.stops.length}</Text><Text style={s.muted}>stops</Text></View><View><Text style={s.subtitle}>{Math.round(total).toLocaleString()} km</Text><Text style={s.muted}>direct distance</Text></View></View>
        <DestinationInput label="Find a destination" disabled={!editable||plan.stops.length>=50} onSelect={add}/>
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

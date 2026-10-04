import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Platform,Pressable} from 'react-native';
import {Button,Field,useTheme} from './ui';
import {planningCountries,validateBrief,isAutoDraft,type AutoDraft,type PlanningBlock,type PlanningBrief} from './autoPlan';
import {uid} from './model';
import type {TravelPlan} from './plannerModel';

export default function AutoPlanner({plan,disabled,onApply}:{plan:TravelPlan;disabled:boolean;onApply:(p:TravelPlan)=>void}){
  const {s,colors}=useTheme();
  const [open,setOpen]=useState(false),[country,setCountry]=useState(''),[days,setDays]=useState('3');
  const [blocks,setBlocks]=useState<PlanningBlock[]>([]);
  const [interests,setInterests]=useState(''),[budget,setBudget]=useState(''),[travelers,setTravelers]=useState('2');
  const [pace,setPace]=useState<PlanningBrief['pace']>('balanced');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState<AutoDraft|null>(null);
  const abort=useRef<AbortController|null>(null);
  const cityMode=plan.stops.length>0;
  const routeKey=JSON.stringify(plan.stops.map(st=>({id:st.id,place:st.place})));
  useEffect(()=>{invalidate();setBlocks(plan.stops.map(st=>({country:st.place.country,city:st.place.city,days:2})));},[routeKey]);
  useEffect(()=>{invalidate();},[plan.startDate,plan.endDate]);
  useEffect(()=>()=>abort.current?.abort(),[]);
  function invalidate(){abort.current?.abort();abort.current=null;setBusy(false);setDraft(null);setError('');}
  const local=Platform.OS==='web'&&typeof location!=='undefined'&&['localhost','127.0.0.1','127.0.0.2'].includes(location.hostname);
  async function generate(){
    invalidate();
    if(!local){setError('AI generation is currently available on the local website. Public hosting is not configured yet.');return;}
    const controller=new AbortController();abort.current=controller;
    setBusy(true);
    const timeout=setTimeout(()=>controller.abort(),70000);
    try{
      const brief=validateBrief({blocks,interests,budget,travelers:Number(travelers),pace,startDate:plan.startDate,endDate:plan.endDate});
      const response=await fetch('http://127.0.0.1:8083/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(brief),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not generate a draft.');
      if(!isAutoDraft(data.draft))throw new Error('The planner returned an invalid draft. Your plan has not changed.');
      if(!controller.signal.aborted)setDraft(data.draft);
    }catch(e){if(abort.current===controller)setError(controller.signal.aborted?'Generation stopped. Your trip has not changed.':e instanceof TypeError?'Planner unavailable. Restart the local host with run.ps1.':e instanceof Error?e.message:'Could not generate a draft.');}
    finally{clearTimeout(timeout);if(abort.current===controller)setBusy(false);}
  }
  function apply(){
    if(!draft||disabled)return;
    // For an existing route only add the itinerary; preserve all stop IDs and bookings.
    onApply(cityMode?{...plan,autoDraft:draft}:{...plan,autoDraft:draft,stops:draft.stops.map(st=>({id:uid(),place:st.place,mode:'flight' as const}))});
    setDraft(null);setOpen(false);
  }
  const suggestions=country.trim()?planningCountries.filter(c=>c.toLowerCase().includes(country.toLowerCase())).slice(0,6):[];
  return <View style={[s.card,{gap:14}]}>
    <View style={[s.spread,{flexWrap:'wrap'}]}><View><Text style={s.eyebrow}>A LITTLE HELP GETTING STARTED</Text><Text style={s.subtitle}>Plan with Gemini</Text></View><Button quiet disabled={disabled} onPress={()=>setOpen(!open)}>{open?'Close auto-planner':'Auto-plan a trip'}</Button></View>
    {open&&<>
      <Text style={s.body}>{cityMode?'Build a daily itinerary for your selected cities. Existing transport details stay in place.':'Choose countries and days. Gemini will suggest city bases and a daily itinerary.'}</Text>
      {blocks.map((b,i)=><View key={i} style={[s.row,{flexWrap:'wrap'}]}><Text style={s.body}>{i+1}. {b.city?`${b.city}, `:''}{b.country}</Text><Field label={`Days in ${b.city||b.country} (stay ${i+1})`} keyboardType="number-pad" value={String(b.days||'')} editable={!busy&&!disabled} maxLength={2} onChangeText={v=>{invalidate();setBlocks(blocks.map((x,j)=>i===j?{...x,days:Number(v)}:x));}}/>{!cityMode&&<Button quiet disabled={busy||disabled} onPress={()=>{invalidate();setBlocks(blocks.filter((_,j)=>j!==i));}}>Remove stay {i+1}</Button>}</View>)}
      {!cityMode&&<View style={{gap:8}}><Field label="Country" value={country} editable={!busy&&!disabled} onChangeText={v=>{invalidate();setCountry(v);}} placeholder="Type a country, then choose a suggestion"/>
        {suggestions.map(c=><Pressable key={c} accessibilityRole="button" onPress={()=>setCountry(c)} style={{padding:10,backgroundColor:colors.pale,borderRadius:8}}><Text style={s.body}>{c}</Text></Pressable>)}
        <Field label="Days in this country" value={days} editable={!busy&&!disabled} keyboardType="number-pad" maxLength={2} onChangeText={setDays}/>
        <Button quiet disabled={busy||disabled||!planningCountries.includes(country)||blocks.length>=8||!Number.isInteger(Number(days))||Number(days)<1||Number(days)>14} onPress={()=>{invalidate();setBlocks([...blocks,{country,days:Number(days)}]);setCountry('');}}>Add country</Button>
      </View>}
      <Field label="What would you like to do, see or avoid?" multiline maxLength={1500} value={interests} editable={!busy&&!disabled} placeholder="Food, history, scenic walks; avoid rushed mornings…" onChangeText={v=>{invalidate();setInterests(v);}}/>
      <View style={[s.row,{flexWrap:'wrap'}]}><Field label="Travelers" value={travelers} maxLength={2} keyboardType="number-pad" editable={!busy&&!disabled} onChangeText={v=>{invalidate();setTravelers(v);}}/><Field label="Budget and currency" value={budget} maxLength={200} editable={!busy&&!disabled} placeholder="USD 1,500 total, excluding flights" onChangeText={v=>{invalidate();setBudget(v);}}/></View>
      <Text style={s.label}>Pace</Text><View style={[s.row,{flexWrap:'wrap'}]}>{(['relaxed','balanced','busy'] as const).map(p=><Pressable key={p} accessibilityRole="radio" accessibilityState={{checked:pace===p}} disabled={busy||disabled} onPress={()=>{invalidate();setPace(p);}} style={[s.button,{borderColor:colors.line,backgroundColor:pace===p?colors.pale:colors.surface}]}><Text style={s.body}>{p}</Text></Pressable>)}</View>
      <Text style={s.muted}>Your trip preferences are sent to Google when you generate. Gemini free-tier inputs may be used to improve Google’s products. Don’t include private account or payment information. Up to 30 days per draft.</Text>
      <Button disabled={disabled||busy||!blocks.length} onPress={generate}>{busy?'Building your draft…':'Generate itinerary preview'}</Button>
      {busy&&<Button quiet onPress={()=>{abort.current?.abort();}}>Cancel generation</Button>}
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {draft&&<><DraftView draft={draft}/><Button disabled={disabled||busy} onPress={apply}>{cityMode?'Apply daily itinerary':'Use these cities and itinerary'}</Button><Text style={s.muted}>Applying updates your draft. Choose Save plan to keep it.</Text></>}
    </>}
    {plan.autoDraft&&<><Text style={s.eyebrow}>YOUR AI ITINERARY DRAFT</Text><DraftView draft={plan.autoDraft}/><Button quiet disabled={disabled} onPress={()=>onApply({...plan,autoDraft:undefined})}>Remove AI itinerary</Button></>}
  </View>;
}
function DraftView({draft}:{draft:AutoDraft}){
  const {s}=useTheme();let day=0;
  return <View style={{gap:12}}><Text style={s.muted}>AI suggestions · places, opening hours, fares and travel feasibility are not verified. Budget is a preference, not a price quote. Transport choices on the map still need review.</Text>
    {draft.stops.map((stop,i)=><View key={i} style={{gap:6}}><Text style={s.subtitle}>{stop.place.city} · {stop.days.length} days</Text><Text style={s.body}>{stop.reason}</Text><Text style={s.muted}>{stop.transferNote}</Text>{stop.days.map((activities,j)=><View key={j}><Text style={s.label}>Day {++day}</Text>{activities.map((a,k)=><Text key={k} style={s.body}>• {a}</Text>)}</View>)}</View>)}
    {draft.warnings.map((w,i)=><Text key={i} style={s.muted}>{w}</Text>)}
  </View>;
}

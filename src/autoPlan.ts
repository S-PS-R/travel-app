import { places, validDate, type Place } from './model.ts';
import { cityCatalog, travelDestinations } from './cityCatalog.ts';

export const cleanName = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const seen = new Set<string>();
export const planningCities: Place[] = [...places,...travelDestinations,...cityCatalog].filter(p=>{
  const key=cleanName(p.countryId || p.country)+'|'+cleanName(p.city);
  if(seen.has(key))return false;seen.add(key);return true;
});
export const planningCountries = [...new Set(planningCities.map(p=>p.country))].sort();
export type PlanningBlock = {country:string; days:number; city?:string};
export type PlanningBrief = {blocks:PlanningBlock[]; interests:string; budget:string; travelers:number; pace:'relaxed'|'balanced'|'busy';startDate?:string;endDate?:string};
export type SuggestedStop = {place:Place; days:string[][]; reason:string; transferNote:string};
export type AutoDraft = {stops:SuggestedStop[]; warnings:string[]};

export function validateBrief(value:unknown):PlanningBrief {
  const b=value as PlanningBrief;
  if(!b||!Array.isArray(b.blocks)||b.blocks.length<1||b.blocks.length>8)throw new Error('Choose between one and eight country or city stays.');
  if(typeof b.interests!=='string'||b.interests.length>1500||typeof b.budget!=='string'||b.budget.length>200||!Number.isInteger(b.travelers)||b.travelers<1||b.travelers>20||!['relaxed','balanced','busy'].includes(b.pace))throw new Error('Check your trip preferences (1–20 travelers).');
  let days=0;
  const blocks=b.blocks.map(block=>{
    if(!block||typeof block.country!=='string'||!planningCountries.includes(block.country)||!Number.isInteger(block.days)||block.days<1||block.days>14)throw new Error('Select a suggested country and enter 1–14 days per stay.');
    if(block.city!==undefined&&(typeof block.city!=='string'||!planningCities.some(p=>p.country===block.country&&p.city===block.city)))throw new Error('This city is not in the planning catalog. Choose a city from destination search.');
    days+=block.days;
    return {country:block.country,days:block.days,...(block.city?{city:block.city}:{})};
  });
  if(days>30)throw new Error('Plan up to 30 days at a time.');
  if((b.startDate&& !validDate(b.startDate))||(b.endDate&&!validDate(b.endDate)))throw new Error('Check the journey dates.');
  if(b.startDate&&b.endDate&&(b.endDate<b.startDate||days>(Date.parse(b.endDate)-Date.parse(b.startDate))/86400000+1))throw new Error('The selected stays do not fit within your journey dates.');
  return {blocks,interests:b.interests.trim(),budget:b.budget.trim(),travelers:b.travelers,pace:b.pace,...(b.startDate?{startDate:b.startDate}:{}),...(b.endDate?{endDate:b.endDate}:{})};
}

export function candidates(brief:PlanningBrief) {
  return brief.blocks.map(b=>planningCities.filter(p=>p.country===b.country&&(!b.city||p.city===b.city)).map(p=>({id:planningCities.indexOf(p),city:p.city,lat:p.lat,lon:p.lon})));
}

export const draftSchema = {
  type:'object', properties:{
    stays:{type:'array',items:{type:'object',properties:{
      block:{type:'integer'}, cityId:{type:'integer'}, reason:{type:'string'}, transferNote:{type:'string'},
      days:{type:'array',items:{type:'array',items:{type:'string'}}}
    },required:['block','cityId','reason','transferNote','days'],additionalProperties:false}},
    warnings:{type:'array',items:{type:'string'}}
  },required:['stays','warnings'],additionalProperties:false
};

export function normalizeDraft(value:unknown,brief:PlanningBrief):AutoDraft {
  const v=value as {stays:any[];warnings:unknown[]};
  const text=(s:unknown,n:number):s is string=>typeof s==='string'&&s.length>0&&s.length<=n;
  if(!v||!Array.isArray(v.stays)||v.stays.length<1||v.stays.length>30||!Array.isArray(v.warnings)||v.warnings.length>12||!v.warnings.every(w=>text(w,600)))throw new Error('The planner returned an incomplete draft. Try again.');
  const totals=brief.blocks.map(()=>0);let last=-1;
  const stops=v.stays.map(s=>{
    if(!s||!Number.isInteger(s.block)||s.block<last||!brief.blocks[s.block]||!Number.isInteger(s.cityId))throw new Error('The draft changed the requested stay order. Try again.');
    last=s.block;const block=brief.blocks[s.block],place=planningCities[s.cityId];
    if(!place||place.country!==block.country||(block.city&&place.city!==block.city))throw new Error('The draft contains a destination outside your selections. Try again.');
    if(!text(s.reason,600)||!text(s.transferNote,600)||!Array.isArray(s.days)||s.days.length<1||s.days.length>14||!s.days.every((d:unknown)=>Array.isArray(d)&&d.length>=1&&d.length<=4&&d.every(a=>text(a,400))))throw new Error('The daily itinerary is incomplete. Try again.');
    totals[s.block]+=s.days.length;
    return {place:{...place},days:s.days as string[][],reason:s.reason as string,transferNote:s.transferNote as string};
  });
  if(totals.some((n,i)=>n!==brief.blocks[i].days))throw new Error('The draft did not respect your day allocations. Try again.');
  return {stops,warnings:v.warnings as string[]};
}

// Validate persisted and browser-delivered suggestions independently of the provider.
export function isAutoDraft(value:unknown):value is AutoDraft {
  const d=value as AutoDraft;
  return !!d&&Array.isArray(d.stops)&&d.stops.length>0&&d.stops.length<=30&&d.stops.every(s=>s&&s.place&&planningCities.some(p=>p.city===s.place.city&&p.country===s.place.country&&p.lat===s.place.lat&&p.lon===s.place.lon)&&typeof s.reason==='string'&&s.reason.length<=600&&typeof s.transferNote==='string'&&s.transferNote.length<=600&&Array.isArray(s.days)&&s.days.length>0&&s.days.length<=14&&s.days.every(day=>Array.isArray(day)&&day.length>0&&day.length<=4&&day.every(a=>typeof a==='string'&&a.length<=400)))&&d.stops.reduce((n,s)=>n+s.days.length,0)<=30&&Array.isArray(d.warnings)&&d.warnings.length<=12&&d.warnings.every(w=>typeof w==='string'&&w.length<=600);
}

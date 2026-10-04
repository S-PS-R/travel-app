import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from './storage';
import {PLAN_LIBRARY_KEY,LEGACY_PLAN_KEY,loadPlanLibrary,type PlanLibrary,type SavedPlan} from './planLibrary';
export const planKey=(userId?:string)=>userId?`${PLAN_LIBRARY_KEY}.${userId}`:PLAN_LIBRARY_KEY;
export async function localPlans(userId?:string){
 const raw=await AsyncStorage.getItem(planKey(userId));
 return loadPlanLibrary(raw,!userId&&raw===null?await AsyncStorage.getItem(LEGACY_PLAN_KEY):null);
}
export async function readPlans(userId?:string):Promise<PlanLibrary>{
 if(!userId)return localPlans();
 if(!supabase)throw new Error('Cloud storage is unavailable.');
 const {data,error}=await supabase.from('plans').select('payload,revision').eq('user_id',userId);
 if(error)throw new Error(error.code==='42P01'||error.code==='PGRST205'?'Cloud plans are not set up in this Supabase project yet. Your older plans remain on this device.':'Could not load cloud plans. Check your connection and sign-in, then retry. Saved copies have not been changed.');
 return loadPlanLibrary(JSON.stringify({version:2,plans:(data??[]).map(r=>({...r.payload,cloudVersion:r.revision})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}),null);
}
export async function writePlan(saved:SavedPlan,library:PlanLibrary,userId?:string):Promise<SavedPlan>{
 if(!userId){await AsyncStorage.setItem(planKey(),JSON.stringify(library));return saved;}
 if(!supabase)throw new Error('Cloud storage is unavailable.');
 const {cloudVersion,...payload}=saved;
 const query=cloudVersion?supabase.from('plans').update({payload,revision:cloudVersion+1}).eq('user_id',userId).eq('id',saved.id).eq('revision',cloudVersion):supabase.from('plans').insert({user_id:userId,id:saved.id,payload});
 const {data,error}=await query.select('revision').single();
 if(error||!data)throw new Error('Could not save. Check your connection; if this plan changed on another device, reopen it before editing. Your unsaved changes are still here.');
 return {...payload,cloudVersion:data.revision};
}
export async function deletePlan(saved:SavedPlan,remaining:PlanLibrary,userId?:string){
 if(!userId){await AsyncStorage.setItem(planKey(),JSON.stringify(remaining));return;}
 if(!supabase||!saved.cloudVersion)throw new Error('Reload this cloud plan before deleting.');
 const {data,error}=await supabase.from('plans').delete().eq('user_id',userId).eq('id',saved.id).eq('revision',saved.cloudVersion).select('id');
 if(error||!data?.length)throw new Error('Could not delete. The plan may have changed on another device. Reload and try again.');
}
export async function importAccountPlans(userId:string){
 if(!supabase)throw new Error('Cloud storage is unavailable.');
 const library=await localPlans(userId);
 if(library.plans.length){
  const {error}=await supabase.from('plans').upsert(library.plans.map(({cloudVersion,...payload})=>({user_id:userId,id:payload.id,payload})),{onConflict:'user_id,id',ignoreDuplicates:true});
  if(error)throw new Error('Import failed. Local copies are unchanged; you can retry.');
 }
 // Retain local originals as a backup, but do not automatically resurrect deleted plans.
 return readPlans(userId);
}

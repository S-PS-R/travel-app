import test from "node:test";
import assert from "node:assert/strict";
import {loadPlanLibrary,saveToLibrary,planIssue} from "../src/planLibrary.ts";
const plan={title:"Nepal",stops:[{id:"stop-1",mode:"flight",place:{city:"Kathmandu",country:"Nepal",countryId:"524",lat:27.7,lon:85.3}}]};
test("legacy plans migrate once without losing places or transport",()=>{
  const library=loadPlanLibrary(null,JSON.stringify(plan));
  assert.equal(library.plans.length,1);
  assert.deepEqual(library.plans[0].stops,plan.stops);
  assert.deepEqual(loadPlanLibrary(JSON.stringify({version:2,plans:[]}),JSON.stringify(plan)),{version:2,plans:[]});
  assert.deepEqual(loadPlanLibrary(null,JSON.stringify({title:"Empty",stops:[]})),{version:2,plans:[]});
});
test("saving multiple plans and editing one preserves the others across reload",()=>{
  const first=saveToLibrary({version:2,plans:[]},plan,"one");
  const second=saveToLibrary(first,{...plan,title:"Another trip"},"two");
  const edited=saveToLibrary(second,{...plan,title:"Nepal in October",startDate:"2026-10-01",endDate:"2026-10-12"},"one");
  const reloaded=loadPlanLibrary(JSON.stringify(edited),null);
  assert.equal(reloaded.plans.length,2);
  assert.equal(reloaded.plans.find(p=>p.id==="two").title,"Another trip");
  assert.equal(reloaded.plans.find(p=>p.id==="one").endDate,"2026-10-12");
  assert.equal(first.plans[0].title,"Nepal");
});
test("invalid saved collections and invalid dates are rejected before overwrite",()=>{
  assert.throws(()=>loadPlanLibrary('{"version":2,"plans":[{}]}',JSON.stringify(plan)));
  assert.throws(()=>loadPlanLibrary('broken',JSON.stringify(plan)));
  assert.match(planIssue({...plan,startDate:"2026-02-30"}),/real dates/);
  assert.match(planIssue({...plan,startDate:"2026-10-12",endDate:"2026-10-01"}),/end date/);
  assert.equal(planIssue({...plan,startDate:"",endDate:""}),null);
  assert.throws(()=>saveToLibrary({version:2,plans:[]},{title:"No stops",stops:[]},"one"),/destination/);
});

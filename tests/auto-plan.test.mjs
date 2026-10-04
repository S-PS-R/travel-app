import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateBrief,normalizeDraft,planningCities,isAutoDraft} from '../src/autoPlan.ts';
import {parsePlan} from '../src/plannerModel.ts';
import {generateDraft} from '../scripts/gemini-planner.mjs';
import {createPlannerServer} from '../scripts/planner-server.mjs';
const brief={blocks:[{country:'Italy',days:3},{country:'France',days:2}],interests:'Food and art',budget:'USD 1500 total',travelers:2,pace:'relaxed'};
const cityId=city=>planningCities.findIndex(p=>p.city===city);
const output={stays:[{block:0,cityId:cityId('Rome'),reason:'History',transferNote:'Check onward travel',days:[['Rest'],['Explore'],['Travel']]},{block:1,cityId:cityId('Paris'),reason:'Art',transferNote:'Check arrival',days:[['Explore'],['Rest']]}],warnings:['Prices are unknown.']};
test('rejects invalid dates, excessive days and non-catalog selections',()=>{
  assert.deepEqual(validateBrief(brief),brief);
  assert.throws(()=>validateBrief({...brief,startDate:'2026-11-01',endDate:'2026-11-03'}),/fit/);
  assert.throws(()=>validateBrief({...brief,blocks:[{country:'Atlantis',days:2}]}));
  assert.throws(()=>validateBrief({...brief,travelers:0}));
});
test('rejects model country/order/day violations and preserves actual catalog coordinates',()=>{
  const draft=normalizeDraft(output,brief);assert.ok(isAutoDraft(draft));assert.equal(draft.stops[0].place.city,'Rome');
  for(const change of [{cityId:cityId('Tokyo')},{block:1},{days:[['One day']]},{reason:42}]){
    assert.throws(()=>normalizeDraft({...output,stays:[{...output.stays[0],...change},output.stays[1]]},brief));
  }
  assert.throws(()=>normalizeDraft({...output,stays:[...output.stays].reverse()},brief));
  assert.throws(()=>normalizeDraft(output,{...brief,blocks:[{country:'Italy',city:'Venice',days:3},brief.blocks[1]]}));
});
test('AI itinerary survives plan save parsing and invalid payloads fail closed',()=>{
  const draft=normalizeDraft(output,brief),plan={title:'Trip',stops:draft.stops.map((s,i)=>({id:String(i),place:s.place,mode:'flight'})),autoDraft:draft};
  assert.deepEqual(parsePlan(JSON.stringify(plan)),plan);
  assert.throws(()=>parsePlan(JSON.stringify({...plan,autoDraft:{stops:[]}})));
});
test('Gemini request has bounded structured output, no tools, no retry or paid fallback',async()=>{
  let calls=0;
  const draft=await generateDraft(brief,{key:'test-secret',fetcher:async(url,opts)=>{
    calls++;assert.ok(!url.includes('test-secret'));assert.equal(opts.headers['x-goog-api-key'],'test-secret');
    const body=JSON.parse(opts.body);assert.equal(body.tools,undefined);assert.equal(body.generationConfig.maxOutputTokens,8192);
    return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]})};
  }});assert.equal(draft.stops.length,2);assert.equal(calls,1);
  await assert.rejects(generateDraft(brief,{key:'test',fetcher:async()=>({status:429,ok:false})}),/quota/);
  await assert.rejects(generateDraft(brief,{key:'test',fetcher:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS'}]})})}),/finish/);
});
test('local endpoint rejects foreign origins, malformed briefs, and parallel generation',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'veyfar-planner-'));let calls=0,release;
  const server=createPlannerServer({key:'test',usageFile:join(dir,'usage.json'),generate:async()=>{calls++;await new Promise(r=>release=r);return normalizeDraft(output,brief);}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/plan`;
  const post=(body,origin='http://127.0.0.1:8081')=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
  try{
    assert.equal((await post(brief,'https://evil.example')).status,403);
    assert.equal((await post({})).status,400);assert.equal(calls,0);
    const first=post(brief);while(!release)await new Promise(r=>setTimeout(r,5));
    assert.equal((await post(brief)).status,429);release();assert.equal((await first).status,200);assert.equal(calls,1);
  }finally{release?.();server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
});

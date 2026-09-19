import test from "node:test";
import assert from "node:assert/strict";
import { parsePlan, moveStop, distanceKm } from "../src/plannerModel.ts";
const place=(city,lat,lon)=>({city,country:"Test",countryId:"001",lat,lon});
const stops=[{id:"a",place:place("Tokyo",35.7,139.7),mode:"flight"},{id:"b",place:place("San Francisco",37.8,-122.4),mode:"train"}];
test("plan round trip retains transport and rejects corrupt data",()=>{
  const plan={title:"Pacific",stops};
  assert.deepEqual(parsePlan(JSON.stringify(plan)),plan);
  assert.throws(()=>parsePlan(JSON.stringify({...plan,stops:[{...stops[0],mode:"teleport"}]})),/invalid/);
  assert.throws(()=>parsePlan(JSON.stringify({...plan,stops:[stops[0],stops[0]]})),/invalid/);
  assert.throws(()=>parsePlan(JSON.stringify({...plan,stops:[{...stops[0],place:{...stops[0].place,lat:91}}]})),/invalid/);
});
test("moving stops preserves their chosen arrival modes and respects ends",()=>{
  const reordered=moveStop(stops,1,-1);
  assert.equal(reordered[0].id,"b");assert.equal(reordered[0].mode,"train");
  assert.equal(stops[0].id,"a");assert.deepEqual(moveStop(stops,0,-1),stops);
});
test("Pacific distance follows the short route and coincident stops have zero distance",()=>{
  const d=distanceKm(stops[0].place,stops[1].place);
  assert.ok(d>8000&&d<9000);assert.equal(distanceKm(stops[0].place,stops[0].place),0);
});

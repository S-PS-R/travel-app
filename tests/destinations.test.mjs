import test from "node:test";
import assert from "node:assert/strict";
import {searchDestinations} from "../src/destinationSearch.ts";
test("city search finds capitals, alternate spellings, and accent-insensitive prefixes",()=>{
  assert.equal(searchDestinations("katmandu")[0].city,"Kathmandu");
  assert.equal(searchDestinations("kath")[0].country,"Nepal");
  assert.equal(searchDestinations("reyk")[0].city,"Reykjavík");
  assert.equal(searchDestinations("par")[0].city,"Paris");
  assert.equal(searchDestinations("Ottawa")[0].city,"Ottawa");
  assert.equal(searchDestinations("Thimphu")[0].city,"Thimphu");
  assert.equal(searchDestinations("Bombay")[0].city,"Mumbai");
  assert.equal(searchDestinations("Pokhara")[0].country,"Nepal");
  assert.equal(searchDestinations("Phuket")[0].country,"Thailand");
  assert.equal(searchDestinations("zxqnonexistent").length,0);
});
test("country searches return usable distinct coordinates",()=>{
  const results=searchDestinations("Nepal");
  assert.ok(results.length>0);
  for(const place of results){assert.equal(place.country,"Nepal");assert.ok(Math.abs(place.lat)<=90&&Math.abs(place.lon)<=180);}
  const cities=searchDestinations("London");
  assert.equal(cities.filter(p=>p.city==="London"&&p.country==="United Kingdom").length,1);
});

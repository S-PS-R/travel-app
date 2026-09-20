import test from 'node:test';
import assert from 'node:assert/strict';
import {searchQuery,normalizeSearchResponse,nearbyAirports} from '../src/flightSearch.ts';
import {isFlightRecord} from '../src/flightModel.ts';
import {parsePlan,mapRoute} from '../src/plannerModel.ts';
import {routePoints} from '../src/routeGeometry.ts';
const query=()=>searchQuery('jfk','lhr','2027-01-10','','2026-09-20');
const segment=(from,to,dep,arr,number)=>({flight_number:number,airline:'Test airline',departure_airport:{id:from,name:from,time:dep},arrival_airport:{id:to,name:to,time:arr},duration:120,airplane:'Test aircraft'});
const offer={flights:[segment('JFK','BOS','2027-01-10 10:00','2027-01-10 12:00','AA 10'),segment('BOS','LHR','2027-01-10 14:00','2027-01-11 02:00','AA 20')],total_duration:660,price:500};
test('search validates airports, date and optional full flight number',()=>{
  assert.equal(query().from,'JFK');assert.equal(query().number,'');
  assert.throws(()=>searchQuery('JFK','JFK','2027-01-10'),/different/);
  assert.throws(()=>searchQuery('???','LHR','2027-01-10'),/airport codes/);
  assert.throws(()=>searchQuery('JFK','LHR','2027-02-30'),/valid departure/);
  assert.throws(()=>searchQuery('JFK','LHR','2020-01-01'),/future/);
  assert.throws(()=>searchQuery('JFK','LHR','2027-01-10','invalid'),/flight number/);
  assert.ok(nearbyAirports({lat:40.7,lon:-74}).some(a=>a.code==='JFK'));
});
test('connecting itinerary retains segments and layover geometry through save/reload',()=>{
  const flight=normalizeSearchResponse({best_flights:[offer],search_metadata:{api_key:'secret'},other_flights:[offer]},query())[0];
  assert.ok(isFlightRecord(flight));assert.equal(flight.segments.length,2);assert.equal(flight.waypoints[1].code,'BOS');assert.equal(flight.price,'USD 500');assert.equal(flight.arrivalDate,'2027-01-11');assert.ok(!JSON.stringify(flight).includes('secret'));
  const stops=[{id:'a',mode:'flight',place:{city:'NYC',country:'USA',countryId:'840',lat:40.7,lon:-74}},{id:'b',mode:'flight',place:{city:'London',country:'UK',countryId:'826',lat:51.5,lon:-.1}}];
  const plan=parsePlan(JSON.stringify({title:'Test',stops,legs:[{fromId:'a',toId:'b',mode:'flight',flight}]}));
  const points=routePoints(mapRoute(plan));const boston=flight.waypoints[1];assert.ok(points.some(p=>Math.abs(p[0]-boston.lon)<.00001&&Math.abs(p[1]-boston.lat)<.00001));
  assert.equal(normalizeSearchResponse({best_flights:[offer],other_flights:[offer]},query()).length,1);
});
test('wrong dates, routes, disconnected segments and unmatched flight numbers are excluded',()=>{
  for(const q of [{...query(),date:'2027-01-11'},{...query(),to:'CDG'},{...query(),number:'AA999'}])assert.deepEqual(normalizeSearchResponse({best_flights:[offer]},q),[]);
  assert.equal(normalizeSearchResponse({best_flights:[offer]},{...query(),number:'AA20'}).length,1);
  assert.deepEqual(normalizeSearchResponse({best_flights:[{...offer,flights:[offer.flights[0],{...offer.flights[1],departure_airport:{id:'CDG',time:'2027-01-10 14:00'}}]}]},query()),[]);
  assert.deepEqual(normalizeSearchResponse({},query()),[]);
});
test('legacy saved records remain readable and corrupt optional segments are rejected',()=>{
  const flight=normalizeSearchResponse({best_flights:[offer]},query())[0];
  const {provider,segments,waypoints,price,...legacy}=flight;assert.ok(isFlightRecord(legacy));
  assert.equal(isFlightRecord({...flight,segments:[null]}),false);
  assert.equal(isFlightRecord({...flight,waypoints:[{code:'JFK',name:'JFK',lat:100,lon:0}]}),false);
});

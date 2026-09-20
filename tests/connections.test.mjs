import test from 'node:test';
import assert from 'node:assert/strict';
import { availableTransports } from '../src/transportAvailability.ts';
import { connection,updateConnection,reorderPlanStops,removePlanStop,parsePlan,mapRoute } from '../src/plannerModel.ts';
import { routePoints,routeBounds } from '../src/routeGeometry.ts';
import { flightQuery,isFlightRecord } from '../src/flightModel.ts';
const place=(city,lat,lon)=>({city,lat,lon,country:'Test',countryId:'001'});
const ny=place('NYC',40.7,-74),london=place('London',51.5,-.12),paris=place('Paris',48.85,2.35),tokyo=place('Tokyo',35.7,139.7);
const stops=[ny,london,paris].map((p,i)=>({id:String(i),place:p,mode:'flight'}));
test('disconnected land excludes ground modes, connected continents retain them',()=>{
  for(const [a,b] of [[ny,london],[tokyo,ny],[place('Sydney',-33.86,151.2),place('Auckland',-36.85,174.76)]])assert.deepEqual(availableTransports(a,b),['flight','ferry']);
  for(const [a,b] of [[london,paris],[ny,place('SF',37.77,-122.4)],[paris,place('Delhi',28.6,77.2)]])assert.ok(availableTransports(a,b).includes('train'));
});
test('reordering preserves booking identity and save/reload retains details',()=>{
  let p=updateConnection({title:'Test',stops},{fromId:'0',toId:'1',mode:'flight',details:{flight:{serviceNumber:'AA100'}}});
  p=reorderPlanStops(p,'1','2');assert.equal(connection(p,'0','2').details,undefined);
  p=reorderPlanStops(p,'1','2');assert.equal(connection(parsePlan(JSON.stringify(p)),'0','1').details.flight.serviceNumber,'AA100');
  assert.equal(removePlanStop(p,'0').legs.length,1);
});
test('fit geometry includes curved path and unwraps date line',()=>{
  const path=routePoints([{id:'a',place:ny,mode:'flight'},{id:'b',place:tokyo,mode:'flight'}]);
  assert.ok(Math.max(...path.map(p=>p[1]))>55);
  for(let i=1;i<path.length;i++)assert.ok(Math.abs(path[i][0]-path[i-1][0])<180);
  const bounds=routeBounds(path);assert.ok(bounds[1][0]-bounds[0][0]<180);
});

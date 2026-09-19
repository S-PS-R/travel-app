import http from 'node:http';
import { flightQuery, normalizeFlightResponse } from '../src/flightModel.ts';

const key=process.env.AIRLABS_API_KEY;
const allowedOrigins=new Set(['http://127.0.0.1:8081','http://localhost:8081','http://127.0.0.2:8081']);
const flightCache=new Map(),airportCache=new Map();
const calls=[];
async function airlabs(endpoint,params) {
  const url=new URL(`https://airlabs.co/api/v9/${endpoint}`);
  url.searchParams.set('api_key',key);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  let response;
  try {response=await fetch(url,{signal:AbortSignal.timeout(15000)});}catch{throw new Error('Flight-data service could not be reached. Try again later.');}
  if(!response.ok)throw new Error('Flight-data service is unavailable or the account limit was reached.');
  let data;try{data=await response.json();}catch{throw new Error('Flight-data service returned an invalid response.');}
  if(data.error)throw new Error('Flight-data service rejected this request. Check the server API key and free-plan quota.');
  return data.response;
}
async function airport(code) {
  if(typeof code!=='string'||!/^[A-Z]{3}$/.test(code))return undefined;
  if(airportCache.has(code))return airportCache.get(code);
  try {
    const rows=await airlabs('airports',{iata_code:code});
    const p=Array.isArray(rows)?rows.find(a=>a.iata_code===code):null;
    if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return undefined;
    const result={code,name:String(p.name||code).slice(0,250),lat:p.lat,lon:p.lng};airportCache.set(code,result);return result;
  }catch{return undefined;}
}
const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&!allowedOrigins.has(origin)){res.writeHead(403,headers);res.end('{"error":"Origin not allowed."}');return;}
  if(origin)headers['Access-Control-Allow-Origin']=origin;
  headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';
  const send=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data));};
  if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
  if(req.url==='/health'&&req.method==='GET'){send(200,{ready:!!key});return;}
  if(req.url!=='/flight'||req.method!=='POST'){send(404,{error:'Not found.'});return;}
  if(!req.headers['content-type']?.startsWith('application/json')){send(415,{error:'JSON required.'});return;}
  if(!key){send(503,{error:'Flight lookup is not configured yet. You can still save details manually.'});return;}
  try {
    let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){send(413,{error:'Request too large.'});return;}}
    let input;try{input=JSON.parse(body);}catch{send(400,{error:'Invalid request.'});return;}
    if(typeof input?.number!=='string'||typeof input?.date!=='string'){send(400,{error:'Flight number and date are required.'});return;}
    const query=flightQuery(input.number,input.date),cacheKey=`${query.number}:${query.date}`;
    const cached=flightCache.get(cacheKey);
    if(cached&&Date.now()-cached.time<15*60*1000){send(200,cached.value);return;}
    while(calls.length&&Date.now()-calls[0]>60000)calls.shift();
    if(calls.length>=5){send(429,{error:'Please wait a minute before looking up more flights.'});return;}calls.push(Date.now());
    const raw=await airlabs('flight',{[query.parameter]:query.number});
    const result=normalizeFlightResponse(raw,query.number,query.date);
    [result.departure,result.arrival]=await Promise.all([airport(raw.dep_iata),airport(raw.arr_iata)]);
    flightCache.set(cacheKey,{time:Date.now(),value:result});send(200,result);
  }catch(error){send(400,{error:error instanceof Error?error.message:'Flight lookup failed.'});}
});
server.listen(8082,'127.0.0.1',()=>console.log('Local flight lookup ready on port 8082.'));
server.on('error',()=>{console.error('Could not start flight lookup on port 8082.');process.exitCode=1;});

import http from 'node:http';
import { searchQuery, normalizeSearchResponse } from '../src/flightSearch.ts';

const key=process.env.SERPAPI_API_KEY;
const allowedOrigins=new Set(['http://127.0.0.1:8081','http://localhost:8081','http://127.0.0.2:8081']);
const flightCache=new Map();
const calls=[];
async function search(params) {
  const url=new URL('https://serpapi.com/search.json');
  url.searchParams.set('api_key',key);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
  let response;
  try {response=await fetch(url,{signal:AbortSignal.timeout(45000)});}catch{throw new Error('Flight search timed out or could not be reached. Try again later.');}
  if(!response.ok)throw new Error('Flight-data service is unavailable or the account limit was reached.');
  let data;try{data=await response.json();}catch{throw new Error('Flight-data service returned an invalid response.');}
  if(typeof data.error==='string'&&/hasn.t returned any results|no results/i.test(data.error))return {};
  if(data.error)throw new Error('Flight-data service rejected this request. Check the server API key and free-plan quota.');
  return data;
}
const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&!allowedOrigins.has(origin)){res.writeHead(403,headers);res.end('{"error":"Origin not allowed."}');return;}
  if(origin)headers['Access-Control-Allow-Origin']=origin;
  headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';
  const send=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data));};
  if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return;}
  if(req.url==='/health'&&req.method==='GET'){send(200,{ready:!!key,provider:'serpapi'});return;}
  if(req.url!=='/flight'||req.method!=='POST'){send(404,{error:'Not found.'});return;}
  if(!req.headers['content-type']?.startsWith('application/json')){send(415,{error:'JSON required.'});return;}
  if(!key){send(503,{error:'Flight lookup is not configured yet. You can still save details manually.'});return;}
  try {
    let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){send(413,{error:'Request too large.'});return;}}
    let input;try{input=JSON.parse(body);}catch{send(400,{error:'Invalid request.'});return;}
    if(!['from','to','date'].every(k=>typeof input?.[k]==='string')||(input.number!==undefined&&typeof input.number!=='string')){send(400,{error:'Departure airport, arrival airport and date are required.'});return;}
    const query=searchQuery(input.from,input.to,input.date,input.number||''),cacheKey=`${query.from}:${query.to}:${query.date}`;
    const cached=flightCache.get(cacheKey);
    const filtered=value=>({flights:query.number?value.filter(f=>f.segments.some(s=>s.number===query.number)):value});
    if(cached&&Date.now()-cached.time<60*60*1000){send(200,filtered(cached.value));return;}
    while(calls.length&&Date.now()-calls[0]>60000)calls.shift();
    if(calls.length>=5){send(429,{error:'Please wait a minute before looking up more flights.'});return;}calls.push(Date.now());
    const raw=await search({engine:'google_flights',departure_id:query.from,arrival_id:query.to,outbound_date:query.date,type:'2',currency:'USD',hl:'en',adults:'1'});
    const result=normalizeSearchResponse(raw,{...query,number:''});
    if(flightCache.size>=100)flightCache.delete(flightCache.keys().next().value);
    flightCache.set(cacheKey,{time:Date.now(),value:result});send(200,filtered(result));
  }catch(error){send(400,{error:error instanceof Error?error.message:'Flight lookup failed.'});}
});
server.listen(8082,'127.0.0.1',()=>console.log('Local flight lookup ready on port 8082.'));
server.on('error',()=>{console.error('Could not start flight lookup on port 8082.');process.exitCode=1;});

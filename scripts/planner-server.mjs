import http from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBrief} from '../src/autoPlan.ts';
import {generateDraft} from './gemini-planner.mjs';

export function createPlannerServer({key=process.env.GEMINI_API_KEY,generate=generateDraft,usageFile=resolve('.expo/gemini-usage.json')}={}) {
  const origins=new Set(['http://127.0.0.1:8081','http://localhost:8081','http://127.0.0.2:8081']);
  let busy=false,lastCall=0;
  function reserve() {
    const date=new Date().toISOString().slice(0,10);let usage={date,count:0};
    try{const saved=JSON.parse(readFileSync(usageFile,'utf8'));if(typeof saved.date!=='string'||!Number.isInteger(saved.count)||saved.count<0)throw new Error('Invalid quota file');if(saved.date===date)usage=saved;}
    catch(e){if(e.code!=='ENOENT')throw new Error('Could not read the planner usage counter. Generation is paused.');}
    if(usage.count>=20)throw new Error('The local daily allowance of 20 generations is used up. Try again tomorrow (UTC).');
    mkdirSync(dirname(usageFile),{recursive:true});writeFileSync(usageFile,JSON.stringify({date,count:usage.count+1}));
  }
  const server=http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
    const send=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data));};
    // Local development only. Do not expose this server to the internet.
    if(!/^(localhost|127\.0\.0\.[12])(?::\d+)?$/.test(req.headers.host||'')){send(403,{error:'Local host required.'});return;}
    if(origin&&!origins.has(origin)){send(403,{error:'Origin not allowed.'});return;}
    if(origin)headers['Access-Control-Allow-Origin']=origin;
    headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';
    if(req.method==='OPTIONS'){send(204,{});return;}
    if(req.url==='/health'&&req.method==='GET'){send(200,{provider:'gemini',ready:!!key});return;}
    if(req.url!=='/plan'||req.method!=='POST'){send(404,{error:'Not found.'});return;}
    if(!origin||!origins.has(origin)){send(403,{error:'Open the local Veyfar website to generate a plan.'});return;}
    if(!req.headers['content-type']?.startsWith('application/json')){send(415,{error:'JSON required.'});return;}
    if(!key){send(503,{error:'Gemini is not configured. Add GEMINI_API_KEY to .env.gemini.local and restart the host.'});return;}
    if(busy||Date.now()-lastCall<15000){send(429,{error:'Please wait 15 seconds between generations.'});return;}
    let input;
    try{let body='';for await(const chunk of req){body+=chunk;if(body.length>16000){send(413,{error:'Trip brief is too large.'});return;}}input=validateBrief(JSON.parse(body));}
    catch{send(400,{error:'Check the countries, days and trip preferences.'});return;}
    // Recheck after reading the request body so parallel requests cannot bypass the cap.
    if(busy||Date.now()-lastCall<15000){send(429,{error:'Another itinerary is being generated. Please wait.'});return;}
    try{reserve();}catch(e){send(429,{error:e.message});return;}
    busy=true;lastCall=Date.now();
    try{send(200,{draft:await generate(input,{key})});}
    catch(e){send(503,{error:e.message});}
    finally{busy=false;}
  });
  server.requestTimeout=30000;server.headersTimeout=15000;
  return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  createPlannerServer().listen(8083,'127.0.0.1',()=>console.log('Local Gemini planner ready on port 8083.'));
}

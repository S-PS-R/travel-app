// Install @electric-sql/pglite in .expo/rls-test before running this isolated test.
import {PGlite} from '../.expo/rls-test/node_modules/@electric-sql/pglite/dist/index.js';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
try {
 await db.exec(`create role anon; create role authenticated;
 create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
 for(const file of ['001_trips','002_account_isolation','003_friends'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}.sql`,import.meta.url),'utf8'));
 const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
 for(let i=0;i<ids.length;i++)await db.query(`insert into auth.users values($1,$2,now(),'{"full_name":"Test traveler"}')`,[ids[i],`fixture${i}@gmail.com`]);
 const place={city:'London',country:'United Kingdom',countryId:'826',lat:51.5,lon:-.1};
 await db.query('insert into public.trips(id,user_id,payload) values($1,$2,$3)', ['fixture',ids[1],JSON.stringify({id:'fixture',title:'Private title',notes:'private',stops:[{arrival:'2020-01-01',place,notes:'secret',photos:['private']},{arrival:'2999-01-01',place:{...place,city:'Future'}}]})]);
 async function asUser(i){await db.exec('reset role; set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[i]]);}
 async function rows(sql,args=[]){return (await db.query(sql,args)).rows;}
 await asUser(0);
 await db.query("select public.request_friend('unknown@gmail.com')");
 assert.equal((await rows('select * from public.list_friends()')).length,0);
 await db.query("select public.request_friend('fixture1@gmail.com')");
 const [{id:relationship}]=await rows('select * from public.list_friends()');
 assert.equal((await rows('select * from public.friend_map_pins()')).length,0,'pending cannot see pins');
 await assert.rejects(db.query('select public.accept_friend($1)',[relationship]),/incoming request/);
 await assert.rejects(db.query("update public.friendships set status='accepted'"),/permission denied/);
 await asUser(2);
 assert.equal((await rows('select * from public.list_friends()')).length,0);
 assert.equal((await rows('select * from public.friendships')).length,0);
 await assert.rejects(db.query('select public.accept_friend($1)',[relationship]),/incoming request/);
 await db.query('select public.remove_friend($1)',[relationship]);
 await asUser(1);await db.query('select public.accept_friend($1)',[relationship]);
 await asUser(0);
 const pins=await rows('select * from public.friend_map_pins()');assert.equal(pins.length,1,'future pins excluded');
 assert.deepEqual(Object.keys(pins[0]).sort(),['owner_id','name','city','country','country_id','lat','lon'].sort());
 assert.equal((await rows('select * from public.trips')).length,0,'accepted friends cannot read private trips');
 await asUser(2);assert.equal((await rows('select * from public.friend_map_pins()')).length,0,'outsiders cannot read pins');
 await asUser(0);await db.query('select public.remove_friend($1)',[relationship]);
 assert.equal((await rows('select * from public.friend_map_pins()')).length,0,'removal revokes sharing');
 for(let i=0;i<8;i++)await db.query("select public.request_friend('unknown@gmail.com')");
 await assert.rejects(db.query("select public.request_friend('unknown@gmail.com')"),/Please wait/);
 await db.exec('reset role;set role anon');
 for(const sql of ['select * from public.friendships','select * from public.friend_map_pins()','select * from public.list_friends()',"select public.request_friend('fixture0@gmail.com')"])
  await assert.rejects(db.query(sql),/permission denied/);
 console.log('PASS: pending, accepted, outsider, anonymous, revocation, rate limit and private-trip isolation in local PostgreSQL.');
}finally{await db.close();}

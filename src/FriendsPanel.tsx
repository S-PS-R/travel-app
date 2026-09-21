import React,{useEffect,useState} from 'react';
import {View,Text} from 'react-native';
import {Button,Field,useTheme} from './ui';
import {supabase} from './storage';
import {gmailAddress,type Friend} from './friendsModel';
export default function FriendsPanel({onChanged}:{onChanged:()=>void}) {
 const {s}=useTheme();const [friends,setFriends]=useState<Friend[]>([]),[email,setEmail]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;setFriends([]);supabase!.rpc('list_friends').then(({data,error})=>{if(!alive)return;if(error)setMessage('Friends could not load. Check your connection or finish the friend database setup.');else setFriends(data??[]);});return()=>{alive=false;};},[revision]);
 async function act(action:'request_friend'|'accept_friend'|'remove_friend',id?:string){
  setBusy(true);setMessage('');
  try {
   const args=action==='request_friend'?{target_email:gmailAddress(email)}:{friendship_id:id};
   const {error}=await supabase!.rpc(action,args);if(error)throw error;
   if(action==='request_friend'){setEmail('');setMessage('If that Gmail address belongs to a verified Veyfar account, the request is available in their Friends panel.');}
   else setMessage(action==='accept_friend'?'Friend added. You can now see each other’s visited map locations.':'Connection removed. Map sharing has stopped.');
   setRevision(r=>r+1);onChanged();
  }catch(e){setMessage(e instanceof Error?e.message:(e as {message?:string})?.message??'Could not update friends.');}finally{setBusy(false);}
 }
 return <View style={{gap:14}}><Text style={s.subtitle}>Friends</Text>
  <Text style={s.muted}>Send a request to a friend’s Gmail address. Once accepted, you both share visited map locations. Notes, photos, stays and future plans stay private. No emails are sent.</Text>
  <Field label="Friend’s Gmail address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!busy}/>
  <Button disabled={busy} onPress={()=>act('request_friend')}>Send friend request</Button>
  <Button quiet disabled={busy} onPress={()=>{setRevision(r=>r+1);onChanged();}}>Refresh friends</Button>
  {!!message&&<Text accessibilityRole="alert" style={s.muted}>{message}</Text>}
  {friends.map(f=><View key={f.id} style={[s.card,{gap:8}]}><Text style={s.body}>{f.name}</Text><Text style={s.muted}>{f.email}</Text><Text style={s.muted}>{f.status==='accepted'?'Sharing visited map locations':f.incoming?'Incoming request':'Request sent'}</Text>
   {f.status==='pending'&&f.incoming&&<Button disabled={busy} onPress={()=>act('accept_friend',f.id)}>Accept and share map locations</Button>}
   <Button quiet disabled={busy} onPress={()=>act('remove_friend',f.id)}>{f.status==='accepted'?'Remove friend':f.incoming?'Decline request':'Cancel request'}</Button>
  </View>)}
 </View>;
}

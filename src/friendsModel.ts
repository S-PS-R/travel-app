import type { Place } from './model';
export type Friend={id:string;other_id:string;name:string;email:string;status:'pending'|'accepted';incoming:boolean};
export type FriendPin={ownerId:string;name:string;place:Place};
export function gmailAddress(value:string) {
 const email=value.trim().toLowerCase();
 if(email.length>254||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/.test(email))throw new Error('Enter a Gmail address, such as friend@gmail.com.');
 return email;
}
export function parseFriendPins(rows:unknown):FriendPin[] {
 if(!Array.isArray(rows))throw new Error('Could not read shared map locations.');
 return rows.map(r=>{
  if(!r||!['owner_id','name','city','country','country_id'].every(k=>typeof r[k]==='string')||!Number.isFinite(r.lat)||Math.abs(r.lat)>90||!Number.isFinite(r.lon)||Math.abs(r.lon)>180)throw new Error('Invalid shared map location.');
  return {ownerId:r.owner_id,name:r.name,place:{city:r.city,country:r.country,countryId:r.country_id,lat:r.lat,lon:r.lon}};
 });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {gmailAddress,parseFriendPins} from '../src/friendsModel.ts';
test('friend requests require exact Gmail addresses',()=>{
 assert.equal(gmailAddress(' Friend.Name@gmail.com '),'friend.name@gmail.com');
 for(const value of ['','friend@example.com','friend@gmail.com.evil','friend @gmail.com'])assert.throws(()=>gmailAddress(value));
});
test('shared locations validate coordinates and exclude extra private fields',()=>{
 const row={owner_id:'friend',name:'Traveler',city:'Paris',country:'France',country_id:'250',lat:48,lon:2,notes:'secret',photos:['private']};
 const pins=parseFriendPins([row]);assert.equal(pins[0].place.city,'Paris');assert.ok(!JSON.stringify(pins).includes('secret'));assert.ok(!JSON.stringify(pins).includes('photos'));
 for(const change of [{lat:91},{lon:181},{lat:'48'},{name:null}])assert.throws(()=>parseFriendPins([{...row,...change}]));
});

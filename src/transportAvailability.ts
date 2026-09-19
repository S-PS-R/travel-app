import { geoContains, geoDistance } from "d3-geo";
import land from "../assets/land.json" with { type: "json" };
import type { Place } from "./model";
import type { Transport } from "./plannerModel";
const features=land.features as unknown as GeoJSON.Feature<GeoJSON.Polygon>[];
const cache=new Map<string,number>();
function landmass(place:Place):number {
  const key=`${place.lon},${place.lat}`;const existing=cache.get(key);if(existing!==undefined)return existing;
  const point:[number,number]=[place.lon,place.lat];
  let index=features.findIndex(f=>geoContains(f,point));
  if(index<0) {
    // Coastal cities can fall just outside the simplified coastline. Find the
    // nearest mapped shore, rather than treating a coastal city as open ocean.
    let nearest=Infinity;
    features.forEach((f,i)=>f.geometry.coordinates.forEach(ring=>ring.forEach(vertex=>{
      const distance=geoDistance(point,vertex as [number,number]);if(distance<nearest){nearest=distance;index=i;}
    })));
    if(nearest>0.06)index=-1;
  }
  cache.set(key,index);return index;
}
export function availableTransports(from:Place,to:Place):Transport[] {
  const a=landmass(from),b=landmass(to);
  // Great Britain is connected to continental Europe by the Channel Tunnel.
  const europe=landmass({city:"Paris",country:"France",countryId:"250",lat:48.8566,lon:2.3522});
  const britain=landmass({city:"London",country:"United Kingdom",countryId:"826",lat:51.5074,lon:-0.1278});
  const connected=a>=0&&b>=0&&(a===b||((a===britain&&b===europe)||(b===britain&&a===europe)));
  return connected?["flight","train","car","bus","ferry","bicycle","walk"]:["flight","ferry"];
}

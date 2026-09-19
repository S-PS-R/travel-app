import { geoInterpolate } from "d3-geo";
import type { PlanStop } from "./plannerModel";
export type RoutePoint = [number, number];

export function routeSegments(stops: PlanStop[]): RoutePoint[][] {
  let previous=stops[0]?.place.lon??0;
  return stops.slice(1).map((stop,i)=>{
    const a=stops[i].place,b=stop.place;
    const airports=stop.mode==="flight"&&stop.incomingFlight?.departure&&stop.incomingFlight?.arrival?[stop.incomingFlight.departure,stop.incomingFlight.arrival]:[];
    const waypoints=[a,...airports,b];
    return waypoints.slice(1).flatMap((target,k)=>{
      const origin=waypoints[k];const interpolate=geoInterpolate([origin.lon,origin.lat],[target.lon,target.lat]);
      return Array.from({length:161},(_,j)=>{
      const point=interpolate(j/160) as RoutePoint;
      while(point[0]-previous>180)point[0]-=360;
      while(point[0]-previous< -180)point[0]+=360;
      previous=point[0];return point;
      });
    });
  });
}
export function routePoints(stops:PlanStop[]):RoutePoint[] {
  return stops.length===1?[[stops[0].place.lon,stops[0].place.lat]]:routeSegments(stops).flat();
}
export function routeBounds(points:RoutePoint[]):[RoutePoint,RoutePoint] {
  return [[Math.min(...points.map(p=>p[0])),Math.max(-85.05112878,Math.min(...points.map(p=>p[1])))],
    [Math.max(...points.map(p=>p[0])),Math.min(85.05112878,Math.max(...points.map(p=>p[1])))]];
}
export function globeRouteCenter(points:RoutePoint[]):RoutePoint {
  const r=Math.PI/180;
  const v=points.reduce((sum,[lon,lat])=>[sum[0]+Math.cos(lat*r)*Math.cos(lon*r),sum[1]+Math.cos(lat*r)*Math.sin(lon*r),sum[2]+Math.sin(lat*r)],[0,0,0]);
  return [Math.atan2(v[1],v[0])/r,Math.atan2(v[2],Math.hypot(v[0],v[1]))/r];
}

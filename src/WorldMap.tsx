import React, { useMemo, useRef, useState } from "react";
import { View, Text, PanResponder } from "react-native";
import Svg, { Path, Circle, G, Text as SvgText, Defs, RadialGradient, Stop } from "react-native-svg";
import { geoMercator, geoOrthographic, geoPath, geoDistance } from "d3-geo";
import { countryData, continents } from "./mapData";
import { placeKey } from "./model";
import { Button, useTheme } from "./ui";
import { transports } from "./plannerModel";
import type { WorldMapProps } from "./WorldMap.types";
import { mapStars, oceanBlue } from "./mapAppearance";
import { routeSegments } from "./routeGeometry";

// Native offline overview. The web implementation uses live vector tiles.
export default function WorldMap({ trips, selected, onSelect, planner, route = [] }: WorldMapProps) {
  const { s } = useTheme();
  const [globe, setGlobe] = useState(!!planner);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number,number]>([10,20]);
  const [label, setLabel] = useState("World");
  const gesture = useRef({center,zoom,span:0});
  const current = useRef({center,zoom}); current.current={center,zoom};
  const responder = useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)+Math.abs(g.dy)>5,
    onPanResponderGrant:e=>{const t=e.nativeEvent.touches;gesture.current={...current.current,span:t.length>1?Math.hypot(t[1].pageX-t[0].pageX,t[1].pageY-t[0].pageY):0};},
    onPanResponderMove:(e,g)=>{const t=e.nativeEvent.touches;if(t.length>1&&gesture.current.span){setZoom(Math.max(1,Math.min(15,gesture.current.zoom*Math.hypot(t[1].pageX-t[0].pageX,t[1].pageY-t[0].pageY)/gesture.current.span)));}else{setCenter([gesture.current.center[0]-g.dx/(2*current.current.zoom),Math.max(-80,Math.min(80,gesture.current.center[1]+g.dy/(2*current.current.zoom)))]);}},
  }),[]);
  const projection = globe ? geoOrthographic().rotate([-center[0],-center[1]]).scale(235*zoom).translate([500,270]) : geoMercator().center(center).scale(150*zoom).translate([500,270]);
  const path=geoPath(projection);
  const pins=planner?route.map(st=>st.place):Array.from(new Map(trips.flatMap(t=>t.stops).map(st=>[placeKey(st.place),st.place])).values());
  const visible=(lon:number,lat:number)=>!globe||geoDistance(center,[lon,lat])<Math.PI/2;
  return <View style={{backgroundColor:"#07162e",borderRadius:22,overflow:"hidden",borderWidth:1,borderColor:"#294153"}}>
    <View style={[s.spread,{padding:18}]}><Text style={{color:"#deeced",fontSize:22}}>{label}</Text><Button quiet onPress={()=>setGlobe(!globe)}>{globe?"Globe":"Map"} · switch</Button></View>
    <View {...responder.panHandlers} style={{backgroundColor:globe?"#000000":oceanBlue}}><Svg width="100%" height={440} viewBox="0 0 1000 540" accessibilityLabel="Interactive world overview">
      <Defs><RadialGradient id="sea"><Stop offset="0" stopColor="#2589c2"/><Stop offset="1" stopColor={oceanBlue}/></RadialGradient></Defs>
      {globe&&mapStars.map((star,i)=><Circle key={i} cx={star.x} cy={star.y} r={star.radius} fill="white" opacity={star.opacity}/>)}
      {globe&&<Circle cx={500} cy={270} r={235*zoom+3} fill="url(#sea)" stroke="#346b80" strokeWidth={2}/>}
      {countryData.features.map((c,i)=><Path key={i} d={path(c)??""} fill="#214752" stroke="#527080" strokeWidth={0.6} onPress={()=>{const continent=continents.find(x=>x.name===c.properties.CONTINENT);setLabel(c.properties.NAME_EN);if(zoom<2&&continent){setCenter([...continent.center]);setZoom(3);}else{setCenter([c.properties.LABEL_X,c.properties.LABEL_Y]);setZoom(z=>Math.min(15,z*1.5));}}}/>)}
      {zoom>2&&countryData.features.map((c,i)=>{const xy=projection([c.properties.LABEL_X,c.properties.LABEL_Y]);return xy&&visible(c.properties.LABEL_X,c.properties.LABEL_Y)?<SvgText key={i} x={xy[0]} y={xy[1]} fill="#d7e4e9" fontSize={10} textAnchor="middle">{c.properties.NAME_EN}</SvgText>:null;})}
      {routeSegments(route).map((coordinates,i)=><Path key={route[i+1].id} d={path({type:"LineString",coordinates})??""} fill="none" stroke={transports[route[i+1].mode].color} strokeWidth={2} strokeDasharray="5 4"/>)}
      {pins.map((p,i)=>{const point=projection([p.lon,p.lat]);return point&&visible(p.lon,p.lat)?<G key={`${placeKey(p)}-${i}`} onPress={()=>onSelect(p)}><Circle cx={point[0]} cy={point[1]} r={selected===placeKey(p)?10:7} fill="#f5cba0" stroke="white" strokeWidth={2}/><SvgText x={point[0]+12} y={point[1]} fontSize={13} fill="white">{p.city}</SvgText></G>:null;})}
    </Svg></View>
    <View style={{padding:16,gap:12}}><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{continents.map(c=><Button key={c.name} quiet onPress={()=>{setCenter([...c.center]);setZoom(3);setLabel(c.name);}}>{c.name}</Button>)}</View>
      <View style={s.row}><Button quiet onPress={()=>setZoom(z=>Math.max(1,z/1.5))}>−</Button><Button quiet onPress={()=>setZoom(z=>Math.min(15,z*1.5))}>+</Button><Button quiet onPress={()=>{setZoom(1);setCenter([10,20]);setLabel("World");}}>Reset</Button></View>
      <Text style={{color:"#adc0c8",fontSize:12}}>Drag to explore · pinch to zoom · Natural Earth overview. Detailed city and street tiles are available in the web preview.</Text>
    </View>
  </View>;
}

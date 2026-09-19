import React from "react";
import { View, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { countryData, continents } from "./mapData";
import { isVisited, type Trip } from "./model";
import { useTheme } from "./ui";

export default function TravelStats({trips}:{trips:Trip[]}) {
  const {s,colors}=useTheme();
  const stops=trips.flatMap(t=>t.stops.filter(isVisited));
  const ids=new Set(stops.map(st=>st.place.countryId.padStart(3,"0")));
  const visited=new Set(countryData.features.filter(f=>ids.has(f.properties.ISO_N3)).map(f=>f.properties.CONTINENT));
  const path=geoPath(geoNaturalEarth1().fitSize([600,285],countryData));
  return <View style={[s.card,{gap:16}]}>
    <View style={s.spread}><View><Text style={s.eyebrow}>YOUR TRAVEL FOOTPRINT</Text><Text style={[s.subtitle,{marginTop:8}]}>There’s a whole world ahead.</Text></View><Text style={s.subtitle}>{visited.size} / 7</Text></View>
    <Text style={s.muted}>Continents explored · based on your past trip stops</Text>
    <Svg width="100%" height={210} viewBox="0 0 600 285" accessibilityLabel={`${visited.size} of seven continents visited`}>
      {countryData.features.map((f,i)=><Path key={i} d={path(f)??""} fill={visited.has(f.properties.CONTINENT)?continents.find(c=>c.name===f.properties.CONTINENT)?.color:colors.line} stroke={colors.surface} strokeWidth={0.35}/>)}
    </Svg>
    <View style={{flexDirection:"row",flexWrap:"wrap",gap:16}}>{continents.map(c=><Text key={c.name} style={{color:visited.has(c.name)?colors.ink:colors.muted,fontSize:13}}><Text style={{color:visited.has(c.name)?c.color:colors.line}}>● </Text>{c.name}</Text>)}</View>
  </View>;
}

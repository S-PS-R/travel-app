import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import maplibregl, { type GeoJSONSource, type Map as MapInstance } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { routeSegments, routePoints, routeBounds, globeRouteCenter } from "./routeGeometry";
import { countryData, continents } from "./mapData";
import { isVisited, placeKey, type Place } from "./model";
import { transports } from "./plannerModel";
import type { WorldMapProps } from "./WorldMap.types";
import { useTheme } from "./ui";
import { mapStars, oceanBlue } from "./mapAppearance";

const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
export default function WorldMap(props: WorldMapProps) {
  const { s } = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const latest = useRef(props); latest.current = props;
  const [ready, setReady] = useState(false);
  const [globe, setGlobe] = useState(!!props.planner);
  const [region, setRegion] = useState("World");
  const [zoom, setZoom] = useState(1.4);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [picked, setPicked] = useState<Place | null>(null);
  const [fitMessage,setFitMessage]=useState("");
  const [fitting,setFitting]=useState(false);
  const fitRequest=useRef(0);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!host.current) return;
    setReady(false);
    let m: MapInstance;
    try {
      m = new maplibregl.Map({ container: host.current, style: "https://tiles.openfreemap.org/styles/dark",
        center: props.planner ? [-22, 28] : [12, 22], zoom: props.planner ? 1.5 : 1.4,
        minZoom: -3, maxZoom: 17, attributionControl: { compact: true }, canvasContextAttributes: { antialias: true } });
    } catch { setError("This browser could not start the interactive map. Try a browser with WebGL enabled."); return; }
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    m.getCanvas().setAttribute("aria-label", "Interactive world map. Drag to pan, scroll to zoom. Use continent buttons to explore.");
    const timer = setTimeout(() => { if (!m.isStyleLoaded()) setError("Map tiles are taking longer to load. Check your connection or retry."); }, 20000);
    m.on("load", () => {
      clearTimeout(timer); setError("");
      m.setProjection({ type: latest.current.planner ? "globe" : "mercator" });
      m.setPaintProperty("background", "background-color", "#203b48");
      m.setPaintProperty("water", "fill-color", oceanBlue);
      m.setPaintProperty("landcover_wood", "fill-color", "#18474b");
      m.setPaintProperty("landuse_park", "fill-color", "#205252");
      m.setPaintProperty("landcover_glacier", "fill-color", "#a7c1ce");
      for (const layer of m.getStyle().layers) {
        if (layer.type === "symbol" && layer.id.startsWith("place_")) {
          m.setPaintProperty(layer.id, "text-color", "#dce9ed");
          m.setPaintProperty(layer.id, "text-halo-color", "#102435");
          m.setPaintProperty(layer.id, "text-halo-width", 1.5);
        }
      }
      m.addSource("veyfar-countries", { type: "geojson", data: countryData, generateId: true });
      m.addLayer({ id: "veyfar-country-hit", type: "fill", source: "veyfar-countries", paint: { "fill-color": "#7dd8c6", "fill-opacity": 0.001 } });
      m.addLayer({ id: "veyfar-visited", type: "line", source: "veyfar-countries", filter: ["==", "ISO_N3", "none"], paint: { "line-color": "#78c9b8", "line-width": 1.3, "line-opacity": 0.65 } });
      m.addSource("veyfar-route", { type: "geojson", data: empty });
      m.addLayer({ id: "veyfar-route-glow", type: "line", source: "veyfar-route", paint: { "line-color": ["get", "color"], "line-width": 8, "line-opacity": 0.1 } });
      m.addLayer({ id: "veyfar-route-line", type: "line", source: "veyfar-route", paint: { "line-color": ["get", "color"], "line-width": 2.4, "line-dasharray": [2, 2] } });
      m.addSource("veyfar-pins", { type: "geojson", data: empty });
      m.addSource("veyfar-friends", {type:"geojson",data:empty});
      m.addLayer({id:"veyfar-friend-pin",type:"circle",source:"veyfar-friends",paint:{"circle-radius":10,"circle-color":"#b998ff","circle-opacity":0.65,"circle-stroke-color":"#e5d9ff","circle-stroke-width":2}});
      m.addLayer({id:"veyfar-friend-label",type:"symbol",source:"veyfar-friends",layout:{"text-field":["get","label"],"text-size":12,"text-offset":[0,-1.5],"text-anchor":"bottom"},paint:{"text-color":"#e5d9ff","text-halo-color":"#07162e","text-halo-width":2}});
      m.addLayer({ id: "veyfar-pin-halo", type: "circle", source: "veyfar-pins", paint: { "circle-radius": 13, "circle-color": "#91e0cc", "circle-opacity": 0.12 } });
      m.addLayer({ id: "veyfar-pin", type: "circle", source: "veyfar-pins", paint: { "circle-radius": ["case", ["get", "active"], 8, 5], "circle-color": "#f5cba0", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      m.addLayer({ id: "veyfar-pin-label", type: "symbol", source: "veyfar-pins", layout: { "text-field": ["get", "label"], "text-size": 13, "text-offset": [0, 1.4], "text-anchor": "top" }, paint: { "text-color": "#ffffff", "text-halo-color": "#07162e", "text-halo-width": 2 } });
      m.on("mousemove", "veyfar-country-hit", (e) => {
        if (m.isMoving()) return;
        const p = e.features?.[0]?.properties;
        if (p) setHover({ name: p.NAME_EN || p.NAME, x: e.point.x, y: e.point.y });
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", "veyfar-country-hit", () => { setHover(null); m.getCanvas().style.cursor = "grab"; });
      m.on("movestart", () => setHover(null));
      m.on("zoomend", () => setZoom(m.getZoom()));
      m.on("click", (e) => {
        const pin = m.queryRenderedFeatures(e.point, { layers: ["veyfar-pin","veyfar-friend-pin"] })[0];
        if (pin) {
          const p = JSON.parse(pin.properties.place) as Place;
          latest.current.onSelect(p);
          m.flyTo({ center: [p.lon, p.lat], zoom: Math.max(m.getZoom(), 4), duration: 700 });
          return;
        }
        const country = m.queryRenderedFeatures(e.point, { layers: ["veyfar-country-hit"] })[0]?.properties;
        if (!country) return;
        if (latest.current.onAddPlace) {
          const labels = m.queryRenderedFeatures(e.point).filter(f => f.sourceLayer === "place");
          setPicked({ city: labels[0]?.properties?.["name:en"] || labels[0]?.properties?.name || `Stop in ${country.NAME_EN || country.NAME}`,
            country: country.NAME_EN || country.NAME, countryId: country.ISO_N3, lat: e.lngLat.lat, lon: ((e.lngLat.lng+540)%360)-180 });
        } else if (m.getZoom() < 2.8) {
          const c = continents.find(c => c.name === country.CONTINENT);
          if (c) { setRegion(c.name); m.flyTo({ center: [...c.center], zoom: c.zoom, duration: 1000 }); }
        } else {
          setRegion(country.NAME_EN || country.NAME);
          m.flyTo({ center: [country.LABEL_X, country.LABEL_Y], zoom: Math.min(8, m.getZoom()+1.5), duration: 700 });
        }
      });
      setReady(true);
    });
    const resize = new ResizeObserver(() => m.resize()); resize.observe(host.current);
    return () => { fitRequest.current++;clearTimeout(timer); resize.disconnect(); m.remove(); map.current = null; };
  }, [attempt]);

  useEffect(() => {
    const m = map.current; if (!m || !ready) return;
    m.setProjection({ type: globe ? "globe" : "mercator" });
  }, [globe, ready]);
  useEffect(() => {
    const m = map.current; if (!m || !ready) return;
    const points = props.planner ? (props.route ?? []).map(st => st.place) : Array.from(new Map(props.trips.flatMap(t => t.stops).map(st => [placeKey(st.place), st.place])).values());
    const pins: GeoJSON.FeatureCollection<GeoJSON.Point> = { type: "FeatureCollection", features: points.map((p, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lon, p.lat] }, properties: { label: props.planner ? `${i+1} · ${p.city}` : p.city, active: props.selected === placeKey(p), place: JSON.stringify(p) } })) };
    (m.getSource("veyfar-pins") as GeoJSONSource).setData(pins);
    (m.getSource("veyfar-friends") as GeoJSONSource).setData({type:"FeatureCollection",features:(props.friendPins??[]).map(f=>({type:"Feature",geometry:{type:"Point",coordinates:[f.place.lon,f.place.lat]},properties:{label:`${f.name} · ${f.place.city}`,place:JSON.stringify(f.place)}}))});
    const lines: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    const badges: maplibregl.Marker[] = [];
    const segments=routeSegments(props.route??[]);
    (props.route ?? []).forEach((st, i, arr) => {
      if (!i) return;
      const a = arr[i-1].place, b = st.place;
      const coords = segments[i-1];
      lines.push({ type: "Feature", properties: { color: transports[st.mode].color }, geometry: { type: "LineString", coordinates: coords } });
      const badge = document.createElement("div");
      badge.className = "veyfar-transport";
      badge.textContent = transports[st.mode].icon;
      badge.title = `${transports[st.mode].label}: ${a.city} to ${b.city}`;
      badge.setAttribute("aria-label", badge.title);
      badge.style.borderColor = transports[st.mode].color;
      badges.push(new maplibregl.Marker({element:badge}).setLngLat(coords[Math.floor(coords.length/2)]).addTo(m));
    });
    (m.getSource("veyfar-route") as GeoJSONSource).setData({ type: "FeatureCollection", features: lines });
    const ids = props.trips.flatMap(t => t.stops.filter(isVisited).map(st => st.place.countryId.padStart(3,"0")));
    m.setFilter("veyfar-visited", ["in", ["get", "ISO_N3"], ["literal", ids]]);
    return () => badges.forEach(b => b.remove());
  }, [props.trips, props.route, props.selected, props.planner, props.friendPins, ready]);

  useEffect(() => {
    if (!ready || !props.selected) return;
    const p = (props.planner ? props.route?.map(st=>st.place) : props.trips.flatMap(t=>t.stops.map(st=>st.place)))?.find(p=>placeKey(p)===props.selected);
    if (p) map.current?.flyTo({center:[p.lon,p.lat],zoom:Math.max(map.current.getZoom(),props.planner?2.4:4),duration:800});
  }, [props.selected, ready]);

  function focusContinent(c: typeof continents[number]) {
    setRegion(c.name); setPicked(null); map.current?.flyTo({ center: [...c.center], zoom: c.zoom, duration: 1000 });
  }
  async function fitRoute() {
    const stops = latest.current.route ?? [];
    const m=map.current;if(!m||!ready||!stops.length)return;
    const request=++fitRequest.current;
    const points=routePoints(stops),bounds=routeBounds(points);
    const width=m.getContainer().clientWidth,height=m.getContainer().clientHeight;
    const padding=Math.min(80,Math.max(32,Math.min(width,height)*0.14));
    const frame=()=>new Promise<void>(resolve=>{m.once("render",()=>resolve());m.triggerRepaint();});
    const current=()=>map.current===m&&request===fitRequest.current;
    const visible=(onGlobe:boolean)=>{
      return points.every(([lon,lat])=>{
        const location=new maplibregl.LngLat(lon,onGlobe?lat:Math.max(-85.05112878,Math.min(85.05112878,lat)));
        // Projection-aware occlusion also catches arcs behind the globe's horizon.
        if(onGlobe&&m.transform.isLocationOccluded(location))return false;
        const p=m.project(location);
        return Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=padding&&p.x<=width-padding&&p.y>=padding&&p.y<=height-padding;
      });
    }
    setFitting(true);setFitMessage("");setPicked(null);setHover(null);m.stop();
    try {
      if(globe) {
        const center=globeRouteCenter(points);
        const camera=m.cameraForBounds(bounds,{padding,maxZoom:5,bearing:0});
        m.jumpTo({center,zoom:Math.min(5,camera?.zoom??1),pitch:0,bearing:0,padding:{top:0,bottom:0,left:0,right:0}});
        await frame();
        while(current()&&!visible(true)&&m.getZoom()>-3) {m.jumpTo({zoom:Math.max(-3,m.getZoom()-0.35)});await frame();}
        if(!current())return;
        if(visible(true))return;
        // No camera can expose both sides of Earth at once. Use the full map
        // for itineraries whose connections cannot fit on a visible hemisphere.
        setGlobe(false);m.setProjection({type:"mercator"});await frame();
        if(!current())return;
        setFitMessage("Showing the full route on the flat map because it wraps around the globe.");
      }
      m.jumpTo({pitch:0,bearing:0,padding:{top:0,bottom:0,left:0,right:0}});
      m.fitBounds(bounds,{padding,maxZoom:5,animate:false});await frame();
      while(current()&&!visible(false)&&m.getZoom()>-3) {m.jumpTo({zoom:Math.max(-3,m.getZoom()-0.2)});await frame();}
    } finally {if(current())setFitting(false);}
  }
  return <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: "#07162e", borderWidth: 1, borderColor: "#294153" }}>
    <View style={{ padding: 20, flexDirection: "row", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <View><Text style={{ color: "#84c7c3", fontSize: 11, letterSpacing: 2, fontWeight: "700" }}>{props.planner ? "THE JOURNEY STARTS HERE" : "YOUR WORLD, STILL UNFOLDING"}</Text><Text style={{ color: "#f0f5f4", fontSize: 25, marginTop: 6 }}>{region}</Text></View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Pressable accessibilityRole="button" onPress={() => setGlobe(!globe)} style={chip}><Text style={chipText}>{globe ? "◉ Globe" : "▱ Map"} · switch</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setRegion("World"); setPicked(null); map.current?.flyTo({center: [12,22],zoom: 1.4,pitch:0,bearing:0}); }} style={chip}><Text style={chipText}>Reset</Text></Pressable>
        {props.planner && <Pressable accessibilityRole="button" disabled={!ready||fitting||!props.route?.length} onPress={fitRoute} style={chip}><Text style={chipText}>{fitting?"Fitting…":"Fit route"}</Text></Pressable>}
      </View>
    </View>
    <View style={{ position: "relative", backgroundColor: "#000000" }}>
      <svg aria-hidden="true" className="veyfar-stars" viewBox="0 0 1000 540" preserveAspectRatio="none">
        {mapStars.map((star, i) => <circle key={i} cx={star.x} cy={star.y} r={star.radius} fill="white" opacity={star.opacity} />)}
      </svg>
      <div ref={host} className="veyfar-map" style={{ height: props.planner ? 560 : 510, width: "100%" }} />
      {!ready && !error && <View pointerEvents="none" style={{position:"absolute",top:20,left:20}}><Text style={chipText}>Opening your world…</Text></View>}
      {hover && <div role="tooltip" style={{position:"absolute",pointerEvents:"none",left:Math.min(hover.x+14,(host.current?.clientWidth??300)-190),top:Math.max(8,hover.y-42),background:"#f0f6f5",color:"#12373c",padding:"9px 13px",borderRadius:10,fontSize:13,fontWeight:700,boxShadow:"0 4px 20px #0005"}}>{hover.name}</div>}
      {picked && <View style={{position:"absolute",bottom:40,left:16,right:16,backgroundColor:"#102c3b",borderRadius:14,padding:16,gap:10}}>
        <Text style={{color:"white",fontWeight:"600"}}>{picked.city}</Text>
        <Text style={{color:"#a8c3cc",fontSize:12}}>Map point · {picked.lat.toFixed(3)}, {picked.lon.toFixed(3)}</Text>
        <View style={{flexDirection:"row",gap:10}}><Pressable style={chip} onPress={() => {props.onAddPlace?.(picked);setPicked(null);}}><Text style={chipText}>＋ Add to itinerary</Text></Pressable><Pressable style={chip} onPress={()=>setPicked(null)}><Text style={chipText}>Cancel</Text></Pressable></View>
      </View>}
      {!!error && <View style={{position:"absolute",top:20,left:20,right:20,backgroundColor:"#102c3b",padding:16,borderRadius:12}}><Text accessibilityRole="alert" style={{color:"white"}}>{error}</Text><Pressable onPress={()=>{setError("");setGlobe(!!props.planner);setAttempt(a=>a+1);}}><Text style={{color:"#8de0d1",paddingTop:10}}>Retry map</Text></Pressable></View>}
    </View>
    <View style={{padding:16,gap:12}}>
      {!!fitMessage&&<Text accessibilityLiveRegion="polite" style={{color:"#b6d8de",fontSize:12}}>{fitMessage}</Text>}
      <View style={{flexDirection:"row",gap:8,flexWrap:"wrap"}}>{continents.map(c=><Pressable key={c.name} accessibilityRole="button" accessibilityLabel={`Explore ${c.name}`} onPress={()=>focusContinent(c)} style={[chip,region===c.name&&{backgroundColor:"#234d55",borderColor:"#78b9b4"}]}><Text style={chipText}><Text style={{color:c.color}}>● </Text>{c.name}</Text></Pressable>)}</View>
      <Text style={[s.muted,{color:"#91acba",fontSize:12}]}>{props.planner ? "Drag to rotate · scroll to zoom · click land to add a stop" : "Drag to pan · scroll to zoom · click a continent to explore"} · {zoom < 3 ? "World view" : zoom < 7 ? "Countries & cities" : "Local detail"}</Text>
    </View>
  </View>;
}
const chip = { borderWidth: 1, borderColor: "#355461", borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 };
const chipText = { color: "#dce9ed", fontSize: 12, fontWeight: "600" as const };

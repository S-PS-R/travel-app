import React, { useMemo, useRef, useState } from "react";
import { View, Text, PanResponder } from "react-native";
import { useTheme } from "./ui";
import type { SortableStopsProps } from "./SortableStops.types";

export default function SortableStops(props:SortableStopsProps) {
  const {colors}=useTheme();const latest=useRef(props);latest.current=props;
  const views=useRef(new Map<string,View>());
  const boxes=useRef<{id:string;x:number;y:number;width:number;height:number}[]>([]);
  const current=useRef<{id:string;target:string}|null>(null);
  const [active,setActive]=useState<string|null>(null),[target,setTarget]=useState<string|null>(null);
  function finish(commit:boolean) {
    const state=current.current;current.current=null;setActive(null);setTarget(null);latest.current.onDragging(false);
    if(commit&&state&&state.id!==state.target)latest.current.onMove(state.id,state.target);
  }
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>!latest.current.disabled,
    onPanResponderMove:(_,gesture)=>{if(!current.current)return;const hit=boxes.current.find(b=>gesture.moveX>=b.x&&gesture.moveX<=b.x+b.width&&gesture.moveY>=b.y&&gesture.moveY<=b.y+b.height);if(hit){current.current.target=hit.id;setTarget(hit.id);}},
    onPanResponderRelease:()=>finish(true),onPanResponderTerminate:()=>finish(false),
  }),[]);
  return <View style={{flexDirection:"row",flexWrap:"wrap",gap:16}}>{props.stops.map((stop,i)=><View key={stop.id} ref={view=>{if(view)views.current.set(stop.id,view);else views.current.delete(stop.id);}} style={{width:props.compact?"100%":"31.9%",minWidth:props.compact?0:280,opacity:active===stop.id?0.65:1,borderWidth:2,borderColor:target===stop.id&&active!==stop.id?colors.teal:"transparent",borderRadius:15}}>
    {props.renderStop(stop,i,<View {...responder.panHandlers} accessibilityLabel={`Drag ${stop.place.city} to reorder`} onTouchStart={()=>{
      if(props.disabled)return;current.current={id:stop.id,target:stop.id};setActive(stop.id);setTarget(stop.id);props.onDragging(true);boxes.current=[];
      views.current.forEach((view,id)=>view.measureInWindow((x,y,width,height)=>boxes.current.push({id,x,y,width,height})));
    }} style={{padding:10,borderWidth:1,borderColor:colors.line,borderRadius:8}}><Text style={{color:colors.ink}}>⠿ Drag</Text></View>)}
  </View>)}</View>;
}

import React, { useRef, useState } from "react";
import { useTheme } from "./ui";
import type { SortableStopsProps } from "./SortableStops.types";

export default function SortableStops({stops,compact,disabled,onMove,onDragging,renderStop}:SortableStopsProps) {
  const {colors}=useTheme();
  const root=useRef<HTMLDivElement>(null);
  const drag=useRef<{id:string;target:string;pointer:number}|null>(null);
  const [active,setActive]=useState<string|null>(null),[target,setTarget]=useState<string|null>(null);
  function finish(commit:boolean) {
    const state=drag.current;drag.current=null;setActive(null);setTarget(null);onDragging(false);
    if(commit&&state&&state.id!==state.target)onMove(state.id,state.target);
  }
  return <div ref={root} style={{display:"grid",gridTemplateColumns:compact?"minmax(0,1fr)":"repeat(3,minmax(0,1fr))",gap:16,alignItems:"start"}}>
    {stops.map((stop,i)=><div key={stop.id} data-stop-id={stop.id} style={{minWidth:0,borderRadius:15,outline:target===stop.id&&active!==stop.id?`3px solid ${colors.teal}`:undefined,opacity:active===stop.id?0.65:1}}>
      {renderStop(stop,i,<button type="button" aria-label={`Drag ${stop.place.city} to reorder`} disabled={disabled}
        style={{touchAction:"none",cursor:disabled?"default":active?"grabbing":"grab",padding:"9px 12px",border:`1px solid ${colors.line}`,borderRadius:8,background:colors.surface,color:colors.ink,fontSize:14}}
        onPointerDown={e=>{if(disabled||e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:stop.id,target:stop.id,pointer:e.pointerId};setActive(stop.id);setTarget(stop.id);onDragging(true);}}
        onPointerMove={e=>{
          if(!drag.current||drag.current.pointer!==e.pointerId)return;
          const element=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>("[data-stop-id]");
          if(element&&root.current?.contains(element)){drag.current.target=element.dataset.stopId!;setTarget(drag.current.target);}
          // Auto-scroll the planner while a handle is held near the viewport edge.
          let scroll=root.current?.parentElement;
          while(scroll&&scroll.scrollHeight<=scroll.clientHeight)scroll=scroll.parentElement;
          if(scroll){const rect=scroll.getBoundingClientRect();if(e.clientY>rect.bottom-70)scroll.scrollBy(0,24);else if(e.clientY<rect.top+70)scroll.scrollBy(0,-24);}
        }}
        onPointerUp={()=>finish(true)} onPointerCancel={()=>finish(false)} onLostPointerCapture={()=>{if(drag.current)finish(false);}}
        onKeyDown={e=>{if(e.key==="Escape"){finish(false);return;}const delta=e.key==="ArrowLeft"||e.key==="ArrowUp"?-1:e.key==="ArrowRight"||e.key==="ArrowDown"?1:0;if(delta&&stops[i+delta]){e.preventDefault();onMove(stop.id,stops[i+delta].id);}}}>⠿ Drag</button>)}
    </div>)}
  </div>;
}

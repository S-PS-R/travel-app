import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { searchDestinations, normalizePlace } from "./destinationSearch";
import { useTheme } from "./ui";
import type { DestinationInputProps } from "./DestinationInput.types";

export default function DestinationInput({label,onSelect,disabled}: DestinationInputProps) {
  const {colors} = useTheme();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [query,setQuery] = useState("");
  const [display,setDisplay] = useState("");
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(0);
  const selection = useRef<number | null>(null);
  const results = searchDestinations(query);
  useEffect(()=>{if(open)container.current?.scrollIntoView({block:"nearest"});},[open,query]);
  useLayoutEffect(() => {
    if(selection.current !== null) { input.current?.setSelectionRange(selection.current,display.length); selection.current=null; }
  },[display,query]);
  function select(index: number) {
    const place=results[index]; if(!place || disabled)return;
    onSelect(place);setQuery("");setDisplay("");setActive(0);setOpen(false);input.current?.focus();
  }
  return <div ref={container} style={{position:"relative",width:"100%",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}}>
    <label htmlFor={id} style={{display:"block",color:colors.ink,fontSize:13,marginBottom:7}}>{label}</label>
    <input ref={input} id={id} role="combobox" aria-autocomplete="both" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open&&results[active]?`${id}-${active}`:undefined}
      autoComplete="off" disabled={disabled} placeholder="City or country" value={display}
      style={{boxSizing:"border-box",width:"100%",padding:13,borderRadius:9,border:`1px solid ${colors.line}`,background:colors.surface,color:colors.ink,fontSize:16,outlineColor:colors.teal}}
      onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)}
      onChange={e=>{
        const text=e.target.value;
        const deleting=(e.nativeEvent as InputEvent).inputType?.startsWith("delete");
        const top=searchDestinations(text)[0];
        const complete=!deleting&&text.length>0&&e.target.selectionStart===text.length&&top&&normalizePlace(top.city).startsWith(normalizePlace(text))&&top.city.length>text.length;
        setQuery(text);setActive(0);setOpen(true);
        selection.current=complete?text.length:null;
        setDisplay(complete?top.city:text);
      }}
      onKeyDown={e=>{
        if(e.key==="Escape"){setOpen(false);return;}
        if(e.key==="ArrowDown"||e.key==="ArrowUp") { e.preventDefault();setOpen(true);setActive(a=>Math.max(0,Math.min(results.length-1,a+(e.key==="ArrowDown"?1:-1)))); }
        if(e.key==="Enter"&&open&&results[active]) {e.preventDefault();select(active);}
        if((e.key==="Tab"||e.key==="ArrowRight")&&input.current?.selectionStart!==input.current?.selectionEnd) {
          setQuery(display);input.current?.setSelectionRange(display.length,display.length);
        }
      }}/>
    {open&&!disabled&&<div id={`${id}-list`} role="listbox" aria-label="Destination suggestions" style={{marginTop:2,border:`1px solid ${colors.line}`,borderRadius:9,maxHeight:240,overflowY:"auto",background:colors.surface,boxShadow:"0 5px 16px #0002"}}>
      {results.map((p,i)=><div key={`${p.city}-${p.country}-${p.lat}`} role="option" id={`${id}-${i}`} aria-selected={active===i}
        onMouseDown={e=>e.preventDefault()} onClick={()=>select(i)} onMouseEnter={()=>setActive(i)}
        style={{cursor:"pointer",padding:"10px 12px",background:active===i?colors.pale:colors.surface,color:colors.ink,borderBottom:i<results.length-1?`1px solid ${colors.line}`:undefined}}>
        <span style={{fontWeight:600}}>{p.city}</span><span style={{display:"block",fontSize:12,color:colors.muted}}>{p.country}</span>
      </div>)}
      {!results.length&&<div style={{padding:12,color:colors.muted}}>No matching city. Try another spelling, or add a place manually.</div>}
    </div>}
  </div>;
}

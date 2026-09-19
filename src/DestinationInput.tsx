import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { searchDestinations, normalizePlace } from "./destinationSearch";
import { useTheme } from "./ui";
import type { DestinationInputProps } from "./DestinationInput.types";
export default function DestinationInput({label,onSelect,disabled}:DestinationInputProps) {
  const {colors,s}=useTheme();
  const [query,setQuery]=useState("");const [display,setDisplay]=useState("");const [open,setOpen]=useState(false);
  const [selection,setSelection]=useState<{start:number;end:number}|undefined>();
  const results=searchDestinations(query);
  return <View style={{gap:2}}><Text style={[s.label,{marginBottom:5}]}>{label}</Text>
    <TextInput accessibilityLabel={label} editable={!disabled} value={display} selection={selection} autoCorrect={false} placeholder="City or country" placeholderTextColor={colors.placeholder} style={s.input}
      onFocus={()=>setOpen(true)} onChangeText={text=>{const top=searchDestinations(text)[0];const complete=text.length>query.length&&top&&normalizePlace(top.city).startsWith(normalizePlace(text));setQuery(text);setDisplay(complete?top.city:text);setSelection(complete?{start:text.length,end:top.city.length}:undefined);setOpen(true);}}
      onSubmitEditing={()=>{if(results[0]){onSelect(results[0]);setQuery("");setDisplay("");setSelection(undefined);setOpen(false);}}}/>
    {open&&!disabled&&<View style={{borderWidth:1,borderColor:colors.line,borderRadius:9,overflow:"hidden"}}>{results.map(p=><Pressable key={`${p.city}-${p.country}-${p.lat}`} accessibilityRole="button" onPress={()=>{onSelect(p);setQuery("");setDisplay("");setSelection(undefined);setOpen(false);}} style={{padding:12,backgroundColor:colors.surface}}><Text style={s.body}>{p.city}</Text><Text style={s.muted}>{p.country}</Text></Pressable>)}{!results.length&&<Text style={[s.muted,{padding:12}]}>No matching city. Try another spelling or add it manually.</Text>}</View>}
  </View>;
}

import React, { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView } from "react-native";
import { Button, Field, useTheme } from "./ui";
import { validDate } from "./model";

export default function DateField({label,value,onChange,min,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;min?:string;disabled?:boolean}) {
  const {s,colors}=useTheme();
  const [open,setOpen]=useState(false);
  const [month,setMonth]=useState(new Date());
  const year=month.getFullYear(), m=month.getMonth();
  const first=new Date(year,m,1).getDay(), days=new Date(year,m+1,0).getDate();
  function show(){setMonth(validDate(value)?new Date(`${value}T12:00:00`):validDate(min??"")?new Date(`${min}T12:00:00`):new Date());setOpen(true);}
  return <View style={{flexGrow:1,gap:6}}><Field label={label} placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} maxLength={10} editable={!disabled}/><Button quiet disabled={disabled} onPress={show}>Calendar · {label}</Button>
    <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
      <View style={{flex:1,backgroundColor:colors.overlay,justifyContent:"center",alignItems:"center",padding:20}}>
        <ScrollView accessibilityViewIsModal style={{width:"100%",maxWidth:390,maxHeight:"90%",flexGrow:0}} contentContainerStyle={[s.card,{gap:14}]}>
          <Text accessibilityRole="header" style={s.subtitle}>{label}</Text>
          <View style={s.spread}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={()=>setMonth(new Date(year,m-1,1))} style={[s.button,{paddingHorizontal:14,borderColor:colors.line}]}><Text style={s.body}>‹</Text></Pressable><Text style={s.muted}>{month.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={()=>setMonth(new Date(year,m+1,1))} style={[s.button,{paddingHorizontal:14,borderColor:colors.line}]}><Text style={s.body}>›</Text></Pressable></View>
          <View style={s.spread}><Button quiet onPress={()=>setMonth(new Date(year-1,m,1))}>‹ Year</Button><Button quiet onPress={()=>setMonth(new Date(year+1,m,1))}>Year ›</Button></View>
          <View style={{flexDirection:"row",flexWrap:"wrap"}}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(day=><Text key={day} style={[s.muted,{width:"14.2857%",textAlign:"center",paddingVertical:6}]}>{day}</Text>)}
            {Array.from({length:first+days},(_,i)=>{
              const day=i-first+1;
              if(day<1)return <View key={i} style={{width:"14.2857%"}}/>;
              const date=`${year}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const unavailable=!!min&&validDate(min)&&date<min;
              return <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Choose ${date}`} accessibilityState={{selected:date===value,disabled:unavailable}} disabled={unavailable} onPress={()=>{onChange(date);setOpen(false);}} style={{width:"14.2857%",paddingVertical:12,borderRadius:8,backgroundColor:date===value?colors.teal:colors.surface,opacity:unavailable?0.3:1}}><Text style={{textAlign:"center",color:date===value?colors.onAccent:colors.ink}}>{day}</Text></Pressable>;
            })}
          </View>
          <Button quiet onPress={()=>setOpen(false)}>Close calendar</Button>
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

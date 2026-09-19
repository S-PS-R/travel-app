import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const palettes = {
 light: {ink:'#193c42',muted:'#586f74',teal:'#137f78',pale:'#e6f3ef',line:'#cbdcde',white:'#ffffff',bg:'#f5f8f8',surface:'#ffffff',onAccent:'#ffffff',danger:'#a83333',placeholder:'#6b8085',banner:'#e7eff9',bannerText:'#34577d',cardA:'#d6e5ed',cardB:'#e1ede7',overlay:'#081b2e99',ocean:'#9fc9e0',grid:'#80adc6',coast:'#304e51',border:'#edf0d9',pin:'#a73d1c',pinHalo:'#ffffff',visited:'#ffdb8b'},
 dark: {ink:'#e6f1f2',muted:'#adc0c8',teal:'#6dd8c1',pale:'#173c3c',line:'#344a58',white:'#ffffff',bg:'#0b1621',surface:'#142633',onAccent:'#082a27',danger:'#ffaaa2',placeholder:'#97adb8',banner:'#182f49',bannerText:'#c0d9f8',cardA:'#233b50',cardB:'#243f3b',overlay:'#02080dba',ocean:'#102f48',grid:'#204962',coast:'#dddfc1',border:'#e3e4cf',pin:'#ffdf94',pinHalo:'#172b37',visited:'#ffe0a1'},
};
export type Palette = typeof palettes.light;
type Theme = {mode:'light'|'dark';colors:Palette;toggleTheme:()=>void;themeError:string};
const ThemeContext=createContext<Theme>({mode:'light',colors:palettes.light,toggleTheme:()=>{},themeError:''});
export function ThemeProvider({children}:{children:React.ReactNode}){
 const system=useColorScheme();const [choice,setChoice]=useState<'light'|'dark'|null>(null);const [themeError,setThemeError]=useState('');const touched=useRef(false);const writes=useRef(Promise.resolve());
 useEffect(()=>{AsyncStorage.getItem('travel-app.appearance.v1').then(value=>{if(!touched.current&&(value==='dark'||value==='light'))setChoice(value);}).catch(()=>setThemeError('Could not load your appearance preference.'));},[]);
 const mode=choice??(system==='dark'?'dark':'light');
 function toggleTheme(){touched.current=true;const next=mode==='dark'?'light':'dark';setChoice(next);setThemeError('');writes.current=writes.current.then(()=>AsyncStorage.setItem('travel-app.appearance.v1',next)).catch(()=>setThemeError('Appearance changed, but could not be saved on this device.'));}
 return <ThemeContext.Provider value={{mode,colors:palettes[mode],toggleTheme,themeError}}>{children}</ThemeContext.Provider>;
}
export const usePalette=()=>useContext(ThemeContext);

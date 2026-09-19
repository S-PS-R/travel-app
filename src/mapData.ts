import data from "../assets/countries.json";
export const countryData = {...data, features: data.features.map(f=>({...f,properties:{...f.properties,ISO_N3:f.properties.ISO_N3_EH}}))} as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, {
  NAME_EN: string; NAME: string; CONTINENT: string; ISO_N3: string; ISO_A2: string; LABEL_X: number; LABEL_Y: number;
}>;
export const continents = [
  { name: "Europe", center: [18, 52], zoom: 3.3, color: "#abd37f" },
  { name: "Asia", center: [92, 34], zoom: 2.1, color: "#70b9d1" },
  { name: "Africa", center: [20, 3], zoom: 2.5, color: "#e8b778" },
  { name: "North America", center: [-105, 43], zoom: 2.1, color: "#ef91a6" },
  { name: "South America", center: [-60, -22], zoom: 2.4, color: "#be9cdc" },
  { name: "Oceania", center: [145, -25], zoom: 2.4, color: "#77cabb" },
  { name: "Antarctica", center: [0, -76], zoom: 1.8, color: "#c4d3e5" },
] as const;

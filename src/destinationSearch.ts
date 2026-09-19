import { places, type Place } from "./model.ts";
import { cityCatalog, travelDestinations } from "./cityCatalog.ts";

export const normalizePlace = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const aliases: Record<string, string[]> = {
  Kathmandu: ["Katmandu"], "New Delhi": ["Delhi"], Mumbai: ["Bombay"],
  Beijing: ["Peking"], "Ho Chi Minh City": ["Saigon"], Kolkata: ["Calcutta"],
  Bengaluru: ["Bangalore"], "Mexico City": ["Ciudad de Mexico"],
  "Marrakesh": ["Marrakech"], "Kyiv": ["Kiev"],
};
const catalog = [...places.map(p => ({ ...p, aliases: [] as string[], rank: 0 })), ...travelDestinations, ...cityCatalog];
const seen = new Set<string>();
const destinations = catalog.filter(p => {
  const key = `${normalizePlace(p.city)}|${normalizePlace(p.country)}`;
  if (seen.has(key)) return false;
  seen.add(key); return true;
});
export function searchDestinations(query: string, limit = 6): Place[] {
  const term = normalizePlace(query);
  return destinations.map((place, index) => {
    const city = normalizePlace(place.city);
    const names = [...place.aliases, ...(aliases[place.city] ?? [])].map(normalizePlace);
    const score = !term ? 3 : city === term || names.includes(term) ? 0
      : city.startsWith(term) ? 1 : names.some(n => n.startsWith(term)) ? 2
      : city.includes(term) || names.some(n => n.includes(term)) ? 3
      : normalizePlace(place.country).includes(term) ? 4 : 99;
    return { place, score, index };
  }).filter(r => r.score < 99).sort((a,b) => a.score-b.score || a.index-b.index)
    .slice(0,limit).map(({place}) => ({city:place.city,country:place.country,countryId:place.countryId,lat:place.lat,lon:place.lon}));
}

export type Place = {
  city: string;
  country: string;
  countryId: string;
  lat: number;
  lon: number;
};
export type Stop = {
  id: string;
  place: Place;
  arrival: string;
  departure: string;
  stay: string;
  notes: string;
  photos: string[];
};
export type Trip = {
  id: string;
  title: string;
  stops: Stop[];
  notes: string;
  createdAt: string;
};
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const places: Place[] = [
  ["Rome", "Italy", "380", 41.9028, 12.4964],
  ["Florence", "Italy", "380", 43.7696, 11.2558],
  ["Venice", "Italy", "380", 45.4408, 12.3155],
  ["Paris", "France", "250", 48.8566, 2.3522],
  ["Nice", "France", "250", 43.7102, 7.262],
  ["London", "United Kingdom", "826", 51.5074, -0.1278],
  ["Barcelona", "Spain", "724", 41.3874, 2.1686],
  ["Madrid", "Spain", "724", 40.4168, -3.7038],
  ["Lisbon", "Portugal", "620", 38.7223, -9.1393],
  ["Amsterdam", "Netherlands", "528", 52.3676, 4.9041],
  ["Berlin", "Germany", "276", 52.52, 13.405],
  ["Prague", "Czechia", "203", 50.0755, 14.4378],
  ["Athens", "Greece", "300", 37.9838, 23.7275],
  ["Istanbul", "Türkiye", "792", 41.0082, 28.9784],
  ["Reykjavík", "Iceland", "352", 64.1466, -21.9426],
  ["New York", "United States", "840", 40.7128, -74.006],
  ["San Francisco", "United States", "840", 37.7749, -122.4194],
  ["Los Angeles", "United States", "840", 34.0522, -118.2437],
  ["Chicago", "United States", "840", 41.8781, -87.6298],
  ["Miami", "United States", "840", 25.7617, -80.1918],
  ["Honolulu", "United States", "840", 21.3099, -157.8581],
  ["Toronto", "Canada", "124", 43.6532, -79.3832],
  ["Vancouver", "Canada", "124", 49.2827, -123.1207],
  ["Mexico City", "Mexico", "484", 19.4326, -99.1332],
  ["Tokyo", "Japan", "392", 35.6762, 139.6503],
  ["Kyoto", "Japan", "392", 35.0116, 135.7681],
  ["Osaka", "Japan", "392", 34.6937, 135.5023],
  ["Seoul", "South Korea", "410", 37.5665, 126.978],
  ["Bangkok", "Thailand", "764", 13.7563, 100.5018],
  ["Singapore", "Singapore", "702", 1.3521, 103.8198],
  ["Bali", "Indonesia", "360", -8.4095, 115.1889],
  ["Sydney", "Australia", "036", -33.8688, 151.2093],
  ["Melbourne", "Australia", "036", -37.8136, 144.9631],
  ["Auckland", "New Zealand", "554", -36.8509, 174.7645],
  ["Cape Town", "South Africa", "710", -33.9249, 18.4241],
  ["Marrakesh", "Morocco", "504", 31.6295, -7.9811],
  ["Cairo", "Egypt", "818", 30.0444, 31.2357],
  ["Dubai", "United Arab Emirates", "784", 25.2048, 55.2708],
  ["Delhi", "India", "356", 28.6139, 77.209],
  ["Rio de Janeiro", "Brazil", "076", -22.9068, -43.1729],
  ["Buenos Aires", "Argentina", "032", -34.6037, -58.3816],
  ["Lima", "Peru", "604", -12.0464, -77.0428],
].map(([city, country, countryId, lat, lon]) => ({
  city: String(city),
  country: String(country),
  countryId: String(countryId),
  lat: Number(lat),
  lon: Number(lon),
}));
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function validateTrip(trip: Trip): string | null {
  if (!trip.title.trim()) return "Give your trip a name.";
  if (!trip.stops.length) return "Add at least one destination.";
  for (const stop of trip.stops) {
    if (!stop.place.city.trim() || !stop.place.country.trim())
      return "Each destination needs a city and country.";
    if (
      !Number.isFinite(stop.place.lat) ||
      Math.abs(stop.place.lat) > 90 ||
      !Number.isFinite(stop.place.lon) ||
      Math.abs(stop.place.lon) > 180
    )
      return "Enter valid latitude and longitude for each place.";
    if (!validDate(stop.arrival) || !validDate(stop.departure))
      return "Use real dates in YYYY-MM-DD format.";
    if (stop.departure < stop.arrival)
      return "Departure must be on or after arrival.";
  }
  const sorted = [...trip.stops].sort((a, b) =>
    a.arrival.localeCompare(b.arrival),
  );
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].arrival < sorted[i - 1].departure)
      return "Destination dates overlap. You can arrive on the previous stop’s departure date.";
  return null;
}
export const placeKey = (p: Place) =>
  `${p.city.toLowerCase().trim()}|${p.country.toLowerCase().trim()}`;
export function dateLabel(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export const sortedStops = (trip: Trip) =>
  [...trip.stops].sort((a, b) => a.arrival.localeCompare(b.arrival));
export const tripStart = (trip: Trip) => sortedStops(trip)[0]?.arrival ?? "";
export function tripDays(trip: Trip) {
  const stops = sortedStops(trip);
  return stops.length
    ? Math.round(
        (Date.parse(stops[stops.length - 1].departure) -
          Date.parse(stops[0].arrival)) /
          86400000,
      ) + 1
    : 0;
}
export const isVisited = (stop: Stop) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return stop.arrival <= today;
};
export function parseTrips(value: unknown): Trip[] {
  if (!Array.isArray(value))
    throw new Error("Saved trips could not be read. Your data has been kept.");
  for (const t of value) {
    if (
      !t ||
      typeof t.id !== "string" ||
      typeof t.title !== "string" ||
      typeof t.notes !== "string" ||
      typeof t.createdAt !== "string" ||
      !Array.isArray(t.stops)
    )
      throw new Error("Saved trip data is invalid. Your data has been kept.");
    for (const st of t.stops)
      if (
        !st ||
        typeof st.id !== "string" ||
        typeof st.arrival !== "string" ||
        typeof st.departure !== "string" ||
        typeof st.stay !== "string" ||
        typeof st.notes !== "string" ||
        !Array.isArray(st.photos) ||
        !st.photos.every(
          (p: unknown) => typeof p === "string" && p.startsWith("data:image/"),
        ) ||
        !st.place ||
        typeof st.place.city !== "string" ||
        typeof st.place.country !== "string" ||
        typeof st.place.countryId !== "string"
      )
        throw new Error(
          "Saved destination data is invalid. Your data has been kept.",
        );
    if (validateTrip(t))
      throw new Error("A saved trip needs repair. Your data has been kept.");
  }
  return value;
}
export function sampleTrips(): Trip[] {
  const stop = (
    city: string,
    arrival: string,
    departure: string,
    stay: string,
    notes: string,
  ): Stop => ({
    id: uid(),
    place: places.find((p) => p.city === city)!,
    arrival,
    departure,
    stay,
    notes,
    photos: [],
  });
  return [
    {
      id: "demo-italy",
      title: "A little more Italy",
      createdAt: "2025-06-01",
      notes: "Slow mornings, long lunches, and taking the scenic route.",
      stops: [
        stop(
          "Rome",
          "2025-05-04",
          "2025-05-08",
          "A guesthouse in Trastevere",
          "Early walks along the Tiber. The best evenings were the ones without a plan.",
        ),
        stop(
          "Florence",
          "2025-05-08",
          "2025-05-12",
          "A small apartment near Santo Spirito",
          "A day out in the Tuscan countryside, then sunset above the city.",
        ),
        stop(
          "Venice",
          "2025-05-12",
          "2025-05-16",
          "A canal-side guesthouse",
          "Getting a little lost in Cannaregio.",
        ),
      ],
    },
    {
      id: "demo-japan",
      title: "Two weeks in Japan",
      createdAt: "2024-11-01",
      notes: "A trip worth taking again.",
      stops: [
        stop(
          "Tokyo",
          "2024-10-06",
          "2024-10-13",
          "Shinjuku",
          "Coffee shops, quiet gardens, and late-night ramen.",
        ),
        stop(
          "Kyoto",
          "2024-10-13",
          "2024-10-20",
          "Higashiyama",
          "Walking the old streets before the city woke up.",
        ),
      ],
    },
    {
      id: "demo-portugal",
      title: "An Atlantic escape",
      createdAt: "2024-07-01",
      notes: "Blue tiles and ocean air.",
      stops: [
        stop(
          "Lisbon",
          "2024-06-10",
          "2024-06-15",
          "Alfama",
          "Watching the light change over the rooftops.",
        ),
      ],
    },
  ];
}

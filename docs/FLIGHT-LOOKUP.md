# Future flight planning

The local web preview uses SerpApi's Google Flights search through a loopback server at `127.0.0.1:8082`. AirLabs is no longer used. Existing saved flight records remain readable.

Put `SERPAPI_API_KEY=your-key` in ignored `.env.flight.local` at the project root. Never put the secret in an `EXPO_PUBLIC_` variable. Restart with `run.ps1 stop` then `run.ps1 start` after changing the key. These commands manage both the website and flight server.

In **Plan a trip**, open the departure stop's flight details, choose a future departure date, confirm the airport codes, and click **Search future flights**. Nearby airport suggestions come from the offline OurAirports dataset; they are suggestions, not a guarantee of service. An optional flight-number filter matches a segment in the returned itineraries. Searches are one way, one adult, economy, in USD. Select an itinerary, then save the plan.

The saved snapshot includes flight numbers, airport-local departure/arrival dates and times, connections, total duration, aircraft where supplied, and the displayed price. Prices and schedules can change. This does not book a flight, guarantee exhaustive results, or provide live status/gates. Future coverage depends on published schedules and Google Flights availability.

Map arcs follow airport coordinates including layovers, using public-domain OurAirports coordinates. They are geographic previews, not actual flown tracks. If a complete airport chain cannot be resolved, the map retains the city preview rather than inventing layover coordinates.

Search happens only on a button click. Each uncached route/date costs one SerpApi search; matching flight numbers is done locally on those results. Results are cached for one hour in memory. The free account allowance is shared across users and quotas still apply. No automatic polling or paid upgrade is enabled.

The server binds only to loopback and allows local preview origins. Production/mobile access requires an authenticated hosted backend with per-user quotas. The optional `EXPO_PUBLIC_FLIGHT_LOOKUP_URL` points to that backend and must never contain a secret.

Source: https://serpapi.com/google-flights-api

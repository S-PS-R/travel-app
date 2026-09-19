# Flight lookup

The web preview uses a local server at `127.0.0.1:8082` to keep the AirLabs API key out of the browser and public repository. Create an ignored `.env.flight.local` at the project root containing `AIRLABS_API_KEY=your-key`. Never use an `EXPO_PUBLIC_` variable for this key.

The existing `run.ps1 start` and `run.ps1 stop` commands start and stop both servers. Manual transport details work without the lookup server.

Enter the full flight number (for example AA100) and departure date, then select **Look up flight**. Review the result and select **Use these flight details**, then save the plan. Details belong to the departure stop and its specific destination; reordering does not transfer a booking to a different connection.

AirLabs returns the nearest scheduled/live flight instance. The app rejects a result for another date. Arbitrary future or historical dates may not be available on the free plan. Status, gates, terminals, baggage, aircraft, delays, and local airport times are saved when supplied. They are snapshots, not live notifications.

Confirmed airport coordinates update the route preview. The documented flight endpoint does not provide a complete flight track: the displayed arc is a geographic airport-to-airport preview, not the actual flown route. City-to-airport connectors are included. Ground routes are also geographic previews, not navigation directions.

Each uncached lookup uses one flight request and up to two airport requests. Flight results are cached for 15 minutes and airport coordinates for the server session. There is no polling; account quotas still apply. Check the AirLabs dashboard for your allowance.

This server is for local development, binds only to loopback, and allows the local preview origins. A deployed/mobile app needs a hosted, authenticated backend with per-user quotas before enabling lookup. `EXPO_PUBLIC_FLIGHT_LOOKUP_URL` may point to that backend; it must never contain a secret.

Transport choices use Natural Earth land polygons, with the Channel Tunnel connection included. Ocean-separated land areas offer flight and ferry only. This does not guarantee that a particular ferry, train, road, or border crossing exists.

Sources: https://airlabs.co/docs/flight and https://airlabs.co/docs/airports

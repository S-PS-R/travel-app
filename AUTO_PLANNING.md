# Auto-planning design and data evaluation

Research date: October 3, 2026. This is the implementation specification, not a claim that the services below are integrated.

Implementation update: Gemini was selected as the free default. A local suggestion prototype is now implemented; see [GEMINI_SETUP.md](GEMINI_SETUP.md) for configuration, coverage and remaining production work. The live-data optimizer described below is not yet implemented.

## Two planning modes

Country input must be global, not limited to a launch-country shortlist. Coverage gaps belong in the result, not in an arbitrary country whitelist.

**Countries and days:** ordered country selections, days in each country, trip start date, starting/ending city or airport when known, travel party size, pace, budget and interests. A three-day stay should generally have one base rather than three hotel changes. Incoming transfers count against the destination's time allocation. Long transfers can consume a whole day or make the request infeasible; do not silently add days. Display alternative bases before applying a draft.

**Cities and dates:** preserve selected cities, their order, arrival/departure constraints, existing flight records and booked legs. Compare available connections, including access to stations/airports, check-in buffers, layovers and final transfers. Fastest minimizes door-to-door elapsed time; cheapest minimizes comparable total party cost; recommended balances both while preferring fewer transfers and reasonable departure times. Unknown prices must not be treated as zero. No ferry/train/car should be inferred merely because two points share a landmass.

Both modes generate a reviewable draft. Applying the draft is separate from saving it. Show additions and replacements; allow editing and regeneration. Editing inputs invalidates the preview. Never silently overwrite existing bookings. Keep the final itinerary editable and save the selected source snapshots with it.

## LLM-assisted planning

Use a server-side LLM to interpret a trip brief and propose candidate cities and activities. The brief includes selected countries and allocated days, dates/flexibility, starting point, total budget/currency, number of travelers, purpose, interests, pace, accommodation style, accessibility constraints if volunteered, and must-see/avoid choices. Fixed selections take precedence over model suggestions.

The model returns a strict schema: normalized preferences, candidate place identifiers, day allocations, explanations, assumptions and missing information. Validate the schema and resolve proposed places to actual geographic/provider records. A syntactically valid JSON response is not proof that the itinerary is correct.

Retrieve places, routes and cost evidence separately. Score candidates using interest fit, sourced popularity signals, cost coverage and travel burden. The model can explain or revise a candidate after validation, but ordinary application code enforces country/day constraints, timetable feasibility, budgets, booking preservation and maximum revision attempts. Never let model output execute SQL or call arbitrary URLs. Treat retrieved text as data, not instructions.

Run generation only after the user selects Generate, not on each keystroke. Use an authenticated server endpoint, per-user request limits, token limits and a global spending cap; keep keys out of Expo public environment variables. Send only the trip brief needed for planning, not friend records, account emails, private photos or unrelated past trips. Provider retention/training terms must be disclosed appropriately before launch.

Gemini is a prototype candidate because it supports structured JSON output and has free-tier options. The provider and model remain undecided; free-tier quotas and data-use terms differ from paid use. The LLM budget is separate from places/routing/flight API charges. Google OAuth credentials and the existing SerpApi key do not provide LLM access.

## Daily itinerary

- Interests text plus explicit categories: food, history, museums, nature, beaches, nightlife and family activities. Treat free text as preferences, not executable instructions.
- Select actual places from a provider or maintained catalog; retain source IDs, coordinates, retrieval time and attribution. Geographic prominence in the existing Natural Earth city catalog is not tourism popularity.
- Group nearby activities; limit the day's activity and transfer time according to pace. Include meal/rest time and spare capacity.
- Validate opening days/hours and advance reservations when data is available. Unknown opening hours or availability remain visibly unverified.
- Use timezone-aware timestamps for travel. Calendar dates alone cannot determine whether an international flight fits a same-day connection.
- Show why a draft cannot fit rather than producing an impossible schedule. Starting location is necessary to include travel to the first country; otherwise explicitly exclude it.

## Provider findings

| Provider | Fit | Access and limits | Decision |
| --- | --- | --- | --- |
| Existing SerpApi Google Flights integration | Scheduled flights, duration, quoted fare and segments | Existing server-side key; metered searches and account quota. Results are snapshots, not bookings. | Reuse, with caching, explicit search and a hard request budget. Compare all airlines for auto-planning rather than requiring the current airline filter. |
| Google Places | Attractions, relevance, review counts and opening hours | Metered; requested fields determine billing. Attribution/caching rules apply. | Strong candidate for place discovery; needs an approved API budget and separate credentials. |
| Google Routes | Driving/transit times, route geometry and some transit fares | Transit fares are available only when the entire itinerary has fare coverage; limited schedule horizon and regional coverage. | Strong candidate for routing; not a universal fare database. Validate display rights with the existing MapLibre map before integration. |
| TravelTime | Time matrices and multimodal routing | Free Basic is development/evaluation only; live commercial use requires a production agreement. | Not a free production dependency. |
| Rome2Rio | Relevant consumer product for multimodal comparisons | Historical API documentation is still discoverable; current new-account production access and terms were not verified. | Contact provider before depending on it. Do not scrape the website as a substitute. |
| Budget Your Trip | Destination/day travel budgets | Public API page was found, but current usable access, pricing, licensing and endpoint coverage could not be verified. | Worth contacting for destination spending benchmarks; not yet a selected integration. |
| Numbeo | Meal, local transport and other destination price benchmarks | Licensed API plans; cost of living is not equivalent to a visitor's complete travel budget. | Optional enrichment, not a fare or hotel quote source. |
| OpenStreetMap/Overpass | Open points of interest | No popularity ranking, uneven hours data; public instances have fair-use limits and no production SLA. | Suitable for a carefully bounded prototype or curated extracts, not an unbounded public-app backend. |
| Wikivoyage | Destination research and guide links | Reuse requires attribution and the applicable share-alike license. | Useful for editorial research; do not copy guides into the app without implementing attribution/licensing. |

## Budget model

Do not invent a country multiplier or a per-kilometer fare and call it a quote. Store currency, party size, pricing basis (per person, room, vehicle or party), source, timestamp and exclusions for each item. Track lodging by nights/rooms, food and activities by people/days, and transport per leg. Include baggage, transfers, taxes and booking fees when supplied. User allowances can fill gaps but must be labeled as user estimates. Missing prices remain missing, with a coverage indicator alongside the known subtotal. Currency conversion needs a dated exchange-rate source.

## Delivery sequence

1. Add per-stop stay dates and retain them through reorder/save/reload. Validate dates before comparison or saving.
2. Add the country/day and city/time input modes, interests, pace, party size and review/apply flow.
3. Integrate the selected places/routing providers behind a server endpoint with secret credentials, authentication, cache rules, timeouts, quotas and cancellation.
4. Add an itinerary solver against normalized provider results, with explicit unknown/infeasible states. Test short country stays, international/date-line travel, closed attractions, unavailable routes, incomplete fares and existing bookings.
5. Add costs by source and coverage. Enable cheapest only when alternatives have comparable cost coverage; explain how recommended was selected.

Free-first can use a maintained local destination catalog and user-entered budget allowances, but it cannot honestly promise live fastest/cheapest multimodal travel worldwide. A production release should make that coverage boundary explicit.

## References

- https://developers.google.com/maps/documentation/places/web-service/text-search
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/maps/documentation/routes/transit-route
- https://traveltime.com/pricing
- https://cms.rome2rio.com/documentation/1-4/search/
- https://www.budgetyourtrip.com/api/
- https://www.numbeo.com/common/api.jsp
- https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- https://en.wikivoyage.org/wiki/Wikivoyage:How_to_re-use_Wikivoyage_guides
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/pricing

# V2: Start trip and automatically collect cities

Status: planned for V2, after account creation and account-isolation verification. This document does not enable GPS or add background permissions to V1.

## Traveler flow

1. Sign in, tap **Start trip**, and choose a name (or accept an editable date-based default).
2. Explain what will be recorded and ask for location permission at that moment. Permission alone never starts tracking.
3. Show **Tracking active**, with **Pause** and **End trip** always available. A background indicator/notification should make tracking visible.
4. Add the starting city when identified. Detect later city changes and add dated stops automatically; accommodations, photos, and memories can be entered later.
5. **End trip** stops location updates, closes the final stop using the ending observation where appropriate, and opens a review screen. Users can correct dates, remove transit cities, and add missed stops.

Manual trips remain available if permission is declined. Signing out stops the device's tracking task and hides that account's locally queued records.

## Arrival and departure rules

Store UTC timestamps plus the destination's timezone, not just the phone's current date. Display the city's local arrival/departure dates, including across midnight and the international date line. The current V1 model has required date strings; V2 needs nullable departure timestamps, visit IDs, and detection status.

- Arrival: first trustworthy observation inside a city, retained while confirming that city. Do not use the later time at which confirmation finishes.
- Departure: detected exit from the previous city, when observations support it. Do not automatically equate departure from Paris with arrival in Rome hours later.
- Current stop: departure stays open until leaving or ending the trip.
- Missing observations: keep a last-seen / next-seen interval and mark the estimate for review. Do not invent an exact departure time after a flight, dead battery, disabled GPS, or killed app.
- Starting mid-trip: the first observed city is the starting record; earlier travel is not inferred.
- Repeated visits: returning to a city creates another visit, not an overwrite of its earlier dates.
- Pause/resume: record a tracking gap. Preserve the open visit where justified and request review if location changed during the gap.

Automatic dates are estimates based on available observations, and remain editable. Store whether a value is detected, estimated, or manually corrected. Never overwrite a manual correction during sync.

## City detection

GPS returns coordinates, not a dependable city identity. Use native reverse geocoding or an approved geocoding service to resolve a canonical city/locality plus country and region. Cache results and throttle requests. A single coordinate wobbling across a city boundary should not create repeated stops.

Honor the requested behavior: automatically add each confidently detected new city, including short transit visits. Confirm changes using multiple accurate observations and boundary hysteresis, preserving the first observation as arrival. Keep uncertain single fixes pending rather than inventing a city change. Mark brief passages as transit so the traveler can keep or remove them during review; do not require a ten-minute stay and silently drop short visits. Tune confirmation thresholds on real trips. Handle suburbs, airports, rural places, and missing city fields explicitly rather than assigning the nearest city blindly.

Use distance/time-based updates appropriate for a travel diary instead of continuous navigation-grade sampling. Request foreground permission first; explain and request background permission only if the traveler wants recording while the app is not on screen.

## Platforms and costs

Target iOS/Android native apps for background tracking with Expo Location and TaskManager. Expo documents OS-dependent background limits and the need for a development build for background location on iOS. A force-quit, battery policy, revoked permission, or disabled location service can interrupt recording. The UI must make tracking gaps visible.

Web can offer foreground capture while the page is active, but cannot promise continuous tracking after the browser is closed or suspended. Do not market browser tracking as equivalent to native tracking.

Receiving device GPS positions does not itself require a paid maps API. City lookup, map data, sync/storage, app distribution, and scale have separate provider limits and possible costs. Native reverse geocoding can minimize extra service costs, but must be throttled and handle failure; web needs a separately evaluated lookup source.

Source: https://docs.expo.dev/versions/v57.0.0/sdk/location/

## Privacy and sync

- All trip and visit records private to the signed-in owner under database RLS.
- Prefer storing city visits and timing evidence; retain precise raw coordinates only in a short-lived local buffer when needed for detection. Explain if a geocoder receives coordinates.
- Track only between explicit Start and Pause/End actions. No location access during onboarding or ordinary journal browsing.
- Keep offline events in encrypted, account-scoped storage, tagged with unique event IDs. Retry safely without duplicating visits or leaking one account's events to another.
- Define one recording device per active trip initially; avoid competing phones generating contradictory visits.
- Resolve concurrent edits deliberately rather than replacing an entire cloud trip with an older offline copy. V1's whole-record upsert is insufficient for that workflow.
- Support deletion of trips and their buffered location evidence. Future friend sharing must be a separate opt-in; never expose live GPS by default.

## V2 acceptance checks

Permission granted/denied/revoked; Start/Pause/Resume/End; one city for several days; city-boundary jitter; multi-city train journey; airport and flight gaps; returning to an earlier city; offline replay; duplicate/out-of-order events; timezone/date-line crossings; battery restrictions; killed app; manual date corrections; two accounts on one device; direct cross-account database requests.

# Wayfarer — travel-app

A first version of your travel journal, based on the shared **Travel App Features** conversation. “Wayfarer” is a working name.

## Run it

The project uses Expo SDK 57, React Native, TypeScript, and pnpm. The same app source targets web, iOS, and Android.

With Node.js 22.13+ and pnpm installed:

```sh
pnpm install
pnpm web
```

For the already-installed workspace, you can also run `node node_modules/expo/bin/cli start --web`. Open the address printed by Expo.

Use `pnpm start` to show the device QR code. A compatible Expo Go app or development build is needed for testing on your phone. Browser compilation is not the same as testing on a real iPhone or Android device.

## What works

- A world map with destination pins, visited country shading, zoom and directional controls.
- Multiple visits to the same city grouped in its place journal.
- Create, view, edit, and remove trips with multiple dated destinations.
- Stays, trip notes, destination memories, and up to three small photos per destination.
- Country/place/trip counts, journal cards, and search.
- Device-local saving, with sample trips clearly separated from real data.
- Optional email/password accounts and account-owned cloud records when Supabase is configured.

Add your first real trip to replace the sample view. Sample data is never uploaded or stored as your travel history. Photos are persisted as small image data URLs for this first iteration; a dedicated photo-storage service should replace this before larger galleries. Browser storage can fill up, and clearing site/app data deletes local trips. A failed save keeps the editor open with an error.

The offline city picker contains common destinations. Other places can be entered with coordinates. Map geometry is a country-level world overview, not a street map or routing service. Custom countries absent from the built-in list may have pins without country shading. Planned stops do not count as visited until their arrival date.

## Connect accounts and cloud saving

No cloud project, subscription, or secret has been created for you. These steps remain before account creation can work:

1. Create your own Supabase project.
2. Run `supabase/migrations/001_trips.sql` in its SQL editor.
3. Enable email/password authentication. Configure your website origin as the Auth Site URL. Email confirmation links return to that site; on mobile, confirm in the browser and then sign in within the app.
4. Copy `.env.example` to `.env` and set the project URL and **publishable** key from Supabase’s project settings. Never use a service-role/secret key in this app.
5. Restart Expo. The account screen now offers sign-in and account creation.

Row-level security restricts cloud reads and writes to the authenticated owner. Local trips and cloud trips remain separate; there is no automatic upload of your local travel history. Cloud saves currently require connectivity. The backend migration and account flows must be integration-tested against your project, including two-user isolation, before a public release.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```

The tests cover dates, overlaps, coordinates, repeated visits, and trip duration. `pnpm build` creates the browser release in `dist/`. Native bundles can be checked with `pnpm exec expo export --platform ios --platform android --output-dir dist-native`; real-device validation still remains.

## GitHub, browser, and App Store

This directory is a Git repository. A GitHub repository and remote still need to be created/connected. Once you have the repository URL:

```sh
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

GitHub stores the source and runs checks; it does not automatically publish an iPhone app. A web host serves `dist/` for the browser version. An Expo/EAS release builds and signs the native version for TestFlight/App Store or Google Play, with your developer accounts. Signing, bundle identifiers, app icons, privacy disclosures, account deletion, password recovery, and real-device QA need a release pass before store submission. No App Store release or public website has been made.

## Code map

- `src/Main.tsx`: world view, journal, trip detail, and account screen.
- `src/TripEditor.tsx`: destination, date, stay, note, and photo editing.
- `src/WorldMap.tsx`: geographic map and pins.
- `src/model.ts`: shared trip/stop/place types and validation.
- `src/storage.ts`: device and Supabase persistence.
- `src/ui.tsx`: visual styles and reusable controls.
- `supabase/migrations/001_trips.sql`: owner-isolated database table.
- `ASSETS.md`: image and map attribution.

Next product phase: review this UI together, connect accounts, then future-trip transportation options. Friends, route optimization, imports, and collaboration are later phases from the original conversation.

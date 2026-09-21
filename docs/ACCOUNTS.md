# Free account setup and privacy

Status (September 12, 2026): local `.env` configured for the user-created Supabase project `evzymkqaeopozmdikmmo`. Both migrations were applied together in one transaction through its SQL editor. The Auth API accepted the publishable key, and a live anonymous trip read was denied with permission error 42501. Email signup requires confirmation; Google sign-in is disabled. The account system has not passed two-account live isolation testing yet. No paid service was created.

## Recommended free starting point

Use Supabase Free for authentication and the database. As checked September 12, 2026, the plan includes 50,000 monthly active users, a 500 MB database, 1 GB file storage, and limited bandwidth. Free projects can pause after a week of inactivity. These are separate quotas; the user allowance does not mean we can store 50,000 users' photo collections for free.

Source: https://supabase.com/pricing

Start with Google sign-in if avoiding email delivery costs is the priority. Supabase supports it, and it avoids running verification/password-reset email delivery for Google-only accounts. The app now has a Google button and PKCE callback flow, gated by `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` after provider configuration. Native OAuth requires a development build with the `wayfarer` scheme, not Expo Go. Do not enable unrelated Google data scopes; basic identity is sufficient.

Email/password authentication is also supported on the free plan, but confirmation and password-reset messages need a production mail service. Supabase's built-in sender only delivers to project-team addresses and is not intended for public signup. Free SMTP tiers exist, but a provider can require a verified domain, which may cost money. Keep email confirmation enabled; do not turn it off to work around delivery failures.

Sources:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-smtp

## What protects one traveler from another

Supabase authenticates the login and supplies a signed session. The database checks that session's user ID against the owner of each trip for reads, inserts, updates, and deletes. The app's own filtering is a convenience, not the security boundary. A guessed trip ID, changed user_id, direct API request, or bulk query must not bypass those rules.

`001_trips.sql` defines these owner-only row-level security policies. `002_account_isolation.sql` also removes public/anonymous privileges, limits authenticated privileges, forces RLS for ordinary table-owner access, and supplies an authenticated owner default. Administrative roles can still bypass RLS. This is protection between customers, not end-to-end encryption against the service operator.

The app receives only the project URL and publishable key. Never put a secret/service-role key, database password, or Google OAuth client secret in EXPO_PUBLIC variables, GitHub, frontend code, or a chat message. Google client secrets go in Supabase's provider settings. Use MFA on the project-owner accounts.

Source: https://supabase.com/docs/guides/database/postgres/row-level-security

Photos currently live inside the private trip record as small image data URLs. When moving them to file storage, use a private bucket with owner-scoped storage policies and short-lived signed URLs; do not make the bucket public. Apply the same ownership rules to future stops, GPS events, and any profile table.

## Setup order

1. Sign in to Supabase and create an organization/project on the Free plan. Keep the database password in your password manager.
2. Run `001_trips.sql`, then `002_account_isolation.sql`, in the project's SQL editor. An existing project that already has 001 should run only 002.
3. Copy `.env.example` to `.env` locally. Set the project URL and publishable key. Neither value is a database password.
4. Configure the chosen authentication provider. For Google, create the OAuth client, copy the exact callback URL shown by Supabase, and store the client secret only in Supabase. For email, configure SMTP, verification, recovery, rate limits, and abuse protection.
5. Use exact allowed redirect URLs for local development and the eventual HTTPS website/mobile callback. Avoid broad production wildcards.
6. Implement and verify the selected login flow. Then run the isolation test below against a disposable test project with two test accounts.
7. Before public release, verify native secure session storage on physical devices, web script/XSS protections, sign-out/account-switch cleanup, recovery, account/data deletion, private photo access, and backup/restore. Native sessions now use Expo SecureStore and remove the prototype's plaintext session (existing native users must sign in again). Storage errors propagate without a plaintext fallback; large session payloads may exceed platform limits and need device testing. Web sessions remain in browser storage.

## September 13 implementation and live checks

- Implemented password-reset request and recovery password form, Google OAuth with PKCE, native code callback validation/deduplication, and local-device sign-out.
- Clear open trip/editor/search/password state when account identity changes; ignore load/save/delete results that finish after that change.
- Configured the live Site URL as `http://localhost:8081/` and exact allowed redirects `http://localhost:8081/` and `wayfarer://auth/callback`. Replace the Site URL with the real HTTPS site before launch. Recovery links must open in the same browser/app that requested them because PKCE stores its verifier there.
- Executed `scripts/check-rls.sql` in the live SQL editor: owner read, denied cross-account reads/updates/deletes, denied spoofed insert/reassignment, and denied anonymous read all passed. Temporary users and trip fixtures were rolled back. This exercises database roles, not real signed JWTs or the full Auth/API path.
- Google credentials, production email delivery, real two-account API testing, native device testing, and account deletion remain release gates. GPS remains V2.
- Validation: TypeScript and seven automated tests passed; web/iOS/Android production bundles exported successfully. Browser account modal and empty-email recovery validation passed with no captured console errors. No real verification/reset emails were sent and no Google login was completed.

## Google setup handoff

1. In Google Cloud, choose/create the app's project and configure Google Auth Platform branding/audience. Use `Veyfar` as the app name, your own support email, and only basic identity scopes. If the OAuth app is in testing, add your intended test Google accounts.
2. Create a Web application OAuth client. Set its authorized redirect URI to `https://evzymkqaeopozmdikmmo.supabase.co/auth/v1/callback` (Supabase's callback, distinct from the app redirects above).
3. In Supabase → Authentication → Sign In / Providers → Google, enter the client ID and client secret directly, enable Google, and save. Do not put the secret in `.env`, Git, or chat.
4. Set `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` locally and restart Expo. Then verify login, cancellation, reload, logout, and separate users' trips. Keep the button disabled until the provider is ready.

Sources: https://supabase.com/docs/guides/auth/social-login/auth-google and https://docs.expo.dev/versions/v57.0.0/sdk/securestore/

## Direct API isolation test

`scripts/check-account-isolation.mjs` uses two existing disposable accounts, an anonymous client, and only the publishable key. It creates uniquely named test trip records, checks allowed owner access, then attempts cross-account reads, writes, deletes, and owner spoofing. It checks records again as the legitimate owners and cleans up the test records. It never uses an admin key or deletes user accounts.

Run only against a test project with email/password test users confirmed through the Supabase dashboard or normal verification flow. Set the following environment variables in the terminal; do not put passwords in source or command arguments:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ISOLATION_TEST_EMAIL_A
ISOLATION_TEST_PASSWORD_A
ISOLATION_TEST_EMAIL_B
ISOLATION_TEST_PASSWORD_B
ISOLATION_TEST_ALLOW_WRITES=yes
```

Then run `node scripts/check-account-isolation.mjs`. The explicit write flag prevents accidental execution. A failure is a release blocker; rerun after fixing policies. This test validates the database/API boundary, not every device/session/UI security concern.

Local guest trips are intentionally device-local and are not protected by a cloud login. On a shared device, someone with access to the browser/app profile can read them. Guest history is not automatically uploaded into an account.

## Google accounts and friends — September 20 implementation

The UI includes Google account creation/sign-in and an account Friends panel. Google remains disabled until the OAuth client is configured in Supabase; no successful Google login is claimed yet. Migration `003_friends.sql` is prepared and locally tested, but has not yet been applied to the live project.

- Google automatically creates an account on first login. Only basic identity scopes are needed; the app does not read Gmail or contacts.
- Add a friend using their exact verified Gmail address. Requests appear inside the app; no invitation email is sent. The recipient must accept before either person can see the other's visited locations. Either person can cancel, decline or remove a connection.
- My world has **Only me** and **Me + friends** controls: gold own pins, purple friend pins. Shared pins refresh while enabled, at most once every 30 seconds. Removal revokes database access immediately; an already displayed remote copy can remain until its next refresh. Previously seen locations cannot be made unseen.
- The database exposes only names and visited city/country coordinates to accepted friends. It excludes future arrivals and never grants friends access to private trip records, notes, photos, stays or flight bookings. The map toggle controls viewing, not sharing consent; remove a friend to revoke sharing.
- Requests require a confirmed account and are limited to ten per hour. Exact-address matching is not a browsable directory, but outgoing request listings reveal successful matches. Gmail dots and plus aliases are not canonicalized; use the address attached to the account.
- Account switching clears shared pins and remounts the planner. Upcoming plans are stored locally under separate account IDs, with existing guest plans kept in the guest library. Browser/device storage is not encryption or a boundary against someone who controls that device. Planned trips are not yet synchronized across devices.

### Remaining setup

1. Apply `supabase/migrations/003_friends.sql` once, after 001 and 002. It creates relationship tables and restricted functions; existing trip owner policies remain intact.
2. Create a Google Web OAuth client using the callback `https://evzymkqaeopozmdikmmo.supabase.co/auth/v1/callback`. Enter its ID and secret directly in Supabase's Google provider settings.
3. Add the exact app redirect `http://127.0.0.1:8081/` alongside the existing localhost/native redirects. Add the eventual HTTPS production origin before release.
4. After the provider is enabled, set `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` in the ignored local `.env`, restart Expo, and test two real accounts: login, reload, logout, request, accept, map toggle, removal and account switching.

### Local validation

`node --test tests/*.test.mjs` covers input and shared-data parsing. For isolated SQL checks, install `@electric-sql/pglite` in `.expo/rls-test` (an ignored temporary directory), then run `node scripts/check-friends-local.mjs`. This creates an in-memory database with a simulated Auth schema and runs all three migrations. Pending requests, outsider and anonymous denial, recipient-only acceptance, direct mutation denial, accepted pin projection, private-trip isolation, future-date exclusion, removal and request limits pass. This does not replace real Supabase Auth/API testing.

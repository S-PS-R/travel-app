# Gemini auto-planner (local prototype)

## Private configuration

1. Create a key in https://aistudio.google.com/apikey for a project shown as **Free tier**. Do not enable Cloud Billing for this prototype. API code cannot determine or enforce your Google billing tier; a billing-enabled key can incur charges even with a model that offers a free tier.
2. Open `.env.gemini.local` in VS Code and set `GEMINI_API_KEY=your_key_here`. This file is ignored by Git. Never put the key in an `EXPO_PUBLIC_*` variable, browser settings, chat, or a trip record.
3. Restart from the project folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 stop
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 start
```

Visit http://127.0.0.1:8081/ and open Plan a trip → Auto-plan a trip. With an empty route, add countries and days. With cities already selected, enter days for each city. Add interests, party size, budget/currency and pace, then Generate itinerary preview. Applying a preview changes the draft; Save plan persists it through the existing plan storage.

If the file does not exist, create it with just `GEMINI_API_KEY=` and fill in the value. For isolated backend restarts use `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\planner-host.ps1 stop` followed by the same command with `start`.

## What is implemented

- Server-side Gemini `gemini-3.8-flash` structured JSON generation, bounded input/output and a 60-second provider timeout. No automatic retries, tool calls, grounding charges or paid-provider fallback.
- Country or selected-city stays, up to eight blocks, 14 days per block and 30 days per request. Returned cities must resolve to the existing geographic catalog and preserve block order and exact day allocations. Journey date spans are checked when both dates are supplied.
- Preview before applying. Existing-route mode retains stop IDs, modes and booking details. Country mode applies to an empty route. Saved AI suggestions survive normal plan save/reload. Route changes discard the now-stale itinerary.
- Requests are explicit, not per keystroke. Trip preferences are sent to Google, with a free-tier data-use notice. Account identities, friend records, photos and booking details are not included.
- One generation at a time, at least 15 seconds between requests, and 20 attempted generations per UTC day across this local host. The counter persists across restarts in `.expo/gemini-usage.json`; failures count too. These are app limits, not a promise of Google's quota. Provider quota exhaustion stops generation with a clear error.

## Current limits

This is an **AI suggestion prototype**, not a verified travel optimizer. Activities, current popularity, affordability, opening hours, routes and fares are not grounded in live data. Budgets influence suggestions but are not calculated quotes. Country coverage follows the existing city catalog, and some countries have multiple name variants. Transport defaults on newly generated map stops still need manual review. Calendar scheduling by city, real fare comparison and fastest/cheapest modes remain future work.

The backend binds only to `127.0.0.1:8083`, checks local Host/Origin and JSON request size, and supports the local website only. It intentionally has no public deployment URL. Before public launch, move generation behind authenticated server hosting, persistent per-user/global quota enforcement, appropriate provider privacy terms and abuse controls. Do not expose this local server by changing its bind address or forwarding its port.

Customer subscriptions/payment collection are not implemented. Exceeding quota never starts charging customers or opts into Google billing. Monetization requires a separate explicit release.

## Validation

`node --test tests/*.test.mjs` covers input/model validation, day constraints, persistence parsing, quota errors, bounded API requests, cross-origin rejection and concurrent-request limiting with mocked provider responses. A real-key end-to-end generation still needs to be tested after private configuration.

References: https://ai.google.dev/gemini-api/docs/pricing and https://ai.google.dev/api/generate-content

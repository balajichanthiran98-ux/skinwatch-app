# SkinWatch — runnable project

Two folders:
- `backend/` — Node.js server that holds your Google API key, calls the
  Weather + Air Quality APIs, and runs the rules engine
  (see `skinwatch-rules-engine-spec.md` for what's evidence-based vs. not).
- `frontend/` — plain HTML/CSS/JS app, no build step. Talks to the backend.

## What's real vs. placeholder in this version

- **Real**: Weather, Air Quality, UV rules, humidity/AQI/retinol advice,
  routine step matching, profile data (stored in your browser).
- **Placeholder / not wired yet**:
  - The 7-day forecast endpoint's field mapping is a best-effort guess —
    verify it against Google's actual `forecast/days:lookup` response
    (see the `NOTE` comments in `backend/server.js`) and adjust if fields
    come back as `null`.
  - City search on the Home/Profile screen does not resolve a typed city
    name to coordinates yet — it needs the Google Geocoding API wired in.
    "Use current location" works via your browser's GPS.
  - The **Check tab intentionally shows no skin-quality score** — that
    was fabricated placeholder data in earlier mockups. It now just does
    a photo upload/preview and says analysis is coming once your
    computer-vision model exists.
  - Past-weather history starts **empty** and builds up only as the app
    runs day to day, since Google's API doesn't provide historical data.

## Running it in Google Antigravity (or any terminal)

### 1. Start the backend

```
cd backend
npm install
cp .env.example .env
```

Open `.env` and paste your real Google API key in place of the
placeholder. Then:

```
npm start
```

You should see `SkinWatch backend running at http://localhost:3001`.

### 2. Open the frontend

Just open `frontend/index.html` directly in a browser tab, or serve it
with any static server (e.g. Antigravity's preview, or `npx serve frontend`).
It's plain HTML/CSS/JS — no build step needed.

The frontend expects the backend at `http://localhost:3001` (see the
`BACKEND_URL` constant at the top of `frontend/app.js` — change it if you
deploy the backend elsewhere).

If the backend isn't running, the frontend shows a banner telling you so
instead of failing silently.

## Before this becomes real user-facing advice

Read `skinwatch-rules-engine-spec.md` (shared earlier) — it marks exactly
which rules match a published standard (UV) versus which need a
dermatologist's review before shipping (humidity/AQI thresholds, and
especially the retinol/UV interaction rule).

## Natural next steps

1. Verify the forecast endpoint's field mapping against a live Google response
2. Wire up the Geocoding API for real city search
3. Add a real database (routine/profile currently live only in the
   browser's localStorage — they'll be lost if the user clears browser data
   or switches devices)
4. Add user accounts/auth once there's a database
5. Build and integrate the trained computer-vision model for the Check tab,
   matching the JSON data contract in the rules engine spec

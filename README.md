# Currency Converter — Boutique Hotel Front Desk Tool

**Live demo:** https://ankan226.github.io/currency-converter/

**Repository:** https://github.com/Ankan226/currency-converter

A lightweight, dependency-free currency converter built for hotel front
desk staff to replace a manual paper/Excel process. Plain HTML, CSS, and
JavaScript — no frameworks, no build step, no API key required.

---

## 1. Project Structure

```
currency-converter/
├── index.html          
├── css/
│   └── styles.css      
├── js/
│   ├── utils.js          
│   ├── api.js              
│   └── app.js                
├── .eslintrc.json      
├── .gitignore
└── README.md
```

No `package.json`, no `node_modules`. Everything runs directly in the
browser and is deployed as static files via GitHub Pages.

---

## 2. How It Works

### Data source
Rates come from [open.er-api.com](https://www.exchangerate-api.com/docs/free)
(`https://open.er-api.com/v6/latest/{BASE}`), a free, keyless endpoint.
No secrets, no `.env` file needed — satisfies the "no hardcoded API
keys" item in the Definition of Done.

### Interaction model — Convert is the single trigger
Amount, From, and To can all be changed freely without anything
happening — the conversion only runs when the user presses **Convert**
(or hits **Enter**, or presses the **⇅ Swap** button, which converts
immediately using the swapped pair). This was a deliberate design
decision: an earlier version auto-calculated on every keystroke, which
made the Convert button feel redundant and produced noisy telemetry.
Requiring an explicit action:
- Gives the Convert button a real purpose
- Gives validation one predictable moment to run (on submit)
- Keeps the telemetry log meaningful — one log per real user action,
  not one per keystroke

A default conversion (1 USD → EUR) is still shown automatically after
the first successful rate load, so the screen is never empty on first
paint.

### Resilience on bad connections (the "Unhappy Path")
This was flagged explicitly in the ticket ("make sure it doesn't crash
on spotty internet"), so the app is built around it:

- **Timeout:** every request aborts after 8 seconds via `AbortController`
  instead of hanging indefinitely.
- **Retry with backoff:** transient failures are retried up to 2 times
  before giving up.
- **In-memory cache:** successful responses are cached for 10 minutes
  per base currency, so repeated conversions don't re-hit the network
  every time.
- **Stale fallback:** if a refresh fails but we have *any* previous
  data, the app keeps working and shows a visible banner: *"Showing
  rates from [time] — connection issue"* with a one-tap retry.
- **True empty state:** only if there is no cached data at all does
  the app show the "No data found" screen with a retry button —
  never a blank page.
- **Live connectivity indicator:** the status strip at the top listens
  to the browser's `online` / `offline` events and updates instantly.

> Note: caching is intentionally **in-memory only** (a plain JS
> object), not `localStorage`. This keeps the app free of any silent
> dependency on browser storage being available or enabled on
> front-desk kiosk machines. Cached data resets on page reload — a
> reasonable tradeoff for a tool that will be open all shift.

> Also note: `[hidden] { display: none !important; }` is set explicitly
> in `styles.css`. Without it, any element using the native `hidden`
> attribute but also carrying a class with its own `display` value
> (e.g. `.banner { display: flex }`) would stay visible even when
> JavaScript sets `hidden = true` — author CSS otherwise overrides the
> browser's default `[hidden]` rule. This was caught and fixed during
> QA (the stale-data banner and loading indicator were sticking on
> screen).

### Validation (Invalid Inputs)
- Amount must be numeric, greater than 0, and under a sane upper
  bound. Invalid entries block submission, highlight the field in
  red (`aria-invalid="true"`), and show an inline message via
  `role="alert"`.
- Currency selects are validated against the currently loaded rate
  set before a conversion runs.
- Validation runs on submit (Convert/Enter), not on every keystroke.

### Accessibility (a11y)
- Every input has a real, associated `<label>`.
- Errors and results are announced via `aria-live` / `role="alert"`
  regions, so screen reader users hear updates without moving focus.
- All interactive elements are native `<button>`, `<select>`, and
  `<input>` elements — fully keyboard reachable and operable with
  Enter/Space/Tab, no custom widgets that need extra ARIA scaffolding.
- Visible focus outlines are preserved (never `outline: none`).
- `prefers-reduced-motion` is respected — the loading spinner
  animation is disabled for users who request reduced motion.
- Verified against a Lighthouse Accessibility audit (see Testing
  section) targeting a 100 score.

### Security
- `sanitizeText()` in `utils.js` escapes `& < > " '` before any
  value is stored in state or written to the DOM.
- The UI uses `textContent` / `createElement`, not `innerHTML`, for
  every dynamically inserted value (currency codes, results), so
  there is no code path where a string becomes executable markup.
- No API keys, tokens, or PII exist anywhere in the source.

### Telemetry Simulation
Every completed Convert (click or Enter) and every Swap logs:
```
[Analytics] User interacted with Currency Converter
```
to the browser console — one log per real user action, matching the
NFR spec. It deliberately does **not** fire on typing or on dropdown
changes, since those aren't completed actions on their own. Open
DevTools → Console to verify.

### Design system
A monochromatic corporate palette (grays, black, white) defined as
CSS variables in `:root`, with **red reserved exclusively for
validation errors**, per the design handoff. Spacing follows strict
8/16/32/48px steps. Typography pairs a serif display face (a small
nod to the "boutique hotel" brief) with a system sans for UI text
and a monospace face for numbers/currency codes — all system fonts,
so nothing needs to be downloaded over a slow connection.

---

## 3. Running It Locally

No build step. Any static file server works:

```bash
git clone https://github.com/Ankan226/currency-converter.git
cd currency-converter
python3 -m http.server 8080
# then open http://localhost:8080
```

Or use the VS Code "Live Server" extension, or `npx serve .`.

Opening `index.html` directly via `file://` also works in most cases,
since the app only needs outbound internet access to reach the rates
API — no backend of its own.

---

## 5. Deployment

Currently deployed via **GitHub Pages**, using GitHub Actions as the
build/deploy source:

- Repo → Settings → Pages → Source: **GitHub Actions**
- Live URL: **https://ankan226.github.io/currency-converter/**
- Every push to `main` redeploys automatically.

No environment variables or secrets are required, since the rates API
is public and keyless.

**Alternative — Vercel**, if a non-GitHub-Pages link is ever needed:
```bash
npm install -g vercel
cd currency-converter
vercel --prod

# Context Define — SaaS conversion

Turns the standalone "bring your own OpenAI key" Chrome extension into a
SaaS: your backend holds the OpenAI key, users sign up/log in, and usage is
capped per account instead of being paid for directly by each user.

## Layout

```
backend/    Spring Boot API — auth (JWT), usage limits, OpenAI proxy
frontend/   React + Vite — landing page, signup/login, usage dashboard
extension/  The Chrome extension, rewired to call backend/ instead of OpenAI
```

## How it fits together

1. User signs up on the **frontend** (or in the **extension** popup) → hits
   `POST /api/auth/register` on the **backend** → gets a JWT back.
2. The extension stores that JWT in `chrome.storage.local`.
3. Double/triple-clicking a word still works exactly as before, except
   `background.js` now calls `POST {API_BASE_URL}/api/define` with
   `Authorization: Bearer <jwt>` instead of calling OpenAI directly.
4. The backend checks/increments a lifetime usage counter per user, then calls
   OpenAI with **its own** server-side key (`OPENAI_API_KEY` env var) and
   returns the definition.
5. The dashboard (frontend) shows the same account's usage via
   `GET /api/usage`.

The user's OpenAI key is never in the browser anymore — only your server has it.

## 1. Run the backend

Requires JDK 17+ and Maven. No local database install is needed — the
`local` profile runs against an in-memory H2 database (production on Render
still runs PostgreSQL — see the deploy section below).

Config is split by Spring profile:

- **`application.yml`** — shared settings, and picks which profile is active
  via `SPRING_PROFILES_ACTIVE` (defaults to `local` if unset).
- **`application-local.yml`** — active by default. Uses an in-memory H2
  database (reset on every restart — signed-up users won't persist across
  runs), a dev-only JWT secret, and CORS open to `http://localhost:5173`, so
  a fresh checkout runs with **zero env vars required** except
  `OPENAI_API_KEY`. Browse the data at `http://localhost:8080/h2-console`
  while the app is running (JDBC URL `jdbc:h2:mem:contextdefine`, user `sa`,
  empty password).
- **`application-prod.yml`** — used when `SPRING_PROFILES_ACTIVE=prod` (this
  is what `render.yaml` sets), and targets **PostgreSQL** since Render's
  Blueprint only provisions managed Postgres. No fallbacks — if `JWT_SECRET`,
  `CORS_ALLOWED_ORIGINS`, or any `DB_*` var is missing, the app refuses to
  start instead of silently running with the local profile's dev secret.

For local dev, just set the OpenAI key and run:

```bash
cd backend
export OPENAI_API_KEY=sk-...           # your server-side key

mvn spring-boot:run
```

Everything else (DB, JWT secret, CORS origin, usage limit) uses
`application-local.yml`'s defaults — no setup required. If you'd rather test
against a real Postgres instance instead of H2, switch profiles with
`export SPRING_PROFILES_ACTIVE=prod` (then every prod-required var below
becomes mandatory):

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=contextdefine
export DB_USER=contextdefine
export DB_PASSWORD=contextdefine
export JWT_SECRET=$(openssl rand -base64 48)
export CORS_ALLOWED_ORIGINS=http://localhost:5173,chrome-extension://<your-extension-id>
export FREE_LIMIT=20
```

(Requires Maven installed locally — this project doesn't include the Maven
wrapper. If you'd rather not install Maven, `docker build -t context-define-backend backend`
then run that image with the same env vars via `-e`.)

The API listens on `http://localhost:8080`. Tables are created automatically
(`ddl-auto: update`) on first run.

**Note on `CORS_ALLOWED_ORIGINS`:** the extension's popup makes requests from
a `chrome-extension://<id>` origin. That ID is only assigned once you load
the extension (Chrome DevTools → Extensions → "Details" shows it after
loading unpacked). Add it to `CORS_ALLOWED_ORIGINS` and restart the backend
once you know it. `background.js`'s calls are not subject to CORS (service
workers aren't a browsing context in the same way), but the popup's direct
`fetch()` calls are.

## 2. Run the frontend

Requires Node 18+.

```bash
cd frontend
cp .env.example .env    # points at http://localhost:8080 by default
npm install
npm run dev
```

Opens on `http://localhost:5173` — landing page, `/signup`, `/login`,
`/dashboard`.

## 3. Load the extension

1. `chrome://extensions` → enable Developer Mode → "Load unpacked" → select
   the `extension/` folder.
2. Add real PNG icons at `extension/icons/icon16.png`, `icon48.png`,
   `icon128.png` (carried over from your original extension) — Chrome
   requires the files referenced in `manifest.json` to exist.
3. Click the toolbar icon, log in with the account you created on the
   frontend (or sign up directly from the popup, which opens the dashboard's
   signup page).
4. Double or triple click a word on any page — same panel UI as before.

`extension/config.js` holds `API_BASE_URL` and `DASHBOARD_URL`. Update both
when you deploy the backend/frontend, and update `manifest.json`'s
`host_permissions` to match the production API URL.

## 4. Deploy backend + frontend to Render

`render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec)
that provisions all three pieces Render needs to host this: the Postgres
database, the backend (built from `backend/Dockerfile`), and the frontend
(static build of `frontend/`). AWS isn't needed for any of this — Render
manages the Postgres instance, TLS certs, and the container build for you.

1. Push this project to a GitHub (or GitLab) repo — Render deploys from a
   connected repo, not a local directory. (This directory isn't a git repo
   yet: `git init`, commit, then push to a new remote.)
2. In the Render dashboard: **New → Blueprint**, point it at the repo. Render
   reads `render.yaml` and shows you the three resources it's about to
   create (`context-define-db`, `context-define-backend`,
   `context-define-frontend`) — confirm and deploy.
3. `OPENAI_API_KEY` and `CORS_ALLOWED_ORIGINS` are marked `sync: false` in
   `render.yaml`, meaning Render won't set them for you (so the OpenAI key
   never ends up in a file you might commit). Set both manually under the
   backend service's **Environment** tab:
   - `OPENAI_API_KEY` → your real key.
   - `CORS_ALLOWED_ORIGINS` → `https://<your-frontend>.onrender.com,chrome-extension://<your-extension-id>`
     (the frontend URL is visible once that service deploys; the extension
     ID only exists once you've loaded/published the extension — you'll add
     it after step 5 below and click "Manual Deploy" to restart the backend
     with the updated value).
4. Set `VITE_API_BASE_URL` on the frontend service to the backend's Render
   URL (e.g. `https://context-define-backend.onrender.com`), then trigger a
   redeploy of the frontend — Vite bakes env vars in at build time, so this
   has to happen *after* you know the backend's URL, not before.
5. Update `extension/config.js` (`API_BASE_URL`, `DASHBOARD_URL`) and
   `extension/manifest.json`'s `host_permissions` to the real Render URLs,
   then reload the unpacked extension (or re-zip and re-upload if already
   published) so it talks to production instead of `localhost`.

`render.yaml`'s free-tier database and free-tier web services are fine for
testing this end-to-end, but Render's free Postgres instances expire after
90 days and free web services spin down when idle (a real cold-start delay
on the first request) — move to a paid plan before pointing real users at it.

## 5. Distributing the extension

**For now**, the landing page's "Download extension" button links to
`frontend/public/context-define-extension.zip` — a pre-built zip of the
`extension/` folder — and walks the user through loading it manually via
`chrome://extensions` → Developer mode → Load unpacked. Regenerate that zip
whenever `extension/` changes (no build step does this automatically):

```powershell
$temp = "$env:TEMP\context-define-extension"
Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $temp | Out-Null
Copy-Item -Path "extension\*" -Destination $temp -Recurse
Compress-Archive -Path $temp -DestinationPath "frontend\public\context-define-extension.zip" -Force
```

**Once ready for real distribution**, publish to the Chrome Web Store instead
— users get Chrome's native one-click install instead of a manual zip:

1. Zip the `extension/` folder (with real icons in place and `config.js`
   pointed at production).
2. Register as a Chrome Web Store developer at the
   [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time $5 fee).
3. Upload the zip, fill in the listing (screenshots, description, privacy
   policy — required since this extension sends page content to your
   backend), and submit for review. Review is typically hours to a few days.
4. Once published, swap `Landing.jsx`'s `EXTENSION_ZIP_URL` for the real
   Chrome Web Store listing URL (and drop the manual-install steps) and
   redeploy the frontend.

## What changed vs. the original extension

- **`options.html`/`options.js` (API key + model picker) were removed.**
  There's no per-user OpenAI key anymore — the model is fixed server-side
  (`OPENAI_MODEL` env var, defaults to `gpt-4o-mini`).
- **`popup.html`/`popup.js`** now show a login form instead of an
  "API key set ✓" status check.
- **`background.js`** calls your backend instead of `api.openai.com`, and
  reads a JWT from `chrome.storage.local` instead of an API key from
  `chrome.storage.sync`.
- **`content.js`** only changed its error-state copy/button (points at your
  dashboard instead of `chrome.runtime.openOptionsPage()`); the word
  detection, context extraction, and panel UI are untouched.
- **`manifest.json`** dropped the broad `<all_urls>` and
  `api.openai.com` host permissions in favor of just your backend's origin —
  smaller attack surface, since the browser no longer talks to OpenAI at all.

## Billing (Razorpay)

Stripe requires an invite to onboard from India, so billing runs on Razorpay
instead — same shape (a `plan` field on `User`, a hosted payment page, a
webhook that flips the plan), different provider. `User.plan` is `FREE` or
`PRO`; `FREE_LIMIT` (default 20) is a lifetime cap that only applies to `FREE`
users — `UsageService` skips the check entirely for `PRO`.

Flow: the dashboard's "Upgrade to Pro" button calls `POST /api/billing/checkout`,
which creates a Razorpay Subscription and returns its hosted `short_url`
(opened in a new tab). Razorpay doesn't reliably redirect back afterward, so
the dashboard instead polls `/api/usage` until the webhook confirms the plan
flipped. `POST /api/billing/webhook` (public, protected by signature
verification instead of a JWT) handles `subscription.activated` /
`subscription.charged` (→ `PRO`) and `subscription.cancelled` /
`subscription.completed` / `subscription.halted` (→ `FREE`). "Cancel
subscription" calls `POST /api/billing/cancel`, which cancels at Razorpay and
waits for the same webhook to confirm.

Required env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_ID` (create the Plan once via the
Razorpay Dashboard — Subscriptions → Plans), `FRONTEND_URL`. All empty by
default locally (`/api/billing/*` returns a clear error until set), required
with no fallback in prod. Razorpay has no CLI-based local webhook forwarding
like Stripe's — use ngrok (or similar) to expose `localhost:8765` and
register that URL + a secret of your choosing under Dashboard → Settings →
Webhooks (Test Mode), subscribed to the events listed above.

## Next steps (not built yet)

Also worth doing before real users hit this:

- Move off Render's free tier (see the deploy section above) before pointing
  real users at it — free web services cold-start on every idle request.
- Rotate `JWT_SECRET` to a real random value in production (never the
  `application.yml` default).
- Add password-reset flow (currently there's only register/login).
- Add integration tests for `AuthController`/`DefineController` before
  shipping changes to the usage-limit logic — it's the part most likely to
  have an off-by-one that either leaks free usage or wrongly locks users out.

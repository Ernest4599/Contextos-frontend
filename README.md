# ContextOS — Frontend

## Files

```
project/
├── index.html             Landing page
├── home.html               Dashboard (sidebar, import buttons, Quick Prompt link)
├── quick-prompt.html        Standalone Overview / Decisions / Task form → generates a prompt without importing anything
├── import.html               Import screen (Share Link / Paste / Upload)
├── processing.html            Animated progress screen — visual pacing only; the REAL work happens via a backend fetch() call triggered underneath it
├── context-package.html        Output screen (generated prompt, character count, Copy button)
├── package.html                  ⚠️ Still a hardcoded FAKE example ("AI Memory OS" sample project) — not real data
├── packages.html                  REAL package history — every prompt you've generated, saved locally, tap to view/copy again
├── mainsetting.html                Settings (Theme is static/decorative — no light theme exists; Packages, Recovery Key, Clear Data, About are all real)
├── restore-license.html             Real license restore screen — calls the backend's /api/license/restore
├── auth.html                         Sign In / Create Account (Supabase) + link an existing license to your account
├── style.css                          ONE shared stylesheet for every page
├── script.js                           ONE shared script for every page
└── README.md                           This file
```

Every `.html` page links to the same `style.css` and `script.js` — there is only ever one CSS file and one JS file for the whole project. Do not create per-page stylesheets or scripts; add new rules/functions to the existing two files instead.

## User flow (currently wired)

```
index.html    →(Get Started Free)→   home.html
home.html      →(Share Link / Paste / Upload)→   import.html
import.html     →(Analyze Conversation)→   processing.html
processing.html   →(real backend call, not fake)→   context-package.html
context-package.html →(Back)→   home.html

home.html → quick-prompt.html (sidebar) → (Generate) → context-package.html
home.html → packages.html (sidebar "Packages" OR Settings → Packages) → tap any item → context-package.html
home.html → mainsetting.html (sidebar "Settings")
mainsetting.html → restore-license.html (Recovery Key row)
mainsetting.html → packages.html (Packages row)
Sidebar avatar row (any page with sidebar) → auth.html
```

## Fixed: Packages sidebar link

Previously, both "Projects" and "Packages" in the sidebar linked to the same fake `package.html`. This is now fixed — "Packages" correctly links to `packages.html` (the real history list). "Projects" still links to `package.html` (the fake example) since there's no real multi-project concept built yet — that remains a known limitation, not a bug.

## Backend connection (real, live)

`import.html` saves whatever you paste/upload into the browser's `localStorage`. `processing.html` runs a JS-only progress animation (ring + checklist) purely for visual pacing — underneath it, a real `fetch()` call sends your data to the live backend at `https://contextos-apc7.onrender.com`, which:
- redacts detected secrets (API keys, passwords, etc.) before processing
- sends the cleaned conversation to Claude for extraction
- checks/deducts a credit (tied to your device or license)
- returns a real generated prompt

All 4 places in `script.js` that reference the backend URL are kept in sync — search for `contextos-apc7.onrender.com` to find every instance if it ever needs to change (e.g. if you redeploy to a different Render URL).

## Login (optional, via Supabase)

`auth.html` handles Sign In / Create Account directly against Supabase — this frontend never sees or stores a password. Two placeholder constants near the top of `script.js` need your real Supabase project values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key-here';
```

Login is entirely optional — every import/license feature works without ever signing in. Logging in currently only lets you link an existing license to your account for visibility; it does not yet sync Projects/Packages across devices.

The sidebar's avatar row shows "Guest / Tap to sign in" or your real email + "Signed in", depending on actual Supabase session state — this is live, not decorative.

## Pages referenced but not yet built

- `trust.html` (Trust Center) — linked from `home.html`'s footer ("No Conversation Storage" note), file doesn't exist yet. Clicking it will 404 — expected at this stage.

## Local-only data (never sent to any server)

- `contextos_device_id` — random ID identifying this device to the backend for credits/licensing, not tied to any personal info
- `contextos_packages` — your real Package history (see `packages.html`)
- `contextos_output` / `contextos_input` / `contextos_start_time` — transient state passed between screens during generation

"Clear All Data" in Settings wipes all of the above, and also signs you out of Supabase if you're logged in.

## Notes for future edits

- Colors, fonts, and spacing are controlled by CSS variables at the top of `style.css` (`--bg`, `--blue`, `--text`, etc.) — change once, applies everywhere.
- The sidebar markup (`<nav id="sidebar">...`) is duplicated inside both `home.html` and `quick-prompt.html` — there's no templating system, so any sidebar change (like the "Projects"/"Packages" bug above) needs to be fixed in every file that has one, individually.
- Logo is always inline SVG (not an image file), so it recolors/scales cleanly without needing an image asset.
- "Offline Mode" language was removed from the entire app (it was false — every real feature requires a network call to the backend). Replaced with true claims like "No Conversation Storage," which reflects what the backend actually does (raw conversations are processed and discarded, never persisted).

## Bug fixed: real backend errors were silently hidden

The Import flow's `fetch()` call never checked whether the backend's response was actually successful (`res.ok`) — it just assumed any response meant success. This meant if the backend returned a real error (e.g. no AI provider credits, no license credits remaining, a database issue), the app would silently show "No prompt returned by the backend" instead of the actual, useful error message — or worse, could behave unpredictably.

Fixed to match the pattern Quick Prompt already used correctly: check `res.ok` first, and if the backend sent a real error, show that exact message on the output screen instead of masking it. Going forward, real backend problems (like a billing/credit issue with the AI provider) will show up clearly instead of looking like a generic failure.

## This session's fixes — a big batch

**1. Fixed the shared Project State bug (real, serious).** The frontend never sent a `projectId` at all, so every user's imports were silently merging into one hardcoded `'default'` project shared globally. Now `projectId` is tied to `getDeviceFingerprint()`, so each device gets its own separate Project State. Note: this is a per-device fix, not full multi-project support — a device still only has ONE ongoing project, not multiple named ones.

**2. Fixed "Share Link" import** — it was sending the raw pasted URL as if it were the conversation text. Now it actually calls the backend's `/api/fetch-link` endpoint first, which safely fetches and extracts plain text from the link, before sending that real content for analysis.

**3. Consolidated `BACKEND_URL`** — was declared 4 separate times across the file (risk of drifting out of sync). Now one shared constant at the top.

**4. Built the missing Purchase flow, end to end:**
- `purchase.html` — plan card (₦20,000 Starter), "Pay with Paystack" button, calls `/api/license/purchase/init`, redirects to Paystack's hosted checkout
- `purchase-success.html` — after Paystack redirects back, verifies the payment via `/api/license/purchase/verify`, then shows the License ID + Recovery Key clearly with a "save this now" warning and a Copy button — this is a one-time display, matching the original license spec
- Both the Import flow and Quick Prompt now detect a `402` (limit exceeded) response specifically and redirect to `purchase.html?reason=limit` instead of showing it as regular generated output

**5. Built Forgot Password / Reset Password:**
- `auth.html` — added a "Forgot Password?" button, triggers Supabase's password reset email
- New `reset-password.html` — where the emailed link lands, lets the user set a new password via `supabase.auth.updateUser()`

**6. Login open questions — decisions made:**
- Email confirmation before sign-in: kept Supabase's default (required) — no change needed
- Forgot Password: built (see above)
- What happens to a linked license if the account is deleted: **left unimplemented, on purpose** — this needs Supabase's Admin API or a webhook to detect account deletion, which is a genuinely separate, bigger piece of work. Right now, if an account is deleted, its linked license simply stays as-is (still active on its device) — just no longer visible from any account. Flagging this as an accepted gap, not a silent one.

## Still not done, worth knowing

- No general "Get Pro" entry point exists yet outside the limit-exceeded redirect — e.g. no button in Settings to voluntarily upgrade anytime. Only reachable via hitting the free limit right now.
- `FRONTEND_URL` needs to be set on the backend (Render) once this frontend has a real public URL, or Paystack's redirect-back step won't know where to send users.

## New: license.html — solves two gaps at once

- **Credit top-up now purchasable** — previously the ₦7,000/100-credit backend endpoint existed with zero UI. Now: Settings → My License shows current plan + credits remaining, and Pro users see a "Buy 100 More Credits" button that actually works.
- **Voluntary "Get Pro" entry point now exists** — previously the only way to reach `purchase.html` was hitting the free limit. Now free-tier users see a "Get Pro" button right on this same screen, anytime.

Reachable via Settings → "My License" (new row, added between Packages and Recovery Key).

## New: Mini plan on purchase.html

Two plan cards now, both with strikethrough "was" pricing:
- **Mini** — ~~₦14,000~~ ₦7,000 (15 imports)
- **Starter** — ~~₦55,000~~ ₦20,000 (100 imports)

`buyMiniBtn` and `buyProBtn` share one reusable `startPurchase(plan, btn, label)` function instead of duplicated logic — reduces risk of the two buttons drifting out of sync if the purchase flow changes later.

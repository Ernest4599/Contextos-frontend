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

## ⚠️ Known bug, not yet fixed

In the sidebar, **both "Projects" and "Packages" link to the same file: `package.html`** (the fake example). This was flagged during development but never actually corrected. `packages.html` (plural, the real history list) is currently only reachable via Settings, or by generating a new package — not from the sidebar's "Packages" link, which still opens the fake one. Fix this by changing the sidebar's "Packages" `href` from `package.html` to `packages.html` across every page with a sidebar (`home.html`, `quick-prompt.html`).

"Projects" doesn't have a real destination at all yet — there's no concept of multiple named projects built anywhere, frontend or backend. It currently just opens the same fake example as a placeholder.

## Backend connection (real, not fake)

`import.html` saves whatever you paste/upload into the browser's `localStorage`. `processing.html` runs a JS-only progress animation (ring + checklist) purely for visual pacing — underneath it, a real `fetch()` call sends your data to a live backend, which:
- redacts detected secrets (API keys, passwords, etc.) before processing
- sends the cleaned conversation to Claude for extraction
- checks/deducts a credit (tied to your device or license)
- returns a real generated prompt

```javascript
const BACKEND_URL = 'https://contextos-backend.onrender.com'; // ⚠️ placeholder — replace with your real Render URL
fetch(`${BACKEND_URL}/api/analyze`, { ... })
```

**This same placeholder URL appears in multiple places in `script.js` and in `auth.html` and `restore-license.html` — all of them need to be updated to your real backend URL, not just one.** Search the codebase for `contextos-backend.onrender.com` to find every instance.

Until every instance is updated, requests will fail and the app will show a friendly error message instead of a real result — that's the `.catch()` block doing its job, not a bug.

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

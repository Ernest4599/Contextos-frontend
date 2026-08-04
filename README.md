# ContextOS — Prototype

## Files

```
project/
├── index.html             Landing page
├── home.html               Dashboard (sidebar, import buttons)
├── package.html            Project detail (tabs: Overview / Decisions / Tasks / Files)
├── import.html              Import screen (Share Link / Paste / Upload)
├── processing.html          Fake "analyzing" screen (animated progress ring)
├── context-package.html     Output screen (generated prompt, Copy button)
├── style.css                 ONE shared stylesheet for all pages
├── script.js                 ONE shared script for all pages
└── README.md                  This file
```

Every `.html` page links to the same `style.css` and `script.js` — there is
only ever one CSS file and one JS file for the whole project. Do not create
per-page stylesheets or scripts; add new rules/functions to the existing
two files instead.

## User flow (currently wired)

```
index.html  →(Get Started Free)→  home.html
home.html   →(Share Link / Paste / Upload)→  import.html
import.html →(Analyze Conversation)→  processing.html
processing.html →(auto, ~5s)→  context-package.html
context-package.html →(Back)→  home.html

home.html → package.html (via sidebar "Projects" / "Packages")
package.html → context-package.html (via "Generate Context Package")
```

## Backend connection

`import.html` saves whatever you paste/upload into the browser's
`localStorage`. `processing.html` runs a JS-only progress animation
(ring + checklist) purely for visual pacing, then sends the saved text
to a real backend:

```javascript
const BACKEND_URL = 'https://contextos-backend.onrender.com';
fetch(`${BACKEND_URL}/api/analyze`, { ... })
```

**Before this works, open `script.js` and replace `BACKEND_URL` with
your actual deployed Render URL** (see the separate `contextos-backend`
project/zip for how to deploy it). Until you do that, the fetch will
fail and `context-package.html` will show a friendly error message
instead of a real result — that's the `.catch()` block doing its job,
not a bug.

This means: refreshing `context-package.html` directly (without going
through the flow) shows a placeholder message, since there's nothing in
`localStorage` yet.

## Pages referenced but not yet built

These are linked from the sidebar / footer but don't have files yet:
- `mainsetting.html` (Settings)
- `trust.html` (Trust Center)
- `privacy.html`, `terms.html`

Clicking those links will currently 404 until those files are created —
that's expected at this stage.

## Notes for future edits

- Colors, fonts, and spacing are controlled by CSS variables at the top of
  `style.css` (`--bg`, `--blue`, `--text`, etc.) — change once, applies
  everywhere.
- The sidebar markup (`<nav id="sidebar">...`) is duplicated inside
  `home.html`. If you add the sidebar to a new page, copy that whole block
  in — there's no templating system here, so it has to be pasted per page.
- Logo is always inline SVG (not an image file), so it recolors/scales
  cleanly without needing an image asset.

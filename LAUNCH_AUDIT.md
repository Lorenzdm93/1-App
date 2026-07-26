# 1% — Launch Review (v0.13.0)

Reviewed as if approving for public release. Findings categorized; everything
in **Must Fix** and **Should Fix** that is solvable in code is implemented in
this version. Items marked ⏳ are blocked by environment or need product
decisions.

## Must Fix — all implemented ✅

- **Installability & PWA completeness** — manifest now carries `id`, `lang`,
  `orientation`, `categories`, `display_override`, `launch_handler`, maskable +
  any-size SVG icons. iOS gets a real `apple-touch-icon` and **seven
  device-matched splash screens**. Dual `theme-color` (light/dark),
  `color-scheme`, OG tags.
- **Update handling** — the previous worker skipped waiting silently
  (mid-session asset swaps). Now: new worker **waits**, the app shows an
  "Update ready — Restart" pill, the person picks the moment; version checks
  re-run on foreground.
- **Offline shell** — install-time precache of `./`, manifest, core icons;
  navigation falls back to cached shell; assets cache-first with hashed names.
- **White-flash cold start** — inline, dependency-free boot screen in
  `index.html`, brand-colored per scheme, replaced at mount.
- **Zoom lockout (WCAG 1.4.4)** — `user-scalable=no` removed; pinch zoom works
  again. Input font-size 16px keeps iOS from auto-zooming forms.
- **Silent crash risk** — global `error`/`unhandledrejection` handlers +
  ErrorBoundaries; storage already falls back to memory.
- **Dialog semantics** — Sheets are `role="dialog" aria-modal`, take focus on
  open, restore it on close, close on Escape.
- **Code splitting** — every module screen (+ its settings block) is its own
  chunk via `lazy()`; shell screens split; React vendored to a long-lived
  chunk. Eager path: **~61 KB gzip JS**.

## Should Fix — all implemented ✅

- Skip-to-content link + `main` landmark + focus-visible outlines everywhere.
- Toasts are a polite live region; rings are `role="img"` with spoken labels.
- Press feedback on every button (scale), native overscroll containment,
  focused inputs scroll clear of the keyboard, small close buttons grew to
  ≥36–40px hit areas.
- Reduced-motion is honored globally, including the boot spinner.
- Offline/online status toasts (once, quiet).
- Real brand mark (geometric ring + percent), regenerated at every size from
  one SVG source — favicon to 512 maskable to splash.

## Nice to Have — ⏳ needs environment or assets

- **Self-hosted fonts** (currently Google Fonts with `display=swap`; offline
  falls back to system stack). Sandbox cannot download font files. *Do at
  launch: `fontsource` packages in CI.*
- **Manifest `screenshots`** for richer install sheets — needs real device
  captures.
- **vite-plugin-pwa / Workbox** precache manifest of hashed assets (current
  runtime caching covers it after first visit). Registry-blocked here; one
  dependency + 10 lines in CI.
- **Lighthouse run in CI** — no browser binary available in this sandbox; the
  build was verified by full esbuild bundling + server-render of every route
  and every module screen (see below).

## Future Improvements

- Cloud sync (architecture already local-first with single migrate path).
- Push notifications for phase alerts (currently in-tab Notification API).
- Haptics via `navigator.vibrate` patterns on more surfaces.
- E2E suite (Playwright) once a browser can be provisioned in CI.
- Per-module deep-link share cards.

## Verification performed in this environment

- **Full production bundle** with esbuild (splitting, minified): clean.
  Chunks: 7 module screens (13–52 KB), 5 shell screens, vendor React.
  Eager JS ~61 KB gzip.
- **Server-render smoke** of all 13 routes and **all 7 module screens + all 7
  settings blocks executed directly** — zero throws.
- Static serve of `dist/` verified: 200s for index, JS, CSS, manifest, sw,
  icons, splash.
- Comment-aware import/hook audits, JSX tag balance, class coverage: clean.

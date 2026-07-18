<p align="center">
  <img src="banner.svg" alt="1% — Get one percent better every day" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-e8622c?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/react-18-1b1e24?style=flat-square" alt="react">
  <img src="https://img.shields.io/badge/build-vite-1b1e24?style=flat-square" alt="vite">
  <img src="https://img.shields.io/badge/pwa-installable-1b1e24?style=flat-square" alt="pwa">
  <img src="https://img.shields.io/badge/license-MIT-1b1e24?style=flat-square" alt="license">
</p>

# 1%

**The operating system for getting one percent better every day.**

One app, many instruments. Enable only the modules you want; everything feeds one dashboard, one streak, one metric stream. Offline-first, no account, your data never leaves the device.

## Modules

| Module | What it does | Quick action from Today |
|---|---|---|
| **GHISA** | Workout tracker — Hevy-style planned sets you check off, templates, set types, per-exercise analytics, weekly stats | Start / resume a workout |
| **CADENCE** | Habits done right — build *and* quit habits, weekly frequency targets (3×/week…), Month backfill, Year grids | Check habits off directly on the dashboard |
| **GROVE** | Deep-focus timer — finish a session and a tree grows; your forest is your history | Focus 25 min in one tap |
| **RESPIRO** | Breathwork — geometric tracers, five protocols + custom, breath-hold test, your own Spotify audio | Begin a session in one tap |
| **CALIBER** | Strength gauge — e1RM, population percentile, target-level planner, per-lift test history | — |

**New in v0.4 — modules become small apps**

- **Module tab bars.** Inside a module, the bottom bar becomes *that module's* — GHISA gets **Train / History / Stats**, CADENCE **Today / Month / Year**, RESPIRO **Breathe / Tools**, GROVE **Focus / Forest**. Leave the module and the 1% bar returns. This is now a platform contract: any module can declare tabs and grow to full depth.
- **GHISA, the real workflow.** Starting a template now creates the planned set rows (target sets finally *do* something). Each row is editable in place — previous session shown alongside, tap the number to cycle Normal/Warmup/Drop/Failure, tap ✓ to complete (an empty row adopts last time's numbers). Only completed sets count and get saved. Editing a template opens *that template* — the blank-editor bug is fixed.
- **CADENCE with intent.** Every build habit has a **days-per-week target** (1–7). Rows got a full redesign: coloured tile with a tick, this-week dot strip, a weekly progress ring, streaks in days (daily habits) or weeks (frequency habits). Habits are **editable** now — name, cue, colour, emoji, target.
- **GROVE.** Pick 25/50/90 minutes (or ±5 anywhere from 5–180), a tree grows while you focus and joins your forest when the timer completes — even if the app was closed when it finished (timestamp math). Give up and it withers: nothing logged. Birch under 30 min, pine to an hour, oak beyond.

**New in v0.3 — the modules at full power**

- **GHISA** — reusable **templates** (seeded Push / Pull / Legs, plus your own) you start a workout from in one tap; **tap any set to change its type** — Normal · Warmup · Drop · Failure — with warmups correctly excluded from volume, working-set counts and PRs; a three-tab module (**Train / History / Stats**) with an 8-week volume chart, most-trained ranking, and a **per-exercise overview** showing best set, an e1RM sparkline and recent sessions.
- **CADENCE** — **Today / Month / Year**. The month is a completion heatmap where **tapping any past day fills in what you did**; the year is a GitHub-style grid per habit, auto-scrolled to today. Habits are now **Build or Quit** — quit habits count *days clean* with a no-judgment slip log — each with its own colour and an optional cue.
- **CALIBER** — a **percentile** read ("stronger than ~X%"), and a **target planner**: pick a level and it tells you *the reps you need at your current weight*, or the weight at your current reps, to get there. Every test feeds a **history chart** per lift.
- **RESPIRO** — the **geometric tracer** is back: a square for Box, a triangle for three-phase patterns, a proportional ring for the rest, with the dot travelling the edges as you breathe. Plus a **Custom** pattern, a **breath-hold test** with personal best, and **Spotify** — paste any track or playlist and it plays inline.

**From v0.2** — dark/light/system theme; a first-run intro where you pick modules (goal chips like *Strength & Gym* pre-select bundles, everything changeable later); per-module accent theming inside a module.

The **Today** screen carries the signature *1% ring*: a hairline day-track with a literal 1%-of-circumference ember notch, and one inner segment per enabled module that lights up once the module has contributed to the day. Any logged action anywhere claims the day and feeds the streak.

## Deploy to GitHub Pages (web UI only, ~5 minutes, once)

1. Create a new **public** repository, e.g. `one-percent`.
2. **Add file → Upload files** and drag in everything from this folder **except** the `.github` folder (hidden folders don't always drag from Finder). Commit.
3. **Add file → Create new file**, name it exactly `.github/workflows/deploy.yml`, paste the contents of that file from this package, commit.
4. **Settings → Pages → Source: GitHub Actions.**
5. Wait ~90 seconds for the Action to finish. The app is live at
   `https://<your-username>.github.io/<repo-name>/`

Every future commit rebuilds and republishes automatically — you keep uploading changed files through the web UI exactly as before, the Action does the rest. On the phone, open the URL and **Add to Home Screen**: it installs as a standalone app and works offline after the first visit.

## Local development (optional)

```bash
npm install
npm run dev        # dev server
npm run typecheck  # strict TS pass
npm run build      # production build into dist/
```

Type errors never block deployment — the build strips types (Vite/esbuild); `typecheck` is a quality gate you run when you want it.

## Architecture

```
src/
├── core/        platform: types, storage, store, events, router, settings
├── design/      tokens.css + app.css (CSS custom properties, no framework)
├── app/         shell: App, TabBar, shared UI kit (sheet, ring, chips…)
├── screens/     Today · Modules · Settings
└── modules/     ghisa/ · cadence/ · respiro/ · caliber/
```

**The module contract.** Every module exports one `ModuleDefinition`: id, name, tagline, accent, `Screen`, `Widget` (dashboard card, may be interactive), optional `QuickActions`, and a storage schema version with a migration hook. Modules never import each other. Adding a module = one folder + one line in `core/registry.ts`.

**Two platform seams.**
- *Storage* — each module owns the namespace `op:v1:<id>`, payloads wrapped as `{ v, data }` and migrated on load; `localStorage` behind try/catch with an in-memory fallback.
- *Metric events* — modules append `{ module, kind, ts, value, unit, meta }` to one unified log. The ring, streaks and weekly stats read only this stream; so will cross-module insights and sync later.

**Deliberate choices.** Hash routing (refresh-safe on Pages, no rewrite hacks). Timestamp-derived timers everywhere (immune to background-tab throttling). Custom sheet modals, never native dialogs. Toast layer hard-wired `pointer-events: none`. Decimal-comma input accepted (`82,5` = `82.5`). Runtime dependencies: React and nothing else.

## Data

Everything lives on-device. **Settings → Export** produces one JSON backup covering every module; **Import** restores it. No telemetry, no network calls beyond Google Fonts.

## Roadmap

- **v0.5** — SANA (pending its spec) plus Ora (fasting) / Minim (mood); first cross-module insights on the shared event stream.
- **v0.6** — optional end-to-end Firebase sync (the event log is already sync-shaped).
- **Later** — Capacitor wrap for the App Store; reminders/notifications (needs the native shell).

### Earlier roadmap notes

- **v0.3** — full GHISA depth: templates, per-exercise progression charts, e1RM handoff to CALIBER
- **v0.4** — Ora (fasting) and Minim (mood) as modules; insights v1 on the event stream
- **v0.5** — optional Firebase sync (the event log and namespaced docs are already sync-shaped)
- **later** — Capacitor wrap for App Store distribution, module marketplace layout

## License

[MIT](LICENSE) — do whatever you like, no warranty.

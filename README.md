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
| **SANA** | Stacks of supplements & medicines — dial, per-stack take-all, history heatmap, reference library | Doses left today |
| **CALIBER** | Strength meter — e1RM, level bar with your target marker, per-lift trends, standards tables | — |

**New in v0.6 — SANA to the prototype, percentile CALIBER, module Settings everywhere**

- **SANA, the real one.** Rebuilt to the recovered prototype architecture. **Stacks** are regimens (Daily Foundation, Sport, Sleep…) with emoji + colour, each carrying **compounds** (name, chemical name, dose, form glyph, time slot, the italic advice line). Follow any combination per day; shared compounds appear **once** on Today with membership dots. The Today tab: day pager, tick-ringed **dial** (X/13 · % complete), per-stack progress rows with one-tap take-all, per-slot TAKE ALL, ⓘ info sheets. **History**: day streak, best run, 30-day rate, week grid, month calendar, 26-week consistency heatmap. **Library**: a 14-entry reference shelf (what it is, usual slot, cautions) that adds straight into a stack. v1 data migrates automatically.
- **CALIBER, percentile-native.** The prototype's model: profile with **height (BMI)** and **"aim for top X%"**; lifts are now Bench · Squat · Deadlift · **Pull-up** (weighted — math on system load, reported as added kg). Big Epley estimate with **Brzycki cross-check** and the confidence dot; a percentile axis with **YOU** and a dashed **AIM** marker; progress-to-goal bar with kg-to-go; reverse math ("at your weight → N reps"); a Goals 2×2 card; Standards as a percentile table (5th/25th/50th/**aim**/95th) with your cleared cells lit. Old level-targets migrate to the matching percentile.
- **GHISA, prototype train & live.** Train: big "Start empty workout", template cards with exercise preview line, wide **Start**, pencil edit, and a ⋯ menu with **Duplicate**/Delete. Live: header shows elapsed + sets · volume, completed rows keep a warm tint with the wide orange check pill, and the rest bar gained **−15 / +15 / Skip**.
- **Settings, everywhere.** Every module's tab bar now ends in a gear — a platform tab with the module's about info and a scoped **Erase [module] data** (storage + its events, nothing else). Modules can add their own sections on top.

**New in v0.5 — insight everywhere, premium everywhere**

- **SANA.** Rebuilt for the platform: items carry dose label, supplement/medicine type, time-of-day slots, weekdays, with-food tag, optional stock. Today groups by Morning/Midday/Evening/Night with one-tap ticks and an adherence ring; the Stack manages refills (+30/+90) with a days-left countdown and low-stock warnings; Insights shows 7/30-day adherence, perfect-day streak, and per-item bars. Strictly an organisational aid — it never suggests what or how much.
- **GHISA Insights.** Stats became Insights: Week/Month/Year with the right breakdown for each (sessions → weeks → months), six aggregates (workouts, volume, sets, reps, minutes, avg length) each showing ▲/▼ vs the previous period — the 1%-better logic made visible — plus a verbose coaching card (progressive overload, program patience, core lifts vs accessories). Completing a set now pops an accent tick with a row flash.
- **RESPIRO, the instrument again.** Practice tab rebuilt to the prototype: "Continue with…" hero, protocol cards with glyph, pattern and category tag, grouped Down-shift / Steady & sharpen / Energise. Seven protocols including Extended Exhale, Nadi Shodhana and Wim Hof rounds — the latter with a hard safety warning. Every protocol has a long-form explanation on its stage. New Progress tab (sessions, minutes, practice streak, best hold, 14-day chart) and Sound tab: phase-cue ticks and completion bell (synthesised, on-device) with real switches, Spotify (persists), plus local-file playback for your own recordings.
- **CALIBER grown up.** Three tabs. The gauge is now a horizontal level bar with threshold ticks and a marker at your chosen target ("top X %"). A confidence dot grades the estimate by rep count — formulas agree at low reps and drift past ten. Standards tab prints every level's kg for *your* bodyweight (PR-cleared cells fill in) and explains Epley & Brzycki with a live example.
- **CADENCE.** Page back from Today (‹ ›) to fill missed days honestly — events carry the real date. Month and Year now open with insight boxes: avg completion, check-ins, most consistent habit, active days, best streak, habits tracked.
- **Every module now has its own icon tab bar**, and the shared design system got the prototype treatment: pill buttons with ink-on-accent, gradient cards with top highlights, true switches, spaced-serif module wordmarks with the accent letter.

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

- **v0.7** — Ora (fasting) and Minim (mood) modules; the full-app premium reskin pass; cross-module insights on the event stream.
- **v0.8** — optional end-to-end Firebase sync (the event log is already sync-shaped).
- **Later** — Capacitor wrap for the App Store; reminders/notifications (needs the native shell).

### Earlier roadmap notes

- **v0.3** — full GHISA depth: templates, per-exercise progression charts, e1RM handoff to CALIBER
- **v0.4** — Ora (fasting) and Minim (mood) as modules; insights v1 on the event stream
- **v0.5** — optional Firebase sync (the event log and namespaced docs are already sync-shaped)
- **later** — Capacitor wrap for App Store distribution, module marketplace layout

## License

[MIT](LICENSE) — do whatever you like, no warranty.

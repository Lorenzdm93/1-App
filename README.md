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

**New in v0.9.5 — exercise intelligence, and the round closed**

- **GHISA: per-exercise insight pages, with movement.** Tap any exercise name in a live session: a full sheet with a **two-pose animated figure** of the lift (inline SVG morphs — bench, squat, deadlift, pull-up, OHP, row; offline, zero assets), then heaviest weight, best e1RM, best set, sessions, total reps, **PR count and PR history**, session-volume and e1RM trend lines, and for the big four a **percentile strength bar** with the level name, computed against your CALIBER profile. (An existing overview sheet was already routed there — it now serves the rich version.)
- **GHISA: choose after Start.** "Start workout" opens a chooser sheet — Empty, or any template with its preview — instead of every card shouting Start. Template cards keep pencil and ⋯ for management. Set rows finally **fill the width**: inputs own the flexible space, prev is a small whisper column, header on identical rails.
- **Sheets always have an exit** — a ✕ in every bottom sheet, and sheets cap at 88% of the viewport with internal scroll, so the backdrop is never the only way out.
- **Next-move pills are 24 px squircles** — the icon, nothing else (a v0.7 `span { flex: 1 }` was inflating them).
- **GROVE**: preset chips hold their place permanently (dimmed when not applicable) so the dial never jumps; Start is width-capped so the round buttons stay round; and **Arrange** joined Shuffle — tap one plant, tap another, they swap, with the choice persisting in a layout map.
- **CADENCE: mood.** A five-face strip above the day's habits (1–5, tap to set, tap again to clear, retro-settable via the pager) — and the first **cross-signal**: when recent mood runs low while training volume dips, Today says so, gently. The personalised advice engine builds on this next.
- **CALIBER's gold pops** (`#edb54a`) — the audit you asked for found it exactly as you suspected; and long taglines/descriptions now wrap inside the screen instead of vanishing.
- Deferred to open the next session: the **sample-data loader/remover** and the **RESPIRO Spotify library** — both need the tagged-data discipline done properly.

**New in v0.9.4 — mobile P0, and the round finished**

- **You are no longer stuck in modules.** The app had no notch awareness: on phones the header (and the back button with it) rendered under the status bar. Fixed with `viewport-fit=cover` + safe-area padding top and bottom; the back button grew to a 44 px target; the nav bar slimmed (24 px icons, tighter padding) so content gets the room back.
- **GHISA**: the crossed-dumbbell mark redrawn solid and chunky (both arms full weight, plates and collars); DELETE now appears **only while swiping** (it was bleeding through — a missing background on the sliding layer); the column header rides the same grid as the rows, so SET/PREV/KG/REPS finally line up. **The Today widget lists your templates** — tap one and the workout starts *from that template*, not empty.
- **Next moves** carry each module's **own icon** in a tiny tinted squircle — the module's face, not its name shouted.
- **RESPIRO**: phases now carry **per-phase instructions** — Nadi Shodhana became the full six-phase round ("Inhale left — thumb closes the RIGHT nostril" … "Exhale left"), 4·7·8 explains the mouth whoosh, box breathing traces its corners — and because the curve is generated from the phases, **every protocol now draws its own distinct shape** (nadi's double peak, the sigh's two-step rise, the box's flat top and bottom).
- **SANA**: tap a stack → **only its doses are listed** (your original ask restored — I over-corrected last round), and every stack gained **active days**: seven weekday chips in the editor; Sport on Mon/Wed/Fri simply doesn't appear on Tuesday, and the week's adherence math follows automatically. "Any N days a week" (flexible) is designed but deferred — it needs its own adherence semantics done honestly.
- **CADENCE**: the prototype's **Quick start** grid in New habit (ten build presets, eight quit presets — tap to prefill), and **Log slip is now one tap** — no confirm sheet; the streak resets, a toast says so, the record stays honest. The slip button wears the prototype's red-outline pill.

**Deferred by agreement to the next sessions** (proper builds, not squeezes): GHISA exercise pages with two-frame movement animations + per-exercise stats (heaviest, e1RM trend, best sets, PRs, percentile level) — including a licensing check on the open exercise-image datasets; RESPIRO's multi-track Spotify library with the docked player (full-length playback requires the browser to be logged into Spotify — an embed limitation no code can bypass); and the sample-data loader/remover in Settings, built on tagged data so removal is surgical.

**New in v0.9.3 — the response round**

- **Nav, docked.** The bar returns to full screen width, fixed to the bottom edge (rounded top corners, blurred, nothing showing behind), slightly shorter, with 26 px icons evenly distributed and a small accent underline for the active tab — **which now takes the module's color**, in every module.
- **GHISA.** The orange pops again (`#f5701d` — the muting was mine, the popping is yours). Set rows rebuilt on a fixed grid: square set-number badge, centered inputs, properly spaced check, the × no longer overlapping — and **swipe a row left to delete the set**. Crossed-dumbbell iconography stays.
- **RESPIRO, the prototype flow.** Tapping a protocol opens the **pre-start sheet** — full description, duration chips (1/2/3/5/10 min), Begin — the deliberate pause before the exercise. The stage now draws **the pattern itself**: the protocol's breath curve (built from each phase's lung-fill scale), a glowing dot traveling it with the traveled portion highlighted in the protocol's color, phase name in serif beneath, and the bottom bar showing elapsed · cycle · −remaining. Sessions **auto-end at the chosen duration** and close with the **Session saved sheet** (name · minutes · cycles · streak).
- **SANA: highlight, not hide.** Tapping a stack now lights up its compounds in the full list (stack-colored ring) and dims the rest — tap again to clear. And the **library grew to 36 entries** — ashwagandha (with its cycling advice), rhodiola, theanine, caffeine, zinc, K2, selenium, iodine, collagen, glycine, taurine, beta-alanine, citrulline, whey, NAC, CoQ10, curcumin, berberine, electrolytes, probiotics, psyllium and more, each with dose ranges and honest cautions.
- **GROVE.** Breaks are **light blue** — dial arc, digits tint, and mode pill — focus stays warm amber; and by your ruling **breaks grow nothing**: no flowers, no ferns, the forest is focus-only (short sessions still grow shrubs from 1 minute of honest work… well, from any completed focus session under 10 minutes).
- **ORA** shows living advice under the running dial — the current stage's physiology line ("Digestion is underway…") in the stage's color, changing as you cross each threshold.
- **Uniform rings.** The dashed "idle" state read as broken — every ring now has a solid quiet track; "—" in the center is the only idle signal.
- Settings icon unified (the same gear in the main nav and every module); intro sheets now resurface after 90 days away; next-moves became a light hint block with tinted micro-tags instead of a card impersonating a module.

**New in v0.9.2 — the details round**

- **Navigation fixed and grown up.** The floating pill is now truly centered and can never overflow (the v0.9.1 bar inherited a stray `right: 0` — off-center *and* wide). Tabs are properly sized: 24 px icons, readable labels, real touch targets; module bars scroll horizontally when five tabs won't fit.
- **First-visit welcome sheets, platform-wide.** Every module now greets you once (prototype-style): what it does in two honest paragraphs, plus the medical disclaimer where one belongs (SANA, ORA). Stored per module; never shown again.
- **The prototype icon family.** GHISA's crossed dumbbells, SANA's tilted capsule mark with the calendar-check / layers / framed-bars / open-book tabs, CADENCE's waveform, ORA's stopwatch, RESPIRO's breath-waves — redrawn from the prototype screenshots.
- **SANA: tap a stack, see its doses.** Tapping a stack row on Today filters the slot lists to that stack only (outlined in its color), with "show all stacks" one tap away — exactly the prototype's promise line.
- **GROVE: the prototype instrument.** The dial rebuilt at 340-scale with the layered bezel (gradient rim, radial face, inset shadow rings), ticks inside the rim, and the thin glowing amber arc riding just inside them — recovered from the prototype's own markup.
- Next-move module pills shrunk to true badges.

**New in v0.9.1 — shapes, not finish**

- **The gradient ring gauge is now the platform's hero element.** A shared `Ring` component — two-stop gradient synthesized from any accent, rounded caps, soft glow, sweep-in on mount, dashed idle track. Deployed: Today's hero is the week score as a big ring with a Coaching line under it; below it, **a ring per module** (the Bevel home-row pattern) replaces the invisible thin meters — tap any ring to enter its module. The 1% screen opens on a 196 px ring. ORA's live arc and GROVE's dial joined the gradient family.
- **Borders retired, tonally.** Sub-surfaces inside cards (stack rows, protocol cards, stat tiles, tasks, milestones…) are now borderless raised surfaces floating on soft shadow — in light theme, pure-white cards on cool `#f3f4f6` with Bevel's visible shadow depth. Hairlines survive only as focus/selection states.
- **An accent wash** crowns every screen — a fixed radial tint of the current module's color bleeding from the top, so entering GHISA *feels* ember and ORA *feels* steel, the way Bevel's detail pages carry their metric's color field.
- Stat numbers now carry their accent color; the light theme was rebuilt into the flagship finish (flip it in Settings → instant).

**New in v0.9 — the reskin: medical-grade, Bevel-school**

- **A rebuilt token system.** Near-black depth (`#0a0b0d`), soft ambient card shadows instead of border contrast, generous radii (20–26 px), a disciplined Inter type scale — and the serif display voice kept only where it earns it: hero numerals and screen titles. Module accents survive as identity but at lower volume, harmonised across the set.
- **A semantic state layer.** `--good / --mid / --low` — muted green, amber, orange — now say *how it's going* everywhere: the week bar, won weeks, day dots, streak heat, confidence dots, goal badges. Green means going well; module colors mean *which instrument*. The two jobs are finally separate.
- **Floating pill navigation** with backdrop blur — both the main bar and every module's tab bar — labels always visible, active state tinted, sitting above the content like hardware.
- **Charts, Bevel-style**: smooth Catmull-Rom curves with a soft gradient underlay, a single emphasized last point, thinner quieter bars, tiny axis labels.
- **Voice**: letter-spaced ALL-CAPS micro-labels retired from section headers in favour of calm sentence case; caps survive only at caption size. Cards rise in with a short spring; buttons compress on press; every motion respects `prefers-reduced-motion`.
- **One consistent icon family** — the whole set normalised to a 1.6 stroke with round caps, nav icons redrawn.

**New in v0.8 — ORA joins the platform**

- **ORA — fasting, hour by hour.** The full prototype, integrated: a dual-tone dial (fasting arc in steel blue, eating window in amber, live glowing progress), Begin fast with "already fasting? set your start time" (overnight-aware), and the verbose schedule — an **eating Window** that derives the fast around when you actually eat (midnight-safe), a **custom length**, and the daily rhythms 14:10 → OMAD, each with its honest description. **Body** is the stage timeline (Fed → Extended renewal) with Now/Tip/Care callouts and a pulsing glow on wherever you are right now. **Progress** carries streaks, goal-hit rate, longest/average, total hours, recent-fast bars with the goal line, a 17-week consistency heatmap, weight logging with trend, hydration glasses, and ten milestones. **Log** lists every fast, deletable, with its event cleaned up too. Ending early is logged without shame — it's data. The medical disclaimer lives in ORA's settings.
- **In the 1% engine** ORA scores as **completion**: the mean goal-completion of the week's finished fasts. Deliberately *not* growth — fasting is the one metric where ratcheting "more hours" would be wrong by design; the target is the target.
- Platform: `removeEvent(id)` joins the core event API (deleting a fast removes its metric event).

**New in v0.7.1 — the engine gets its own room**

- **The 1% screen.** The engine is now a destination (`#/one`), not a settings card: tap the score on Today and it opens — the big number with the glow bar to the "1% better" mark, weeks won / compounded / streak, the full week-by-week ledger chart, a **module-by-module breakdown** with per-row bars and honest sub-lines ("sits out", "at your ceiling", "tested and held"), the **rate picker with its yearly translation** (0.5% ≈ +30%/yr · 1% ≈ +68%/yr · 2% ≈ +180%/yr), goal ceilings, and the philosophy written out: consistency is the growth, plateaus at your chosen level are wins, one plain average you can recompute in your head. It's a route, not a module — it aggregates the others, so it can't be disabled, scored, or widget-ed.
- **Today, decluttered.** The module-pill row is gone. Each module card now carries its own slim **week meter** (accent bar + %) right in the card head, so progress lives with the module. Next moves gained a **module pill** before each line — "[SANA] 2 doses today keeps the perfect week alive" reads instantly. The hero is bigger, warmer, and tappable.
- Rate + goals moved out of Settings into the 1% screen.

**New in v0.7 — the 1% engine, and GROVE becomes an instrument**

- **"1% better" is now defined.** Every module registers a weekly metric with the engine. Growth metrics (GHISA volume, GROVE focus minutes, RESPIRO breath minutes) chase a target of **your trailing 4-week pace × (1 + your rate)** — the rate is yours to set in Settings (0.5 / 1 / 2% weekly). Completion metrics score the week directly: CADENCE averages each habit against its weekly target (quits count clean days toward a 7-day run), SANA scores doses taken over doses due. CALIBER only participates in weeks you actually test — a PR beats the rate for 100, holding scores 70, regressing 40. **The overall number is one mean across participating modules.**
- **Plateaus are wins, not failures.** Set an optional goal ceiling (say 2 400 focus min = 40 h): the target never ratchets past it, so holding the ceiling is a 100% week. Hold it three weeks and the app says so out loud — raise the goal if there's genuinely room, or enjoy the plateau.
- **The new Today.** One score ("This week · 84%"), a bar to the 1%-better mark, the compounding line (weeks won → **+X% since you started**, the whole point of the name), a sparkline of past weeks, per-module score chips, and **Next moves** — up to three concrete actions, phrased in module language, sorted by where the week is leaking, each one tap from its module. Completed weeks freeze into a ledger; the current week is always live.
- **GROVE v2, the prototype timer.** Focus / short break / long break in a 4-session pomodoro cycle with the dot indicator; preset chips (15–90 m) and tap-the-time-to-type; the big tick-ringed dial with pause/resume (timestamp-shifted — background-proof), reset and skip; **Tasks** with an active task that collects finished sessions (done/planned); breaks plant **flowers** (short) and **ferns** (long) — scenery only, never metrics; the isometric **Forest** with Week/Month/Year/All, shuffle, the species legend (<10 m shrub · 10–19 birch · 20–39 pine · 40+ oak) and **animals** unlocked by lifetime focus hours (Rabbit 10 h → Owl 200 h). v1 trees migrate under the new bands.

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

- **v0.10** — Minim (mood) when its moment comes; deeper per-module polish on the new system.
- **v1.0** — Capacitor wrap; optional Firebase sync; Health Connect / HealthKit as the universal intake.
- **Later** — Capacitor wrap for the App Store; reminders/notifications (needs the native shell).

### Earlier roadmap notes

- **v0.3** — full GHISA depth: templates, per-exercise progression charts, e1RM handoff to CALIBER
- **v0.4** — Ora (fasting) and Minim (mood) as modules; insights v1 on the event stream
- **v0.5** — optional Firebase sync (the event log and namespaced docs are already sync-shaped)
- **later** — Capacitor wrap for App Store distribution, module marketplace layout

## License

[MIT](LICENSE) — do whatever you like, no warranty.

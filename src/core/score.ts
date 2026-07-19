/**
 * The 1% engine. Each module can register a WeeklyScorer; the engine turns
 * raw weekly measures into scores against an honest target:
 *
 *   growth      target = trailing-4-week pace × (1 + rate), capped by the
 *               user's goal ceiling — holding the ceiling scores 100%.
 *   completion  the week scores itself (0..1): habits hit, doses taken.
 *   event       the scorer returns a score directly, or null to sit the
 *               week out (CALIBER only counts weeks with a test).
 *
 * The overall number is the mean of participating modules. Completed weeks
 * freeze into the ledger; the current week is always live.
 */
import { MODULES } from './registry'
import { settingsStore } from './settings'
import { oneStore } from './one'
import { eventsStore } from './events'
import { todayKey, shiftDay, dayKey, weekStartKey } from './dates'
import type { ModuleDefinition, WeeklyScorer } from './types'

export interface ModulePulse {
  id: string
  name: string
  accentVar: string
  scorer: WeeklyScorer
  /** null = not participating this week. */
  score: number | null
  value: number | null
  target: number | null
  goalCapped: boolean
  advice: string | null
  /** Set when a goal-capped module has held ≥100% for 3+ frozen weeks. */
  plateauNote: string | null
}

export interface WeekPulse {
  weekStart: string
  score: number | null
  modules: ModulePulse[]
  wonWeeks: number
  compoundPct: number
  spark: { label: string; value: number }[]
}

export function computeGrowthTarget(baseline: number, rate: number, goal?: number): number {
  const t = baseline * (1 + rate)
  if (goal !== undefined && goal > 0) return Math.min(t, Math.max(goal, Math.min(baseline, goal)))
  return t
}

function scoreOf(value: number, target: number): number {
  if (target <= 0) return 100
  return Math.round(Math.min(120, (value / target) * 100))
}

function weekRange(weekStart: string): { start: string; end: string } {
  return { start: weekStart, end: shiftDay(weekStart, 6) }
}

/** Mean of up to the four most recent previous weeks with activity (looks back ≤ 8). */
function baselineFor(scorer: WeeklyScorer, weekStart: string): number | null {
  const values: number[] = []
  for (let i = 1; i <= 8 && values.length < 4; i++) {
    const ws = shiftDay(weekStart, -7 * i)
    const { start, end } = weekRange(ws)
    const v = scorer.measure(start, end)
    if (v !== null && v > 0) values.push(v)
  }
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function scoreModule(
  mod: ModuleDefinition,
  weekStart: string,
  rate: number,
  goals: Record<string, number | undefined>,
  live: boolean,
): ModulePulse | null {
  const scorer = mod.weekly
  if (!scorer) return null
  const { start, end } = weekRange(weekStart)
  const raw = scorer.measure(start, end)

  const base: Omit<ModulePulse, 'score' | 'value' | 'target' | 'goalCapped' | 'advice'> = {
    id: mod.id,
    name: mod.name,
    accentVar: mod.accentVar,
    scorer,
    plateauNote: null,
  }

  if (scorer.mode === 'completion') {
    if (raw === null) return { ...base, score: null, value: null, target: null, goalCapped: false, advice: null }
    const score = Math.round(raw * 100)
    const advice = live && score < 100 ? scorer.advice({ value: raw, target: 1, gap: 1 - raw, unit: scorer.unit }) : null
    return { ...base, score, value: raw, target: 1, goalCapped: false, advice }
  }

  if (scorer.mode === 'event') {
    if (raw === null) return { ...base, score: null, value: null, target: null, goalCapped: false, advice: null }
    const advice = live && raw < 100 ? scorer.advice({ value: raw, target: 100, gap: 100 - raw, unit: scorer.unit }) : null
    return { ...base, score: Math.round(raw), value: raw, target: 100, goalCapped: false, advice }
  }

  // growth
  const value = raw ?? 0
  const baseline = baselineFor(scorer, weekStart)
  if (baseline === null) {
    if (value <= 0) return { ...base, score: null, value: null, target: null, goalCapped: false, advice: null }
    // first active week sets the baseline — showing up is the whole game
    return { ...base, score: 100, value, target: value, goalCapped: false, advice: null }
  }
  const goal = scorer.goalKey ? goals[scorer.goalKey] : undefined
  const target = computeGrowthTarget(baseline, rate, goal)
  const goalCapped = goal !== undefined && goal > 0 && target === Math.min(baseline * (1 + rate), goal) && goal <= baseline * (1 + rate)
  const score = scoreOf(value, target)
  const gap = Math.max(0, target - value)
  const advice = live && score < 100 ? scorer.advice({ value, target, gap, unit: scorer.unit }) : null
  return { ...base, score, value, target, goalCapped, advice }
}

function overall(mods: ModulePulse[]): number | null {
  const active = mods.filter((m) => m.score !== null)
  if (active.length === 0) return null
  return Math.round(active.reduce((s, m) => s + (m.score as number), 0) / active.length)
}

function firstActivityWeek(): string | null {
  const events = eventsStore.get()
  if (events.length === 0) return null
  let min = Infinity
  for (const e of events) if (e.ts < min) min = e.ts
  return weekStartKey(dayKey(min))
}

/** Freezes any fully-elapsed weeks missing from the ledger (bounded to 26 back). */
function freezeCompletedWeeks(today: string, rate: number, goals: Record<string, number | undefined>): void {
  const first = firstActivityWeek()
  if (first === null) return
  const currentWeek = weekStartKey(today)
  const floor = shiftDay(currentWeek, -7 * 26)
  const startWeek = first > floor ? first : floor
  const log = { ...oneStore.get().weekLog }
  let changed = false
  for (let ws = startWeek; ws < currentWeek; ws = shiftDay(ws, 7)) {
    if (log[ws]) continue
    const mods = MODULES.map((m) => scoreModule(m, ws, rate, goals, false)).filter(
      (m): m is ModulePulse => m !== null,
    )
    const score = overall(mods)
    if (score === null) continue
    const per: Record<string, number> = {}
    for (const m of mods) if (m.score !== null) per[m.id] = m.score
    log[ws] = { score, per }
    changed = true
  }
  if (changed) oneStore.set((s) => ({ ...s, weekLog: log }))
}

export function computePulse(today = todayKey()): WeekPulse {
  const one = oneStore.get()
  const enabled = new Set(settingsStore.get().enabled)
  freezeCompletedWeeks(today, one.rate, one.goals)

  const weekStart = weekStartKey(today)
  const mods = MODULES.filter((m) => enabled.has(m.id))
    .map((m) => scoreModule(m, weekStart, one.rate, one.goals, true))
    .filter((m): m is ModulePulse => m !== null)

  // plateau nudge: goal-capped and held for the last 3 frozen weeks
  const log = oneStore.get().weekLog
  for (const m of mods) {
    if (!m.goalCapped || m.score === null || m.score < 100) continue
    let held = 0
    for (let i = 1; i <= 3; i++) {
      const ws = shiftDay(weekStart, -7 * i)
      const rec = log[ws]
      if (rec && rec.per[m.id] !== undefined && rec.per[m.id] >= 100) held++
      else break
    }
    if (held >= 3) {
      m.plateauNote = `Held at your ${m.scorer.label} goal for ${held + 1} weeks — raise it in Settings if there's genuinely room, or enjoy the plateau. Holding a ceiling is winning.`
    }
  }

  const frozen = Object.entries(log).sort(([a], [b]) => (a < b ? -1 : 1))
  const wonWeeks = frozen.filter(([, r]) => r.score >= 100).length
  const compoundPct = (Math.pow(1 + one.rate, wonWeeks) - 1) * 100
  const spark = frozen.slice(-8).map(([ws, r]) => ({ label: ws.slice(-2), value: r.score }))
  const cur = overall(mods)
  if (cur !== null) spark.push({ label: 'now', value: cur })

  return { weekStart, score: cur, modules: mods, wonWeeks, compoundPct, spark }
}

/** Top actionable gaps for "what next" — worst first, capped at three. */
export function nextMoves(
  pulse: WeekPulse,
): { id: string; name: string; accentVar: string; text: string }[] {
  return pulse.modules
    .filter((m) => m.score !== null && m.score < 100 && m.advice !== null)
    .sort((a, b) => (a.score as number) - (b.score as number))
    .slice(0, 3)
    .map((m) => ({ id: m.id, name: m.name, accentVar: m.accentVar, text: m.advice as string }))
}

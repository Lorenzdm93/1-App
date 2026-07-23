/**
 * GROVE v2 — the prototype's timer. Focus / short break / long break in a
 * 4-session pomodoro cycle; focus grows plants by length, finished breaks
 * plant flowers (short) and ferns (long); tasks receive completed sessions;
 * cumulative focus hours unlock the forest's animals. Focus alone feeds the
 * shared event stream — breaks are scenery, not metrics.
 */
import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent } from '../../core/events'
import { dayKey, todayKey, shiftDay } from '../../core/dates'

export type Mode = 'focus' | 'short' | 'long'
export type PlantKind = 'shrub' | 'birch' | 'pine' | 'oak' | 'flower' | 'fern'

export interface Plant {
  id: string
  ts: number
  minutes: number
  kind: PlantKind
  /** Sample-data marker — removable without touching real sessions. */
  demo?: boolean
}

export interface Task {
  id: string
  name: string
  planned: number
  done: number
  finished: boolean
  createdTs: number
  demo?: boolean
}

export interface Run {
  mode: Mode
  startTs: number
  endTs: number
  minutes: number
  /** Pause freezes the clocks; resume shifts them forward by the pause length. */
  pausedAt: number | null
}

export interface GroveFlow {
  /** Long break after this many focus sessions (2–8). */
  longEvery: number
  autoBreak: boolean
  autoFocus: boolean
  sound: boolean
  notify: boolean
}

export interface GroveState {
  running: Run | null
  plants: Plant[] // newest first
  tasks: Task[]
  activeTaskId: string | null
  mode: Mode
  focusMin: number
  shortMin: number
  longMin: number
  /** Focus sessions completed in the current pomodoro cycle, 0..longEvery. */
  cyclePos: number
  shuffleSeed: number
  settings: GroveFlow
  /** One-off length for the current round only — prototype's "for this round". */
  roundOverride: { mode: Mode; minutes: number } | null
  /** Manual placement overrides (0..1 u,v inside the diamond). */
  layout?: Record<string, { u: number; v: number }>
}

function freshState(): GroveState {
  return {
    running: null,
    plants: [],
    tasks: [],
    activeTaskId: null,
    mode: 'focus',
    focusMin: 25,
    shortMin: 5,
    longMin: 15,
    cyclePos: 0,
    shuffleSeed: 1,
    settings: { longEvery: 4, autoBreak: true, autoFocus: false, sound: true, notify: false },
    roundOverride: null,
  }
}
const DEFAULTS: GroveState = freshState()

/** Prototype species bands. */
export function kindForFocus(minutes: number): PlantKind {
  if (minutes < 10) return 'shrub'
  if (minutes <= 19) return 'birch'
  if (minutes <= 39) return 'pine'
  return 'oak'
}

interface V1Tree {
  id: string
  ts: number
  minutes: number
}
interface V1State {
  trees?: V1Tree[]
}

/** v1 trees become plants under the new species bands; a 25-minute birch is now a pine. */
export function migrateGrove(data: unknown, fromVersion: number): GroveState {
  const base = freshState()
  if (fromVersion === 1 && data !== null && typeof data === 'object') {
    const d = data as V1State
    const plants: Plant[] = (d.trees ?? []).map((t) => ({
      id: t.id,
      ts: t.ts,
      minutes: t.minutes,
      kind: kindForFocus(t.minutes),
    }))
    return { ...base, plants }
  }
  /* v2 (and defensive v3): carry known fields, fold in flow settings. */
  if (data !== null && typeof data === 'object') {
    const d = data as Partial<GroveState>
    return {
      ...base,
      running: d.running ?? null,
      plants: Array.isArray(d.plants) ? d.plants : [],
      tasks: Array.isArray(d.tasks) ? d.tasks : [],
      activeTaskId: d.activeTaskId ?? null,
      mode: d.mode === 'short' || d.mode === 'long' ? d.mode : 'focus',
      focusMin: typeof d.focusMin === 'number' ? d.focusMin : base.focusMin,
      shortMin: typeof d.shortMin === 'number' ? d.shortMin : base.shortMin,
      longMin: typeof d.longMin === 'number' ? d.longMin : base.longMin,
      cyclePos: typeof d.cyclePos === 'number' ? Math.max(0, d.cyclePos) : 0,
      shuffleSeed: typeof d.shuffleSeed === 'number' ? d.shuffleSeed : 1,
      layout: d.layout,
      settings: { ...base.settings, ...(d.settings ?? {}) },
      roundOverride: d.roundOverride ?? null,
    }
  }
  return base
}

export const groveStore = createPersistedStore<GroveState>('grove', DEFAULTS, 3, migrateGrove)

export const PRESETS: readonly number[] = [15, 25, 45, 60, 90]
export const MODE_PRESETS: Record<Mode, readonly number[]> = {
  focus: PRESETS,
  short: [3, 5, 10, 15],
  long: [10, 15, 20, 30],
}
const MODE_LIMITS: Record<Mode, [number, number]> = { focus: [5, 180], short: [1, 30], long: [5, 60] }

export const MODES: readonly { id: Mode; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'short', label: 'Short break' },
  { id: 'long', label: 'Long break' },
]

export function minutesFor(st: GroveState, mode: Mode): number {
  if (st.roundOverride && st.roundOverride.mode === mode) return st.roundOverride.minutes
  return mode === 'focus' ? st.focusMin : mode === 'short' ? st.shortMin : st.longMin
}

export function setMode(mode: Mode): void {
  groveStore.set((s) => (s.running ? s : { ...s, mode, roundOverride: null }))
}

/** One-off length for the current round — cleared on mode switch or completion. */
export function setRoundMinutes(mode: Mode, minutes: number): void {
  const [lo, hi] = [1, 180]
  const m = Math.min(hi, Math.max(lo, Math.round(minutes)))
  groveStore.set((s) => {
    if (s.running) return s
    const def = mode === 'focus' ? s.focusMin : mode === 'short' ? s.shortMin : s.longMin
    return { ...s, roundOverride: m === def ? null : { mode, minutes: m } }
  })
}

/** Persistent default for a mode — the Settings steppers. */
export function setModeDefault(mode: Mode, minutes: number): void {
  const [lo, hi] = MODE_LIMITS[mode]
  const m = Math.min(hi, Math.max(lo, Math.round(minutes)))
  groveStore.set((s) => ({
    ...s,
    focusMin: mode === 'focus' ? m : s.focusMin,
    shortMin: mode === 'short' ? m : s.shortMin,
    longMin: mode === 'long' ? m : s.longMin,
  }))
}

export function updateFlow(patch: Partial<GroveFlow>): void {
  groveStore.set((s) => {
    const settings = { ...s.settings, ...patch }
    settings.longEvery = Math.min(8, Math.max(2, Math.round(settings.longEvery)))
    return { ...s, settings, cyclePos: Math.min(s.cyclePos, settings.longEvery) }
  })
}

export function setFocusMinutes(minutes: number): void {
  const m = Math.min(180, Math.max(5, Math.round(minutes)))
  groveStore.set((s) => (s.running ? s : { ...s, focusMin: m }))
}

export function start(now = Date.now()): boolean {
  const st = groveStore.get()
  if (st.running) return false
  const m = minutesFor(st, st.mode)
  groveStore.set((s) => ({
    ...s,
    running: { mode: s.mode, startTs: now, endTs: now + m * 60_000, minutes: m, pausedAt: null },
  }))
  return true
}

export function pause(now = Date.now()): void {
  groveStore.set((s) =>
    s.running && s.running.pausedAt === null ? { ...s, running: { ...s.running, pausedAt: now } } : s,
  )
}

export function resume(now = Date.now()): void {
  groveStore.set((s) => {
    if (!s.running || s.running.pausedAt === null) return s
    const shift = now - s.running.pausedAt
    return {
      ...s,
      running: {
        ...s.running,
        startTs: s.running.startTs + shift,
        endTs: s.running.endTs + shift,
        pausedAt: null,
      },
    }
  })
}

/** Restart the current phase from zero. */
export function reset(now = Date.now()): void {
  groveStore.set((s) =>
    s.running
      ? {
          ...s,
          running: { ...s.running, startTs: now, endTs: now + s.running.minutes * 60_000, pausedAt: null },
        }
      : s,
  )
}

/** Abandoning a focus session grows nothing — the tree withers. */
export function giveUp(): void {
  groveStore.set((s) => ({ ...s, running: null }))
}

export function progress(run: Run, now = Date.now()): number {
  const at = run.pausedAt ?? now
  const p = (at - run.startTs) / (run.endTs - run.startTs)
  return Math.min(1, Math.max(0, p))
}

export function remainingMs(run: Run, now = Date.now()): number {
  const at = run.pausedAt ?? now
  return Math.max(0, run.endTs - at)
}

export interface CompletionEvent {
  finished: Mode
  plant: Plant | null
  next: Mode
  autoStarted: boolean
}

/** Focus plants and logs; breaks change only the cycle — they grow nothing. */
function completeRun(run: Run, endTs: number, now: number, allowAuto: boolean): CompletionEvent {
  let next: Mode
  let plant: Plant | null = null
  if (run.mode !== 'focus') {
    next = 'focus'
    groveStore.set((s) => ({
      ...s,
      running: null,
      mode: 'focus',
      roundOverride: null,
      cyclePos: run.mode === 'long' ? 0 : s.cyclePos,
    }))
  } else {
    const kind = kindForFocus(run.minutes)
    plant = { id: uid(), ts: endTs, minutes: run.minutes, kind }
    const p = plant
    groveStore.set((s) => {
      const longEvery = s.settings.longEvery
      const cyclePos = Math.min(longEvery, s.cyclePos + 1)
      const mode: Mode = cyclePos >= longEvery ? 'long' : 'short'
      const tasks = s.activeTaskId
        ? s.tasks.map((t) => (t.id === s.activeTaskId ? { ...t, done: t.done + 1 } : t))
        : s.tasks
      return {
        ...s, running: null, mode, cyclePos, tasks, roundOverride: null,
        plants: [p, ...s.plants].slice(0, 800),
      }
    })
    next = groveStore.get().mode
    logEvent({ module: 'grove', kind: 'focus', ts: endTs, value: run.minutes, unit: 'min', meta: { kind } })
  }
  let autoStarted = false
  if (allowAuto) {
    const flow = groveStore.get().settings
    const wants = next === 'focus' ? flow.autoFocus : flow.autoBreak
    if (wants) autoStarted = start(now)
  }
  return { finished: run.mode, plant, next, autoStarted }
}

/**
 * Completes the run if its time is up — also catches sessions that finished
 * while the app was closed (timestamp math). Paused runs never auto-complete.
 * Auto-start (when enabled) begins from wall-clock now, never from the past,
 * so an offline completion can't chain phantom sessions.
 */
export function maybeComplete(now = Date.now()): CompletionEvent | null {
  const st = groveStore.get()
  if (!st.running || st.running.pausedAt !== null || now < st.running.endTs) return null
  return completeRun(st.running, st.running.endTs, now, true)
}

/** Skip ends the phase now — nothing planted, nothing auto-started. */
export function skipPhase(now = Date.now()): CompletionEvent | null {
  const st = groveStore.get()
  if (!st.running) return null
  const run = st.running
  if (run.mode === 'focus') {
    groveStore.set((s) => ({ ...s, running: null, roundOverride: null }))
    return { finished: 'focus', plant: null, next: groveStore.get().mode, autoStarted: false }
  }
  return completeRun(run, now, now, false)
}

/** Back-compat alias. */
export const skipBreak = skipPhase

/* ---------- tasks ---------- */

export function addTask(name: string, planned: number): void {
  const t: Task = {
    id: uid(),
    name: name.trim(),
    planned: Math.min(20, Math.max(1, Math.round(planned))),
    done: 0,
    finished: false,
    createdTs: Date.now(),
  }
  groveStore.set((s) => ({ ...s, tasks: [...s.tasks, t], activeTaskId: s.activeTaskId ?? t.id }))
}

export function setActiveTask(id: string | null): void {
  groveStore.set((s) => ({ ...s, activeTaskId: id }))
}

export function toggleFinished(id: string): void {
  groveStore.set((s) => ({
    ...s,
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, finished: !t.finished } : t)),
    activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
  }))
}

export function removeTask(id: string): void {
  groveStore.set((s) => ({
    ...s,
    tasks: s.tasks.filter((t) => t.id !== id),
    activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
  }))
}

/* ---------- forest & animals ---------- */

export function reshuffle(): void {
  groveStore.set((s) => ({ ...s, shuffleSeed: (s.shuffleSeed * 1103515245 + 12345) & 0x7fffffff }))
}

export interface Animal {
  name: string
  emoji: string
  hours: number
}

export const ANIMALS: readonly Animal[] = [
  { name: 'Rabbit', emoji: '🐇', hours: 10 },
  { name: 'Fox', emoji: '🦊', hours: 25 },
  { name: 'Deer', emoji: '🦌', hours: 50 },
  { name: 'Bear', emoji: '🐻', hours: 100 },
  { name: 'Owl', emoji: '🦉', hours: 200 },
]

export function totalFocusMinutes(plants: readonly Plant[]): number {
  let m = 0
  for (const p of plants) if (p.kind !== 'flower' && p.kind !== 'fern') m += p.minutes
  return m
}

export function unlockedAnimals(plants: readonly Plant[]): Animal[] {
  const h = totalFocusMinutes(plants) / 60
  return ANIMALS.filter((a) => h >= a.hours)
}

export function nextAnimal(plants: readonly Plant[]): { animal: Animal; soFarMin: number } | null {
  const min = totalFocusMinutes(plants)
  const next = ANIMALS.find((a) => min < a.hours * 60)
  return next ? { animal: next, soFarMin: min } : null
}

/* ---------- stats ---------- */

export function todayStats(plants: readonly Plant[]): { minutes: number; count: number } {
  const today = todayKey()
  let minutes = 0
  let count = 0
  for (const p of plants) {
    if (p.kind === 'flower' || p.kind === 'fern') continue
    if (dayKey(p.ts) !== today) continue
    minutes += p.minutes
    count++
  }
  return { minutes, count }
}

/** Consecutive days ending today/yesterday with at least one focus session. */
export function focusDayStreak(plants: readonly Plant[], today = todayKey()): number {
  const days = new Set<string>()
  for (const p of plants) if (p.kind !== 'flower' && p.kind !== 'fern') days.add(dayKey(p.ts))
  let streak = 0
  let cursor = days.has(today) ? today : shiftDay(today, -1)
  while (days.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

/** Deterministic 0..1 hash for stable-but-organic forest layout. */
export function jitter(id: string, seed = 0): number {
  let h = seed | 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return (((h % 1000) + 1000) % 1000) / 1000
}

export function plantUV(st: GroveState, id: string): { u: number; v: number } {
  const o = st.layout?.[id]
  if (o) return o
  return { u: 0.08 + 0.84 * jitter(id, st.shuffleSeed), v: 0.08 + 0.84 * jitter(id + 'v', st.shuffleSeed) }
}

export function swapPlants(a: string, b: string): void {
  groveStore.set((s) => {
    const ua = plantUV(s, a)
    const ub = plantUV(s, b)
    return { ...s, layout: { ...(s.layout ?? {}), [a]: ub, [b]: ua } }
  })
}

/* ---------------- v3: sample data, reset ---------------- */

const DEMO_TASKS: readonly { name: string; planned: number; done: number }[] = [
  { name: 'Deep work — sample', planned: 6, done: 4 },
  { name: 'Reading — sample', planned: 3, done: 1 },
]

/** Six weeks of plausible tagged sessions + two tagged tasks. Idempotent-ish: call removeDemo first to re-roll. */
export function seedDemo(now = Date.now()): void {
  const plants: Plant[] = []
  const MIN_CHOICES = [15, 25, 25, 25, 45, 60]
  for (let day = 0; day < 42; day++) {
    const d = new Date(now - day * 86400000)
    const dow = d.getDay()
    const weekend = dow === 0 || dow === 6
    const roll = Math.random()
    const count = weekend
      ? (roll < 0.5 ? 0 : roll < 0.85 ? 1 : 2)
      : (roll < 0.12 ? 0 : roll < 0.4 ? 1 : roll < 0.75 ? 2 : roll < 0.93 ? 3 : 4)
    for (let i = 0; i < count; i++) {
      const minutes = MIN_CHOICES[Math.floor(Math.random() * MIN_CHOICES.length)]
      const hour = 9 + Math.floor(Math.random() * 10)
      const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, Math.floor(Math.random() * 50)).getTime()
      if (ts > now) continue
      plants.push({ id: uid(), ts, minutes, kind: kindForFocus(minutes), demo: true })
    }
  }
  plants.sort((a, b) => b.ts - a.ts)
  const tasks: Task[] = DEMO_TASKS.map((t) => ({
    id: uid(), name: t.name, planned: t.planned, done: t.done, finished: false, createdTs: now, demo: true,
  }))
  groveStore.set((s) => ({
    ...s,
    plants: [...plants, ...s.plants].slice(0, 800),
    tasks: [...s.tasks, ...tasks],
  }))
}

/** Strips ONLY tagged sample entries — real sessions and tasks are untouchable here. */
export function removeDemo(): void {
  groveStore.set((s) => {
    const tasks = s.tasks.filter((t) => !t.demo)
    return {
      ...s,
      plants: s.plants.filter((p) => !p.demo),
      tasks,
      activeTaskId: tasks.some((t) => t.id === s.activeTaskId) ? s.activeTaskId : null,
    }
  })
}

export function hasDemo(st: GroveState): boolean {
  return st.plants.some((p) => p.demo) || st.tasks.some((t) => t.demo)
}

/** Full erase — the prototype's "Erase all data", timers included. */
export function resetAll(): void {
  groveStore.set(() => freshState())
}

/** Free placement from drag — clamped inside the diamond's usable band. */
export function movePlant(id: string, u: number, v: number): void {
  const cu = Math.min(0.97, Math.max(0.03, u))
  const cv = Math.min(0.97, Math.max(0.03, v))
  groveStore.set((s) => ({ ...s, layout: { ...(s.layout ?? {}), [id]: { u: cu, v: cv } } }))
}

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
}

export interface Task {
  id: string
  name: string
  planned: number
  done: number
  finished: boolean
  createdTs: number
}

export interface Run {
  mode: Mode
  startTs: number
  endTs: number
  minutes: number
  /** Pause freezes the clocks; resume shifts them forward by the pause length. */
  pausedAt: number | null
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
  /** Focus sessions completed in the current pomodoro cycle, 0..4. */
  cyclePos: number
  shuffleSeed: number
}

const DEFAULTS: GroveState = {
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
}

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
  if (fromVersion === 1 && data !== null && typeof data === 'object') {
    const d = data as V1State
    const plants: Plant[] = (d.trees ?? []).map((t) => ({
      id: t.id,
      ts: t.ts,
      minutes: t.minutes,
      kind: kindForFocus(t.minutes),
    }))
    return { ...DEFAULTS, plants }
  }
  return DEFAULTS
}

export const groveStore = createPersistedStore<GroveState>('grove', DEFAULTS, 2, migrateGrove)

export const PRESETS: readonly number[] = [15, 25, 45, 60, 90]

export const MODES: readonly { id: Mode; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'short', label: 'Short break' },
  { id: 'long', label: 'Long break' },
]

export function minutesFor(st: GroveState, mode: Mode): number {
  return mode === 'focus' ? st.focusMin : mode === 'short' ? st.shortMin : st.longMin
}

export function setMode(mode: Mode): void {
  groveStore.set((s) => (s.running ? s : { ...s, mode }))
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

/** Focus plants and logs; breaks change only the cycle — they grow nothing. */
function completeRun(run: Run, endTs: number): Plant | null {
  if (run.mode !== 'focus') {
    groveStore.set((s) => ({
      ...s,
      running: null,
      mode: 'focus',
      cyclePos: run.mode === 'long' ? 0 : s.cyclePos,
    }))
    return null
  }
  const kind = kindForFocus(run.minutes)
  const plant: Plant = { id: uid(), ts: endTs, minutes: run.minutes, kind }
  groveStore.set((s) => {
    const cyclePos = Math.min(4, s.cyclePos + 1)
    const mode: Mode = cyclePos >= 4 ? 'long' : 'short'
    const tasks = s.activeTaskId
      ? s.tasks.map((t) => (t.id === s.activeTaskId ? { ...t, done: t.done + 1 } : t))
      : s.tasks
    return { ...s, running: null, mode, cyclePos, tasks, plants: [plant, ...s.plants].slice(0, 800) }
  })
  logEvent({ module: 'grove', kind: 'focus', ts: endTs, value: run.minutes, unit: 'min', meta: { kind } })
  return plant
}

/**
 * Completes the run if its time is up — also catches sessions that finished
 * while the app was closed (timestamp math). Paused runs never auto-complete.
 */
export function maybeComplete(now = Date.now()): Plant | null {
  const st = groveStore.get()
  if (!st.running || st.running.pausedAt !== null || now < st.running.endTs) return null
  return completeRun(st.running, st.running.endTs)
}

/** Skip on a break ends it now — breaks grow nothing either way. */
export function skipBreak(now = Date.now()): null {
  const st = groveStore.get()
  if (!st.running || st.running.mode === 'focus') return null
  completeRun(st.running, now)
  return null
}

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

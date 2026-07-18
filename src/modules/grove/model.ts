import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent } from '../../core/events'
import { dayKey, todayKey } from '../../core/dates'

export type Species = 'birch' | 'pine' | 'oak'

export interface Tree {
  id: string
  ts: number
  minutes: number
  species: Species
}

export interface FocusRun {
  startTs: number
  endTs: number
  minutes: number
}

export interface GroveState {
  running: FocusRun | null
  trees: Tree[] // newest first
}

const DEFAULTS: GroveState = { running: null, trees: [] }

export const groveStore = createPersistedStore<GroveState>('grove', DEFAULTS, 1)

export const PRESETS: readonly number[] = [25, 50, 90]

/** Longer focus grows sturdier species. */
export function speciesFor(minutes: number): Species {
  if (minutes <= 30) return 'birch'
  if (minutes <= 60) return 'pine'
  return 'oak'
}

export function startFocus(minutes: number, now = Date.now()): boolean {
  const m = Math.min(180, Math.max(5, Math.round(minutes)))
  const st = groveStore.get()
  if (st.running) return false
  groveStore.set((s) => ({
    ...s,
    running: { startTs: now, endTs: now + m * 60_000, minutes: m },
  }))
  return true
}

/** Abandoning a session grows nothing — the tree withers. */
export function giveUp(): void {
  groveStore.set((s) => ({ ...s, running: null }))
}

export function progress(run: FocusRun, now = Date.now()): number {
  const p = (now - run.startTs) / (run.endTs - run.startTs)
  return Math.min(1, Math.max(0, p))
}

/**
 * Completes the run if its time is up — also catches sessions that finished
 * while the app was closed (timestamp math, immune to tab throttling).
 * Returns the grown tree, or null when nothing was due.
 */
export function maybeComplete(now = Date.now()): Tree | null {
  const st = groveStore.get()
  if (!st.running || now < st.running.endTs) return null
  const run = st.running
  const tree: Tree = {
    id: uid(),
    ts: run.endTs,
    minutes: run.minutes,
    species: speciesFor(run.minutes),
  }
  groveStore.set((s) => ({
    running: null,
    trees: [tree, ...s.trees].slice(0, 500),
  }))
  logEvent({
    module: 'grove',
    kind: 'focus',
    ts: run.endTs,
    value: run.minutes,
    unit: 'min',
    meta: { species: tree.species },
  })
  return tree
}

export function todayStats(trees: readonly Tree[]): { minutes: number; count: number } {
  const today = todayKey()
  let minutes = 0
  let count = 0
  for (const t of trees) {
    if (dayKey(t.ts) !== today) continue
    minutes += t.minutes
    count++
  }
  return { minutes, count }
}

export function totalMinutes(trees: readonly Tree[]): number {
  let m = 0
  for (const t of trees) m += t.minutes
  return m
}

/** Deterministic small variation so the forest doesn't look stamped. */
export function jitter(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((h % 100) + 100) % 100 / 100
}

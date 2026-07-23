/**
 * SANA → CADENCE, the module's only cross-module seam (GHISA precedent).
 * Whenever the taken-log changes for any day, the supplement habits in
 * CADENCE receive that day's completion fraction: a full day promotes to a
 * real check (streaks, events, toast — the full ceremony), a partial day
 * shows as a progress bar on the habit row, and dropping a dose demotes
 * honestly. Fault-isolated: CADENCE trouble can never break dose logging.
 */
import { sanaStore, dueOn, isTaken, type SanaState } from './model'
import { cadenceStore, activeHabits, setCheckFraction, type Habit } from '../cadence/model'

const NAME_RE = /supplement|vitamin|integratori|vitamine|pillole/i
const EMOJI_RE = /💊|🧬/u

/** Build habits that read as "the supplements habit" — by name (EN/IT) or emoji. */
export function supplementHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => h.type === 'build' && (NAME_RE.test(h.name) || EMOJI_RE.test(h.emoji)))
}

/** Completion 0..1 for a day, or null when nothing is due (integration stays silent). */
export function dayFraction(st: SanaState, day: string): number | null {
  const due = dueOn(st, day)
  if (due.length === 0) return null
  const taken = due.filter(({ compound }) => isTaken(st, compound.id, day)).length
  return taken / due.length
}

export function syncSupplementDay(day: string): void {
  try {
    const f = dayFraction(sanaStore.get(), day)
    if (f === null) return
    for (const h of supplementHabits(activeHabits(cadenceStore.get()))) {
      setCheckFraction(h.id, day, f)
    }
  } catch {
    /* CADENCE unavailable or shape drifted — dose logging must not care. */
  }
}

let wired = false

/** Subscribes once (from the module registration) and syncs every day whose taken-log changed. */
export function wireSanaIntegrations(): void {
  if (wired) return
  wired = true
  let prev = sanaStore.get().taken
  sanaStore.subscribe(() => {
    const cur = sanaStore.get().taken
    if (cur === prev) return
    const days = new Set([...Object.keys(prev), ...Object.keys(cur)])
    for (const d of days) {
      if ((prev[d] ?? []).join('\u0000') !== (cur[d] ?? []).join('\u0000')) syncSupplementDay(d)
    }
    prev = cur
  })
}

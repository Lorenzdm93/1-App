/**
 * RESPIRO → CADENCE. Session minutes live in the core event stream; any new
 * respiro session updates that day's minutes on every "breathwork" habit
 * (name or 🌬️ emoji) with a daily time goal. Fraction bar while partial,
 * full ceremony at the goal. Fault-isolated both ways.
 */
import { eventsStore, sumValue } from '../../core/events'
import type { MetricEvent } from '../../core/types'
import { dayKey } from '../../core/dates'
import { cadenceStore, activeHabits, setCheckFraction, type Habit } from '../cadence/model'

const NAME_RE = /breath|respiro|pranayama/i
const EMOJI_RE = /🌬️|🫁/u

export function breathHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => h.type === 'build' && (h.targetMin ?? 0) > 0 && (NAME_RE.test(h.name) || EMOJI_RE.test(h.emoji)))
}

export function syncBreathDay(events: MetricEvent[], day: string): void {
  try {
    const minutes = sumValue(events, 'respiro', 'session', [day])
    for (const h of breathHabits(activeHabits(cadenceStore.get()))) {
      setCheckFraction(h.id, day, minutes / (h.targetMin ?? 1))
    }
  } catch { /* cadence unavailable — respiro must not care */ }
}

let wired = false
export function wireRespiroIntegrations(): void {
  if (wired) return
  wired = true
  let prevTop: MetricEvent | null = eventsStore.get()[0] ?? null
  eventsStore.subscribe(() => {
    const evs = eventsStore.get()
    const days = new Set<string>()
    for (const e of evs) {
      if (prevTop && e.id === prevTop.id) break
      if (e.module === 'respiro' && e.kind === 'session') days.add(dayKey(e.ts))
    }
    prevTop = evs[0] ?? null
    for (const d of days) syncBreathDay(evs, d)
  })
}

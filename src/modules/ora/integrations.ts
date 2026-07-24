/**
 * ORA → CADENCE. When a fast ends, its minutes land on that day for every
 * build habit that reads as "fasting" (name or ⏳ emoji) and carries a daily
 * time goal — a 16h fast against a 16h target ticks the habit with the full
 * ceremony; a shorter one paints the honest fraction. Fault-isolated.
 */
import { oraStore, fastMinutesByDay } from './model'
import { cadenceStore, activeHabits, setCheckFraction, type Habit } from '../cadence/model'

const NAME_RE = /fast|digiun|intermittent/i
const EMOJI_RE = /⏳/u

export function fastingHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => h.type === 'build' && (h.targetMin ?? 0) > 0 && (NAME_RE.test(h.name) || EMOJI_RE.test(h.emoji)))
}

export function syncFastDay(day: string, minutes: number): void {
  try {
    for (const h of fastingHabits(activeHabits(cadenceStore.get()))) {
      setCheckFraction(h.id, day, minutes / (h.targetMin ?? 1))
    }
  } catch { /* cadence unavailable — ora must not care */ }
}

let wired = false
export function wireOraIntegrations(): void {
  if (wired) return
  wired = true
  let prev = fastMinutesByDay(oraStore.get().fasts)
  oraStore.subscribe(() => {
    const cur = fastMinutesByDay(oraStore.get().fasts)
    const days = new Set([...prev.keys(), ...cur.keys()])
    for (const d of days) {
      if ((prev.get(d) ?? 0) !== (cur.get(d) ?? 0)) syncFastDay(d, cur.get(d) ?? 0)
    }
    prev = cur
  })
}

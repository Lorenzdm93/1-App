/**
 * GROVE → CADENCE. Focus minutes stream into any build habit that reads as
 * "focus time" (name or 🎯/🌲 emoji) and carries a daily time goal —
 * partial days paint the fraction bar, hitting the goal ticks the habit
 * with the full ceremony. Fault-isolated: CADENCE trouble never breaks GROVE.
 */
import { groveStore, type Plant } from './model'
import { dayKey, todayKey } from '../../core/dates'
import { cadenceStore, activeHabits, setCheckFraction, type Habit } from '../cadence/model'

const NAME_RE = /focus|deep work|pomodoro|concentrazi/i
const EMOJI_RE = /🎯|🌲/u

export function focusHabits(habits: Habit[]): Habit[] {
  return habits.filter((h) => h.type === 'build' && (h.targetMin ?? 0) > 0 && (NAME_RE.test(h.name) || EMOJI_RE.test(h.emoji)))
}

export function minutesByDay(plants: Plant[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of plants) {
    const d = dayKey(p.ts)
    m.set(d, (m.get(d) ?? 0) + p.minutes)
  }
  return m
}

export function syncFocusDay(day: string, minutes: number): void {
  try {
    for (const h of focusHabits(activeHabits(cadenceStore.get()))) {
      setCheckFraction(h.id, day, minutes / (h.targetMin ?? 1))
    }
  } catch { /* cadence unavailable — grove must not care */ }
}

let wired = false
export function wireGroveIntegrations(): void {
  if (wired) return
  wired = true
  let prev = minutesByDay(groveStore.get().plants)
  groveStore.subscribe(() => {
    const cur = minutesByDay(groveStore.get().plants)
    const days = new Set([...prev.keys(), ...cur.keys(), todayKey()])
    for (const d of days) {
      if ((prev.get(d) ?? 0) !== (cur.get(d) ?? 0)) syncFocusDay(d, cur.get(d) ?? 0)
    }
    prev = cur
  })
}

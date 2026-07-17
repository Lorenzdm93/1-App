import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent, eventsStore } from '../../core/events'
import { dayKey, todayKey, shiftDay } from '../../core/dates'

export interface Habit {
  id: string
  name: string
  emoji: string
  createdTs: number
  archived?: boolean
}

export interface CadenceState {
  habits: Habit[]
  /** dayKey -> ids of habits checked that day. */
  checks: Record<string, string[]>
}

export const cadenceStore = createPersistedStore<CadenceState>('cadence', {
  habits: [],
  checks: {},
})

export const EMOJI_PRESETS: readonly string[] = [
  '💪', '📖', '🧘', '💧', '🥗', '😴',
  '🚶', '🇮🇹', '✍️', '🧹', '🎸', '🌅',
]

export function activeHabits(st: CadenceState): Habit[] {
  return st.habits.filter((h) => !h.archived)
}

export function isChecked(st: CadenceState, habitId: string, day = todayKey()): boolean {
  return (st.checks[day] ?? []).includes(habitId)
}

export function addHabit(name: string, emoji: string): void {
  const clean = name.trim()
  if (!clean) return
  cadenceStore.set((st) => ({
    ...st,
    habits: [...st.habits, { id: uid(), name: clean, emoji, createdTs: Date.now() }],
  }))
}

export function archiveHabit(habitId: string): void {
  cadenceStore.set((st) => ({
    ...st,
    habits: st.habits.map((h) => (h.id === habitId ? { ...h, archived: true } : h)),
  }))
}

/**
 * Toggles today's check. Checking emits a metric event; unchecking removes
 * the matching event so the platform ring and streaks stay truthful.
 */
export function toggleCheck(habitId: string): void {
  const day = todayKey()
  const st = cadenceStore.get()
  const habit = st.habits.find((h) => h.id === habitId)
  if (!habit) return
  const done = isChecked(st, habitId, day)

  cadenceStore.set((s) => {
    const list = s.checks[day] ?? []
    const next = done ? list.filter((id) => id !== habitId) : [...list, habitId]
    return { ...s, checks: { ...s.checks, [day]: next } }
  })

  if (!done) {
    logEvent({ module: 'cadence', kind: 'check', meta: { habitId, habit: habit.name } })
  } else {
    eventsStore.set((events) => {
      const idx = events.findIndex(
        (e) =>
          e.module === 'cadence' &&
          e.kind === 'check' &&
          dayKey(e.ts) === day &&
          e.meta !== undefined &&
          (e.meta as { habitId?: string }).habitId === habitId,
      )
      if (idx === -1) return events
      return [...events.slice(0, idx), ...events.slice(idx + 1)]
    })
  }
}

/** Consecutive checked days for one habit, tolerant of today being unchecked. */
export function habitStreak(st: CadenceState, habitId: string, today = todayKey()): number {
  const has = (day: string) => (st.checks[day] ?? []).includes(habitId)
  let cursor = has(today) ? today : shiftDay(today, -1)
  let streak = 0
  while (has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

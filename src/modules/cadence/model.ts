import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent, eventsStore } from '../../core/events'
import { toast } from '../../core/toast'
import { dayKey, todayKey, shiftDay, dayDiff } from '../../core/dates'

export type HabitType = 'build' | 'quit'

export interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  type: HabitType
  /** Implementation intention — "after coffee", "before bed". */
  cue?: string
  createdTs: number
  archived?: boolean
}

export interface CadenceState {
  habits: Habit[]
  /** dayKey -> ids of build habits checked that day. */
  checks: Record<string, string[]>
  /** habitId -> dayKeys with a logged slip (quit habits). */
  slips: Record<string, string[]>
}

export const PALETTE: readonly string[] = [
  '#8fa7c9', // moon
  '#7fa98e', // jade
  '#c89b4b', // brass
  '#e58a6b', // coral
  '#b48ead', // heather
  '#e0b84f', // gold
  '#6fb3a8', // teal
  '#a3b56b', // olive
]

const DEFAULTS: CadenceState = { habits: [], checks: {}, slips: {} }

/** v1 habits had no type/color/cue and no slips map. */
export function migrateCadence(data: unknown, fromVersion: number): CadenceState {
  if (fromVersion === 1 && data !== null && typeof data === 'object') {
    const d = data as Partial<CadenceState>
    const habits = Array.isArray(d.habits)
      ? d.habits.map((h, i) => ({
          ...h,
          type: (h.type === 'quit' ? 'quit' : 'build') as HabitType,
          color: typeof h.color === 'string' ? h.color : PALETTE[i % PALETTE.length],
        }))
      : []
    return {
      habits,
      checks: d.checks && typeof d.checks === 'object' ? d.checks : {},
      slips: {},
    }
  }
  return DEFAULTS
}

export const cadenceStore = createPersistedStore<CadenceState>('cadence', DEFAULTS, 2, migrateCadence)

export const EMOJI_PRESETS: readonly string[] = [
  '💪', '📖', '🧘', '💧', '🥗', '😴',
  '🚶', '🇮🇹', '✍️', '🧹', '🎸', '🌅',
  '🚭', '🍺', '📵', '🍬', '☕', '🎮',
]

export const MILESTONES: readonly number[] = [7, 30, 100]

export function isMilestone(streak: number): boolean {
  return MILESTONES.includes(streak)
}

export function activeHabits(st: CadenceState): Habit[] {
  return st.habits.filter((h) => !h.archived)
}

export function isChecked(st: CadenceState, habitId: string, day = todayKey()): boolean {
  return (st.checks[day] ?? []).includes(habitId)
}

/* ---------- create / edit ---------- */

export function addHabit(input: {
  name: string
  emoji: string
  color: string
  type: HabitType
  cue?: string
}): void {
  const clean = input.name.trim()
  if (!clean) return
  cadenceStore.set((st) => ({
    ...st,
    habits: [
      ...st.habits,
      {
        id: uid(),
        name: clean,
        emoji: input.emoji,
        color: input.color,
        type: input.type,
        ...(input.cue && input.cue.trim() ? { cue: input.cue.trim() } : {}),
        createdTs: Date.now(),
      },
    ],
  }))
}

export function archiveHabit(habitId: string): void {
  cadenceStore.set((st) => ({
    ...st,
    habits: st.habits.map((h) => (h.id === habitId ? { ...h, archived: true } : h)),
  }))
}

/* ---------- build habits: checks + backfill ---------- */

function removeCheckEvent(habitId: string, day: string): void {
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

function noonTs(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}

/**
 * Sets a build-habit check for any past-or-today day (backfill included).
 * The metric event carries the day's own timestamp so streaks stay truthful.
 */
export function setCheck(habitId: string, day: string, value: boolean): void {
  if (day > todayKey()) return
  const st = cadenceStore.get()
  const habit = st.habits.find((h) => h.id === habitId)
  if (!habit || habit.type !== 'build') return
  const already = isChecked(st, habitId, day)
  if (already === value) return

  cadenceStore.set((s) => {
    const list = s.checks[day] ?? []
    const next = value ? [...list, habitId] : list.filter((id) => id !== habitId)
    return { ...s, checks: { ...s.checks, [day]: next } }
  })

  if (value) {
    logEvent({
      module: 'cadence',
      kind: 'check',
      ts: day === todayKey() ? Date.now() : noonTs(day),
      meta: { habitId, habit: habit.name },
    })
    if (day === todayKey()) {
      const streak = habitStreak(cadenceStore.get(), habitId, day)
      if (isMilestone(streak)) toast(`${habit.name}: ${streak}-day streak`)
    }
  } else {
    removeCheckEvent(habitId, day)
  }
}

export function toggleCheck(habitId: string, day = todayKey()): void {
  const st = cadenceStore.get()
  setCheck(habitId, day, !isChecked(st, habitId, day))
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

/* ---------- quit habits: slips + days clean ---------- */

export function logSlip(habitId: string): void {
  const day = todayKey()
  const st = cadenceStore.get()
  const habit = st.habits.find((h) => h.id === habitId)
  if (!habit || habit.type !== 'quit') return
  cadenceStore.set((s) => {
    const list = s.slips[habitId] ?? []
    if (list.includes(day)) return s
    return { ...s, slips: { ...s.slips, [habitId]: [...list, day] } }
  })
}

export function undoTodaySlip(habitId: string): void {
  const day = todayKey()
  cadenceStore.set((s) => {
    const list = s.slips[habitId] ?? []
    if (!list.includes(day)) return s
    return { ...s, slips: { ...s.slips, [habitId]: list.filter((d) => d !== day) } }
  })
}

export function slipDays(st: CadenceState, habitId: string): string[] {
  return st.slips[habitId] ?? []
}

/** Days clean counting today: 0 if slipped today, else days since last slip / creation. */
export function daysClean(st: CadenceState, habitId: string, today = todayKey()): number {
  const habit = st.habits.find((h) => h.id === habitId)
  if (!habit) return 0
  const slips = slipDays(st, habitId)
  if (slips.includes(today)) return 0
  const lastSlip = slips.filter((d) => d < today).sort().pop()
  const anchor = lastSlip ?? shiftDay(dayKey(habit.createdTs), -1)
  return Math.max(0, dayDiff(anchor, today))
}

/* ---------- month view helpers ---------- */

export interface MonthGrid {
  year: number
  month: number // 0-based
  leadingBlanks: number // Monday-start
  days: number
}

export function monthGrid(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1, 12)
  const leadingBlanks = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0, 12).getDate()
  return { year, month, leadingBlanks, days }
}

export function monthDayKey(grid: MonthGrid, day: number): string {
  const m = grid.month + 1
  return `${grid.year}-${m < 10 ? '0' + m : m}-${day < 10 ? '0' + day : day}`
}

/** 0..1 completion for a day: checked build habits / active build habits. */
export function dayCompletion(st: CadenceState, day: string): number {
  const builds = activeHabits(st).filter((h) => h.type === 'build')
  if (builds.length === 0) return 0
  const checked = builds.filter((h) => isChecked(st, h.id, day)).length
  return checked / builds.length
}

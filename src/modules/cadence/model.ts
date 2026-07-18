import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent, eventsStore } from '../../core/events'
import { toast } from '../../core/toast'
import { dayKey, todayKey, shiftDay, dayDiff, weekStartKey } from '../../core/dates'

export { weekStartKey }

export type HabitType = 'build' | 'quit'

export interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  type: HabitType
  /** Implementation intention — "after coffee", "before bed". */
  cue?: string
  /** How many days per week this habit is meant to happen (1–7). */
  targetPerWeek: number
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

/** v1: no type/color/cue/slips. v2: no weekly target. */
export function migrateCadence(data: unknown, fromVersion: number): CadenceState {
  if ((fromVersion === 1 || fromVersion === 2) && data !== null && typeof data === 'object') {
    const d = data as Partial<CadenceState>
    const habits = Array.isArray(d.habits)
      ? d.habits.map((h, i) => ({
          ...h,
          type: (h.type === 'quit' ? 'quit' : 'build') as HabitType,
          color: typeof h.color === 'string' ? h.color : PALETTE[i % PALETTE.length],
          targetPerWeek:
            typeof h.targetPerWeek === 'number' && h.targetPerWeek >= 1 && h.targetPerWeek <= 7
              ? h.targetPerWeek
              : 7,
        }))
      : []
    return {
      habits,
      checks: d.checks && typeof d.checks === 'object' ? d.checks : {},
      slips: d.slips && typeof d.slips === 'object' ? d.slips : {},
    }
  }
  return DEFAULTS
}

export const cadenceStore = createPersistedStore<CadenceState>('cadence', DEFAULTS, 3, migrateCadence)

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
  targetPerWeek?: number
}): void {
  const clean = input.name.trim()
  if (!clean) return
  const target = Math.min(7, Math.max(1, input.targetPerWeek ?? 7))
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
        targetPerWeek: input.type === 'quit' ? 7 : target,
        ...(input.cue && input.cue.trim() ? { cue: input.cue.trim() } : {}),
        createdTs: Date.now(),
      },
    ],
  }))
}

export function editHabit(
  habitId: string,
  patch: Partial<Pick<Habit, 'name' | 'emoji' | 'color' | 'cue' | 'targetPerWeek'>>,
): void {
  cadenceStore.set((st) => ({
    ...st,
    habits: st.habits.map((h) => {
      if (h.id !== habitId) return h
      const next = { ...h, ...patch }
      if (patch.name !== undefined) next.name = patch.name.trim() || h.name
      if (patch.cue !== undefined && patch.cue.trim() === '') delete next.cue
      if (patch.targetPerWeek !== undefined)
        next.targetPerWeek = Math.min(7, Math.max(1, patch.targetPerWeek))
      return next
    }),
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
    if (day === todayKey() && habit.targetPerWeek === 7) {
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

/* ---------- weekly frequency ---------- */

/** The 7 day-keys of the week starting at `start` (a Monday key). */
export function weekDayKeys(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDay(start, i))
}

export function countInWeek(st: CadenceState, habitId: string, weekStart: string): number {
  let n = 0
  for (const day of weekDayKeys(weekStart)) {
    if ((st.checks[day] ?? []).includes(habitId)) n++
  }
  return n
}

export function weekSatisfied(st: CadenceState, habit: Habit, weekStart: string): boolean {
  return countInWeek(st, habit.id, weekStart) >= habit.targetPerWeek
}

/**
 * Consecutive satisfied weeks ending now. The current week counts as soon
 * as it reaches the target; otherwise the streak stands on completed weeks.
 */
export function weekStreak(st: CadenceState, habitId: string, today = todayKey()): number {
  const habit = st.habits.find((h) => h.id === habitId)
  if (!habit) return 0
  let cursor = weekStartKey(today)
  let streak = 0
  if (weekSatisfied(st, habit, cursor)) streak++
  cursor = shiftDay(cursor, -7)
  while (streak < 520 && weekSatisfied(st, habit, cursor)) {
    streak++
    cursor = shiftDay(cursor, -7)
  }
  return streak
}

/* ---------- insights ---------- */

export interface MonthInsights {
  avgCompletion: number // 0..100 over elapsed days of the month
  checkIns: number
  activeBuilds: number
  mostConsistent: { name: string; pct: number } | null
}

export function monthInsights(st: CadenceState, grid: MonthGrid, today = todayKey()): MonthInsights {
  const builds = activeHabits(st).filter((h) => h.type === 'build')
  let checkIns = 0
  let ratioSum = 0
  let counted = 0
  const perHabit = new Map<string, number>()
  for (let d = 1; d <= grid.days; d++) {
    const day = monthDayKey(grid, d)
    if (day > today) break
    counted++
    ratioSum += dayCompletion(st, day)
    for (const h of builds) {
      if (isChecked(st, h.id, day)) {
        checkIns++
        perHabit.set(h.id, (perHabit.get(h.id) ?? 0) + 1)
      }
    }
  }
  let mostConsistent: MonthInsights['mostConsistent'] = null
  if (counted > 0) {
    for (const h of builds) {
      const pct = Math.round(((perHabit.get(h.id) ?? 0) / counted) * 100)
      if (!mostConsistent || pct > mostConsistent.pct) mostConsistent = { name: h.name, pct }
    }
  }
  return {
    avgCompletion: counted > 0 ? Math.round((ratioSum / counted) * 100) : 0,
    checkIns,
    activeBuilds: builds.length,
    mostConsistent,
  }
}

export interface YearInsights {
  activeDays: number
  checkIns: number
  habitsTracked: number
  bestStreak: number
}

/** Over the trailing 365 days. Best streak = highest current streak/clean run right now. */
export function yearInsights(st: CadenceState, today = todayKey()): YearInsights {
  const habits = activeHabits(st)
  const daysWithAny = new Set<string>()
  let checkIns = 0
  const start = shiftDay(today, -364)
  for (const [day, ids] of Object.entries(st.checks)) {
    if (day < start || day > today || ids.length === 0) continue
    checkIns += ids.length
    daysWithAny.add(day)
  }
  let bestStreak = 0
  for (const h of habits) {
    const s =
      h.type === 'build'
        ? h.targetPerWeek === 7
          ? habitStreak(st, h.id, today)
          : weekStreak(st, h.id, today) * 7
        : daysClean(st, h.id, today)
    if (s > bestStreak) bestStreak = s
  }
  return {
    activeDays: daysWithAny.size,
    checkIns,
    habitsTracked: st.habits.length,
    bestStreak,
  }
}

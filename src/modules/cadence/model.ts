import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent, eventsStore } from '../../core/events'
import { toast } from '../../core/toast'
import { dayKey, todayKey, shiftDay, dayDiff, weekStartKey } from '../../core/dates'

export { weekStartKey }

export type HabitType = 'build' | 'quit'

/** Prototype-true schedule: every day, or an explicit set of weekdays (0=Sun … 6=Sat). */
export type HabitSchedule = { mode: 'daily' } | { mode: 'days'; days: number[] }

export interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  type: HabitType
  schedule: HabitSchedule
  /** First counted day ('YYYY-MM-DD'). For quits this is the quit date. Days before are 'pre'. */
  startDate: string
  /** Implementation intention — "after coffee", "before bed". */
  cue?: string
  /** Daily time goal in minutes for module-linked habits (grove/respiro/ora). 0/absent = off. */
  targetMin?: number
  createdTs: number
  archived?: boolean
}

export interface CadenceState {
  /** 1–5 per dayKey — the day's mood, optional and judgment-free. */
  moods?: Record<string, number>
  habits: Habit[]
  /** dayKey -> ids of build habits checked that day. */
  checks: Record<string, string[]>
  /** dayKey → habitId → partial completion 0..1 (integrations write this; a full check lives in `checks`). */
  progress?: Record<string, Record<string, number>>
  /** habitId -> dayKeys with a logged slip (quit habits). */
  slips: Record<string, string[]>
}

/** The prototype's saturated habit palette — identity lives in the habit, not the chrome. */
export const PALETTE: readonly string[] = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#14b8a6',
  '#6366f1', '#ec4899', '#84cc16', '#06b6d4', '#ef4444', '#a855f7',
]

const DEFAULTS: CadenceState = { habits: [], checks: {}, slips: {}, progress: {} }

function normalizedSchedule(raw: unknown): HabitSchedule {
  if (raw !== null && typeof raw === 'object') {
    const sc = raw as { mode?: unknown; days?: unknown }
    if (sc.mode === 'days' && Array.isArray(sc.days)) {
      const days = sc.days.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 6)
      if (days.length > 0) return { mode: 'days', days: [...new Set(days)].sort((a, b) => a - b) }
    }
  }
  return { mode: 'daily' }
}

/**
 * v1: no type/color/cue/slips. v2: no weekly target. v3: targetPerWeek (1–7).
 * v4 replaces targetPerWeek with a weekday schedule and adds startDate.
 * A 3-of-7 target has no honest weekday mapping, so legacy habits arrive as
 * 'daily' — one edit in the new form sets the real days.
 */
export function migrateCadence(data: unknown, fromVersion: number): CadenceState {
  if (fromVersion >= 1 && fromVersion <= 4 && data !== null && typeof data === 'object') {
    const d = data as Partial<CadenceState>
    const rawHabits = Array.isArray(d.habits) ? d.habits : []
    const habits: Habit[] = rawHabits
      .filter((h): h is Habit => h !== null && typeof h === 'object')
      .map((h, i) => {
        const legacy = h as Habit & { targetPerWeek?: number }
        const createdTs = typeof legacy.createdTs === 'number' ? legacy.createdTs : Date.now()
        return {
          id: typeof legacy.id === 'string' ? legacy.id : uid(),
          name: typeof legacy.name === 'string' ? legacy.name : '',
          emoji: typeof legacy.emoji === 'string' && legacy.emoji.trim() ? legacy.emoji : '✅',
          color: typeof legacy.color === 'string' ? legacy.color : PALETTE[i % PALETTE.length],
          type: legacy.type === 'quit' ? 'quit' : 'build',
          schedule: legacy.type === 'quit' ? { mode: 'daily' } : normalizedSchedule(legacy.schedule),
          startDate:
            typeof legacy.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(legacy.startDate)
              ? legacy.startDate
              : dayKey(createdTs),
          ...(typeof legacy.cue === 'string' && legacy.cue.trim() ? { cue: legacy.cue.trim() } : {}),
          createdTs,
          ...(legacy.archived ? { archived: true } : {}),
        }
      })
    return {
      habits,
      checks: d.checks && typeof d.checks === 'object' ? d.checks : {},
      progress: d.progress && typeof d.progress === 'object' ? d.progress : {},
      slips: d.slips && typeof d.slips === 'object' ? d.slips : {},
      ...(d.moods && typeof d.moods === 'object' ? { moods: d.moods } : {}),
    }
  }
  return DEFAULTS
}

export const cadenceStore = createPersistedStore<CadenceState>('cadence', DEFAULTS, 5, migrateCadence)

export const EMOJI_PRESETS = [
  '💪', '🏃', '📚', '🧘', '💧', '✍️', '🥦', '🌱', '😴', '💊',
  '🚭', '🍺', '📵', '🍬', '🎮', '☕', '🍔', '💸', '🧊', '🚿',
  '🦷', '🧴', '🌞', '🚶', '🚴', '🏊', '⛰️', '🎸', '🎹', '🗣️',
  '🧠', '❤️', '🙏', '📖', '💻', '🧹', '🛏️', '🐶', '🌿', '⏰',
]

export const PRESETS = {
  build: [
    ['💪', 'Workout'], ['🏃', 'Run'], ['📚', 'Read'], ['🧘', 'Meditate'], ['💧', 'Drink water'],
    ['✍️', 'Journal'], ['🥦', 'Eat vegetables'], ['🌱', 'Stretch'], ['😴', 'Sleep by 11pm'], ['💊', 'Supplements'],
    ['🎯', 'Focus time'], ['🌬️', 'Breathwork'], ['⏳', 'Fasting'],
  ],
  quit: [
    ['🚭', 'No smoking'], ['🍺', 'No alcohol'], ['📵', 'No doomscrolling'], ['🍬', 'No sugar'],
    ['🎮', 'No gaming'], ['☕', 'No caffeine'], ['🍔', 'No junk food'], ['💸', 'No impulse buys'],
  ],
} as const

/** Streak milestones, prototype-tuned: quits celebrate early days, builds the long arcs. */
export const MS_BUILD: readonly number[] = [7, 14, 30, 50, 75, 100, 150, 200, 300, 365, 500, 730, 1000]
export const MS_QUIT: readonly number[] = [1, 3, 7, 14, 21, 30, 60, 90, 120, 180, 270, 365, 500, 730, 1000]

export function nextMilestone(n: number, arr: readonly number[]): number | null {
  for (const m of arr) if (m > n) return m
  return null
}

export function activeHabits(st: CadenceState): Habit[] {
  return st.habits.filter((h) => !h.archived)
}

export function habitById(st: CadenceState, id: string): Habit | undefined {
  return st.habits.find((h) => h.id === id)
}

/* ---------- schedule + status (the prototype's core semantics) ---------- */

export function dowOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getDay()
}

/** Quit habits are always "on duty"; builds follow their schedule. */
export function isScheduled(h: Habit, day: string): boolean {
  if (h.type === 'quit') return true
  if (h.schedule.mode === 'daily') return true
  return h.schedule.days.includes(dowOf(day))
}

export type DayStatus = 'pre' | 'future' | 'done' | 'todo' | 'missed' | 'off' | 'clean' | 'slip'

export function isChecked(st: CadenceState, habitId: string, day = todayKey()): boolean {
  return (st.checks[day] ?? []).includes(habitId)
}

export function slipDays(st: CadenceState, habitId: string): string[] {
  return st.slips[habitId] ?? []
}

/** One truth for what a habit-day is — every strip, calendar and stat reads this. */
export function statusOf(st: CadenceState, h: Habit, day: string, today = todayKey()): DayStatus {
  if (day < h.startDate) return 'pre'
  if (day > today) return 'future'
  if (h.type === 'quit') return slipDays(st, h.id).includes(day) ? 'slip' : 'clean'
  if (isChecked(st, h.id, day)) return 'done'
  if (!isScheduled(h, day)) return 'off'
  if (day === today) return 'todo'
  return 'missed'
}

/** "Weekdays" / "Weekends" / "Mon Wed Fri" — null when it's just daily. */
export function scheduleLabel(h: Habit): string | null {
  if (h.type === 'quit' || h.schedule.mode === 'daily') return null
  const d = [...h.schedule.days].sort((a, b) => a - b)
  if (d.length === 7) return null
  if (d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) return 'Weekdays'
  if (d.length === 2 && d.includes(0) && d.includes(6)) return 'Weekends'
  const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return d.map((x) => SHORT[x]).join(' ')
}

/* ---------- create / edit ---------- */

export function addHabit(input: {
  name: string
  emoji: string
  color: string
  type: HabitType
  schedule: HabitSchedule
  startDate: string
  cue?: string
  targetMin?: number
}): void {
  const clean = input.name.trim()
  if (!clean) return
  const today = todayKey()
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
        schedule: input.type === 'quit' ? { mode: 'daily' } : normalizedSchedule(input.schedule),
        startDate: input.startDate > today ? today : input.startDate,
        ...(input.cue && input.cue.trim() ? { cue: input.cue.trim() } : {}),
    ...(input.targetMin && input.targetMin > 0 ? { targetMin: Math.round(input.targetMin) } : {}),
        createdTs: Date.now(),
      },
    ],
  }))
}

export function editHabit(
  habitId: string,
  patch: Partial<Pick<Habit, 'name' | 'emoji' | 'color' | 'type' | 'schedule' | 'startDate' | 'cue' | 'targetMin'>>,
): void {
  const today = todayKey()
  cadenceStore.set((st) => ({
    ...st,
    habits: st.habits.map((h) => {
      if (h.id !== habitId) return h
      const next: Habit = { ...h, ...patch }
      if (patch.name !== undefined) next.name = patch.name.trim() || h.name
      if (patch.cue !== undefined && patch.cue.trim() === '') delete next.cue
      if (patch.schedule !== undefined) next.schedule = normalizedSchedule(patch.schedule)
      if (next.type === 'quit') next.schedule = { mode: 'daily' }
      if (patch.startDate !== undefined && patch.startDate > today) next.startDate = today
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
 * Sets a build-habit check for any counted past-or-today day (backfill included).
 * Days before startDate aren't counted, so they aren't settable either.
 * The metric event carries the day's own timestamp so streaks stay truthful.
 */
export function setCheck(habitId: string, day: string, value: boolean): void {
  if (day > todayKey()) return
  const st = cadenceStore.get()
  const habit = habitById(st, habitId)
  if (!habit || habit.type !== 'build') return
  if (day < habit.startDate) return
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
      if (MS_BUILD.includes(streak)) toast(`${habit.emoji} ${habit.name}: ${streak}-day streak`)
    }
  } else {
    removeCheckEvent(habitId, day)
  }
}

export function toggleCheck(habitId: string, day = todayKey()): void {
  const st = cadenceStore.get()
  setCheck(habitId, day, !isChecked(st, habitId, day))
}

/**
 * Consecutive kept days for one build habit ending now.
 * Off-schedule days pass through; an unchecked today doesn't break the run.
 */
export function habitStreak(st: CadenceState, habitId: string, today = todayKey()): number {
  const habit = habitById(st, habitId)
  if (!habit) return 0
  let streak = 0
  for (let i = 0; i < 3660; i++) {
    const day = shiftDay(today, -i)
    if (day < habit.startDate) break
    if (!isScheduled(habit, day)) continue
    if (isChecked(st, habitId, day)) streak++
    else if (day !== today) break
  }
  return streak
}

/** Longest kept run since startDate (schedule-aware; today-unchecked is neutral). */
export function bestBuildStreak(st: CadenceState, habitId: string, today = todayKey()): number {
  const habit = habitById(st, habitId)
  if (!habit) return 0
  let best = 0
  let run = 0
  for (let day = habit.startDate; day <= today; day = shiftDay(day, 1)) {
    if (!isScheduled(habit, day)) continue
    if (isChecked(st, habitId, day)) {
      run++
      if (run > best) best = run
    } else if (day !== today) run = 0
  }
  return best
}

/* ---------- quit habits: slips + clean runs ---------- */

/** Slips can be logged or corrected on any counted past day — the record stays honest. */
export function setSlip(habitId: string, day: string, value: boolean): void {
  if (day > todayKey()) return
  const st = cadenceStore.get()
  const habit = habitById(st, habitId)
  if (!habit || habit.type !== 'quit') return
  if (day < habit.startDate) return
  cadenceStore.set((s) => {
    const list = s.slips[habitId] ?? []
    if (value === list.includes(day)) return s
    const next = value ? [...list, day].sort() : list.filter((d) => d !== day)
    return { ...s, slips: { ...s.slips, [habitId]: next } }
  })
}

export function logSlip(habitId: string): void {
  setSlip(habitId, todayKey(), true)
}

export function undoTodaySlip(habitId: string): void {
  setSlip(habitId, todayKey(), false)
}

/** Days clean counting today: 0 if slipped today, else run since the day after the last slip. */
export function daysClean(st: CadenceState, habitId: string, today = todayKey()): number {
  const habit = habitById(st, habitId)
  if (!habit) return 0
  const slips = slipDays(st, habitId)
  if (slips.includes(today)) return 0
  const lastSlip = slips.filter((d) => d <= today).sort().pop()
  const start = lastSlip ? shiftDay(lastSlip, 1) : habit.startDate
  if (today < start) return 0
  return dayDiff(start, today) + 1
}

/** Longest clean run since the quit date. */
export function bestClean(st: CadenceState, habitId: string, today = todayKey()): number {
  const habit = habitById(st, habitId)
  if (!habit) return 0
  const slips = slipDays(st, habitId).filter((d) => d <= today).sort()
  let best = 0
  let cursor = habit.startDate
  for (const slip of slips) {
    if (slip > cursor) {
      const len = dayDiff(cursor, shiftDay(slip, -1)) + 1
      if (len > best) best = len
    }
    cursor = shiftDay(slip, 1)
  }
  if (today >= cursor) {
    const len = dayDiff(cursor, today) + 1
    if (len > best) best = len
  }
  return best
}

/* ---------- strength: recency-weighted consistency (0–100) ---------- */

/** Loop-style EMA over counted days, ~30-day half-life. Today-unchecked is neutral. */
export function strength(st: CadenceState, habitId: string, today = todayKey()): number {
  const habit = habitById(st, habitId)
  if (!habit || habit.startDate > today) return 0
  const alpha = 1 - Math.pow(0.5, 1 / 30)
  let ema = 0
  let started = false
  for (let day = habit.startDate; day <= today; day = shiftDay(day, 1)) {
    let x: number
    if (habit.type === 'quit') {
      x = slipDays(st, habitId).includes(day) ? 0 : 1
    } else {
      if (!isScheduled(habit, day)) continue
      if (day === today && !isChecked(st, habitId, day)) continue
      x = isChecked(st, habitId, day) ? 1 : 0
    }
    if (!started) {
      ema = x
      started = true
    } else {
      ema += alpha * (x - ema)
    }
  }
  return Math.round(ema * 100)
}

/* ---------- range + day aggregates ---------- */

export interface RangeStat {
  rate: number | null
  done: number
  total: number
}

/** Completion over an inclusive day range, clamped to [startDate, today]. */
export function rangeStat(st: CadenceState, h: Habit, aKey: string, bKey: string, today = todayKey()): RangeStat {
  let done = 0
  let total = 0
  const start = aKey < h.startDate ? h.startDate : aKey
  const end = bKey > today ? today : bKey
  for (let day = start; day <= end; day = shiftDay(day, 1)) {
    if (h.type === 'quit') {
      total++
      if (!slipDays(st, h.id).includes(day)) done++
    } else if (isScheduled(h, day)) {
      if (day === today && !isChecked(st, h.id, day)) continue
      total++
      if (isChecked(st, h.id, day)) done++
    }
  }
  return { rate: total > 0 ? Math.round((done / total) * 100) : null, done, total }
}

/**
 * 0..1 across active habits for one day, or null when nothing counted.
 * Builds: done vs missed. Quits: clean vs slip — a clean day is a win too.
 */
export function dayIntensity(st: CadenceState, day: string, today = todayKey()): number | null {
  let good = 0
  let considered = 0
  for (const h of activeHabits(st)) {
    const s = statusOf(st, h, day, today)
    if (s === 'done' || s === 'clean') {
      good++
      considered++
    } else if (s === 'missed' || s === 'slip') {
      considered++
    }
  }
  return considered > 0 ? good / considered : null
}

/* ---------- month grid ---------- */

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

/* ---------- year grid (calendar year, Monday-start columns) ---------- */

export interface YearCell {
  key: string
  inYear: boolean
}

/** 52–54 week columns covering Jan 1 – Dec 31, padded to full Monday-start weeks. */
export function yearWeeks(year: number): YearCell[][] {
  const jan1 = `${year}-01-01`
  const dec31 = `${year}-12-31`
  let cursor = weekStartKey(jan1)
  const weeks: YearCell[][] = []
  while (cursor <= dec31) {
    const week: YearCell[] = []
    for (let i = 0; i < 7; i++) {
      const key = shiftDay(cursor, i)
      week.push({ key, inYear: key >= jan1 && key <= dec31 })
    }
    weeks.push(week)
    cursor = shiftDay(cursor, 7)
  }
  return weeks
}

/* ---------- insights ---------- */

export interface MonthInsights {
  avgCompletion: number | null
  activeHabits: number
  mostConsistent: { name: string; emoji: string; pct: number } | null
}

export function monthInsights(st: CadenceState, grid: MonthGrid, today = todayKey()): MonthInsights {
  const habits = activeHabits(st)
  const aKey = monthDayKey(grid, 1)
  const bKey = monthDayKey(grid, grid.days)
  const rates: number[] = []
  let mostConsistent: MonthInsights['mostConsistent'] = null
  for (const h of habits) {
    const s = rangeStat(st, h, aKey, bKey, today)
    if (s.rate === null) continue
    rates.push(s.rate)
    if (!mostConsistent || s.rate > mostConsistent.pct) {
      mostConsistent = { name: h.name, emoji: h.emoji, pct: s.rate }
    }
  }
  return {
    avgCompletion: rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
    activeHabits: habits.length,
    mostConsistent,
  }
}

export interface YearInsights {
  checkIns: number
  activeDays: number
  bestStreak: number
  habitsTracked: number
  avgMood: number | null
}

/** Over the selected calendar year. Best streak = best run ever recorded, build or clean. */
export function yearInsights(st: CadenceState, year: number, today = todayKey()): YearInsights {
  const aKey = `${year}-01-01`
  const bKey = `${year}-12-31`
  const habits = activeHabits(st)
  let checkIns = 0
  const daysWithAny = new Set<string>()
  for (const [day, ids] of Object.entries(st.checks)) {
    if (day < aKey || day > bKey || day > today || ids.length === 0) continue
    checkIns += ids.length
    daysWithAny.add(day)
  }
  let bestStreak = 0
  for (const h of habits) {
    const s = h.type === 'build' ? bestBuildStreak(st, h.id, today) : bestClean(st, h.id, today)
    if (s > bestStreak) bestStreak = s
  }
  const moods = Object.entries(st.moods ?? {}).filter(([d]) => d >= aKey && d <= bKey && d <= today)
  const avgMood =
    moods.length > 0 ? Math.round((moods.reduce((s, [, v]) => s + v, 0) / moods.length) * 10) / 10 : null
  return { checkIns, activeDays: daysWithAny.size, bestStreak, habitsTracked: habits.length, avgMood }
}

/* ---------- weekly engine (the 1% score) ---------- */

/** Scheduled, counted days of `h` inside the week starting at `weekStart` (Monday key). */
export function dueDaysInWeek(h: Habit, weekStart: string): number {
  let due = 0
  for (let i = 0; i < 7; i++) {
    const day = shiftDay(weekStart, i)
    if (day >= h.startDate && isScheduled(h, day)) due++
  }
  return due
}

export function checksInWeek(st: CadenceState, habitId: string, weekStart: string): number {
  let n = 0
  for (let i = 0; i < 7; i++) {
    if ((st.checks[shiftDay(weekStart, i)] ?? []).includes(habitId)) n++
  }
  return n
}

/**
 * Weekly completion 0..1 for the engine: builds score checks over scheduled
 * days; quit habits count clean-day progress toward a 7-day run.
 * Null with no habits (or none yet counted that week).
 */
export function weekCompletion(st: CadenceState, weekStart: string, today = todayKey()): number | null {
  const habits = activeHabits(st)
  let sum = 0
  let n = 0
  for (const h of habits) {
    if (h.type === 'build') {
      const due = dueDaysInWeek(h, weekStart)
      if (due === 0) continue
      sum += Math.min(1, checksInWeek(st, h.id, weekStart) / due)
    } else {
      sum += Math.min(1, Math.min(daysClean(st, h.id, today), 7) / 7)
    }
    n++
  }
  return n > 0 ? sum / n : null
}

/** The single most effective remaining move this week, for the Today screen. */
export function weekAdvice(st: CadenceState, weekStart: string, today = todayKey()): string | null {
  let worst: { name: string; missing: number } | null = null
  for (const h of activeHabits(st)) {
    if (h.type !== 'build') continue
    const missing = dueDaysInWeek(h, weekStart) - checksInWeek(st, h.id, weekStart)
    if (missing > 0 && (worst === null || missing > worst.missing)) worst = { name: h.name, missing }
  }
  if (worst) {
    return `Check ${worst.name} on ${worst.missing} more day${worst.missing === 1 ? '' : 's'} to complete the week.`
  }
  const quit = activeHabits(st).find((h) => h.type === 'quit' && daysClean(st, h.id, today) < 7)
  if (quit) return `${quit.name}: ${7 - daysClean(st, quit.id, today)} clean days to the 7-day run.`
  return null
}

/* ---------- mood ---------- */

export function setMood(day: string, score: number): void {
  cadenceStore.set((s) => {
    const moods = { ...(s.moods ?? {}) }
    if (moods[day] === score) delete moods[day]
    else moods[day] = Math.min(5, Math.max(1, Math.round(score)))
    return { ...s, moods }
  })
}

export function moodOn(st: CadenceState, day: string): number | null {
  return st.moods?.[day] ?? null
}

/** Mean of the most recent `n` logged moods (any days), null if none. */
export function recentMoodAvg(st: CadenceState, n = 3): number | null {
  const entries = Object.entries(st.moods ?? {}).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, n)
  if (entries.length === 0) return null
  return entries.reduce((s, [, v]) => s + v, 0) / entries.length
}

/** Average mood across one month grid up to today, null if none logged. */
export function monthMoodAvg(st: CadenceState, grid: MonthGrid, today = todayKey()): number | null {
  const a = monthDayKey(grid, 1)
  const b = monthDayKey(grid, grid.days)
  const vals = Object.entries(st.moods ?? {}).filter(([d]) => d >= a && d <= b && d <= today)
  if (vals.length === 0) return null
  return Math.round((vals.reduce((s, [, v]) => s + v, 0) / vals.length) * 10) / 10
}

export const MOOD_FACES = ['😞', '😕', '😐', '🙂', '😄'] as const

/* ---------------- v5: fractional day progress (integration-fed) ---------------- */

/** 1 when fully checked, else any partial fraction, else 0. */
export function checkFraction(st: CadenceState, habitId: string, day: string): number {
  if (isChecked(st, habitId, day)) return 1
  const f = st.progress?.[day]?.[habitId]
  return typeof f === 'number' && f > 0 ? Math.min(1, f) : 0
}

/**
 * Authoritative fraction write for a day a source-of-truth integration manages:
 * ≥1 promotes to a real check (events, streak toast — the full ceremony),
 * 0<f<1 demotes any check and records the partial bar,
 * ≤0 clears both. Manual checks on days no integration touches are unaffected,
 * because integrations only call this when they actually have doses due.
 */
export function setCheckFraction(habitId: string, day: string, frac: number): void {
  const f = Math.max(0, Math.min(1, frac))
  if (f >= 0.999) {
    setCheck(habitId, day, true)
    cadenceStore.set((s) => {
      if (!s.progress?.[day]?.[habitId]) return s
      const dayMap = { ...s.progress[day] }
      delete dayMap[habitId]
      return { ...s, progress: { ...s.progress, [day]: dayMap } }
    })
    return
  }
  setCheck(habitId, day, false)
  const existing = cadenceStore.get().progress?.[day]?.[habitId]
  const rounded = Math.round(f * 100) / 100
  if (f > 0 && existing === rounded) return
  cadenceStore.set((s) => {
    const progress = { ...(s.progress ?? {}) }
    const dayMap = { ...(progress[day] ?? {}) }
    if (f <= 0) delete dayMap[habitId]
    else dayMap[habitId] = Math.round(f * 100) / 100
    progress[day] = dayMap
    return { ...s, progress }
  })
}

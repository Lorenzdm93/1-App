import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent } from '../../core/events'
import { dayKey, todayKey, shiftDay, weekStartKey } from '../../core/dates'
import { e1rm } from '../../core/strength'

export type SetType = 'normal' | 'warmup' | 'drop' | 'fail'

export const SET_TYPE_ORDER: readonly SetType[] = ['normal', 'warmup', 'drop', 'fail']

export interface SetEntry {
  id: string
  weight: number
  reps: number
  type: SetType
  /** Planned rows start undone; only done sets count and get saved. */
  done: boolean
}

export interface ExerciseEntry {
  id: string
  name: string
  sets: SetEntry[]
}

export interface Session {
  id: string
  startTs: number
  endTs?: number
  /** Set when started from a template. */
  templateName?: string
  exercises: ExerciseEntry[]
}

export interface TemplateExercise {
  name: string
  targetSets: number
}

export interface Template {
  id: string
  name: string
  exercises: TemplateExercise[]
}

export interface GhisaState {
  active: Session | null
  history: Session[] // newest first
  restUntil: number | null
  restSeconds: number
  templates: Template[]
}

function seedTemplates(): Template[] {
  return [
    {
      id: uid() + 'p',
      name: 'Push',
      exercises: [
        { name: 'Bench Press', targetSets: 4 },
        { name: 'Overhead Press', targetSets: 3 },
        { name: 'Incline Bench Press', targetSets: 3 },
        { name: 'Lateral Raise', targetSets: 3 },
        { name: 'Triceps Pushdown', targetSets: 3 },
      ],
    },
    {
      id: uid() + 'q',
      name: 'Pull',
      exercises: [
        { name: 'Barbell Row', targetSets: 4 },
        { name: 'Pull-up', targetSets: 3 },
        { name: 'Seated Cable Row', targetSets: 3 },
        { name: 'Face Pull', targetSets: 3 },
        { name: 'Biceps Curl', targetSets: 3 },
      ],
    },
    {
      id: uid() + 'r',
      name: 'Legs',
      exercises: [
        { name: 'Squat', targetSets: 4 },
        { name: 'Romanian Deadlift', targetSets: 3 },
        { name: 'Leg Press', targetSets: 3 },
        { name: 'Leg Curl', targetSets: 3 },
        { name: 'Calf Raise', targetSets: 4 },
      ],
    },
  ]
}

const DEFAULTS: GhisaState = {
  active: null,
  history: [],
  restUntil: null,
  restSeconds: 90,
  templates: seedTemplates(),
}

function normalizeSet(s: Partial<SetEntry>): SetEntry {
  return {
    id: typeof s.id === 'string' ? s.id : uid(),
    weight: typeof s.weight === 'number' ? s.weight : 0,
    reps: typeof s.reps === 'number' ? s.reps : 0,
    type: s.type === 'warmup' || s.type === 'drop' || s.type === 'fail' ? s.type : 'normal',
    done: typeof s.done === 'boolean' ? s.done : true,
  }
}

function plannedSet(weight = 0, reps = 0): SetEntry {
  return { id: uid(), weight, reps, type: 'normal', done: false }
}

function normalizeSession(raw: Session): Session {
  return {
    ...raw,
    exercises: (raw.exercises ?? []).map((ex) => ({
      ...ex,
      sets: (ex.sets ?? []).map(normalizeSet),
    })),
  }
}

/** v1: no rest fields. v2: no set types, no templates. v3: no done flag. */
export function migrateGhisa(data: unknown, fromVersion: number): GhisaState {
  if (fromVersion >= 1 && fromVersion <= 3 && data !== null && typeof data === 'object') {
    const d = data as Partial<GhisaState>
    return {
      active: d.active ? normalizeSession(d.active) : null,
      history: Array.isArray(d.history) ? d.history.map(normalizeSession) : [],
      restUntil: null,
      restSeconds: typeof d.restSeconds === 'number' ? d.restSeconds : 90,
      templates:
        Array.isArray(d.templates) && d.templates.length > 0 ? d.templates : seedTemplates(),
    }
  }
  return DEFAULTS
}

export const ghisaStore = createPersistedStore<GhisaState>('ghisa', DEFAULTS, 4, migrateGhisa)

export const EXERCISES: readonly string[] = [
  'Squat',
  'Front Squat',
  'Leg Press',
  'Romanian Deadlift',
  'Deadlift',
  'Hip Thrust',
  'Leg Curl',
  'Leg Extension',
  'Calf Raise',
  'Bench Press',
  'Incline Bench Press',
  'Dumbbell Press',
  'Overhead Press',
  'Lateral Raise',
  'Dip',
  'Push-up',
  'Barbell Row',
  'Dumbbell Row',
  'Lat Pulldown',
  'Pull-up',
  'Seated Cable Row',
  'Face Pull',
  'Biceps Curl',
  'Hammer Curl',
  'Triceps Pushdown',
  'Skull Crusher',
  'Plank',
  'Cable Crunch',
]

/* ---------- derived ---------- */

/** Working volume — completed, non-warmup sets only. */
export function sessionVolume(s: Session): number {
  let v = 0
  for (const ex of s.exercises)
    for (const set of ex.sets) if (set.done && set.type !== 'warmup') v += set.weight * set.reps
  return v
}

export function sessionSets(s: Session): number {
  let n = 0
  for (const ex of s.exercises) n += ex.sets.length
  return n
}

export function workingSets(s: Session): number {
  let n = 0
  for (const ex of s.exercises)
    for (const set of ex.sets) if (set.done && set.type !== 'warmup') n++
  return n
}

export function doneSets(s: Session): number {
  let n = 0
  for (const ex of s.exercises) for (const set of ex.sets) if (set.done) n++
  return n
}

/* ---------- session actions ---------- */

export function startSession(): void {
  ghisaStore.set((st) =>
    st.active ? st : { ...st, active: { id: uid(), startTs: Date.now(), exercises: [] } },
  )
}

export function startFromTemplate(templateId: string): void {
  ghisaStore.set((st) => {
    if (st.active) return st
    const tpl = st.templates.find((t) => t.id === templateId)
    if (!tpl) return st
    return {
      ...st,
      active: {
        id: uid(),
        startTs: Date.now(),
        templateName: tpl.name,
        exercises: tpl.exercises.map((e) => ({
          id: uid(),
          name: e.name,
          sets: Array.from({ length: Math.max(1, e.targetSets) }, () => plannedSet()),
        })),
      },
    }
  })
}

export function addExercise(name: string): void {
  const clean = name.trim()
  if (!clean) return
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      active: {
        ...st.active,
        exercises: [...st.active.exercises, { id: uid(), name: clean, sets: [plannedSet()] }],
      },
    }
  })
}

export function removeExercise(exerciseId: string): void {
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      active: {
        ...st.active,
        exercises: st.active.exercises.filter((ex) => ex.id !== exerciseId),
      },
    }
  })
}

export function addSet(
  exerciseId: string,
  weight: number,
  reps: number,
  type: SetType = 'normal',
): void {
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      restUntil: Date.now() + st.restSeconds * 1000,
      active: {
        ...st.active,
        exercises: st.active.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: [...ex.sets, { id: uid(), weight, reps, type, done: true }] }
            : ex,
        ),
      },
    }
  })
}

/** Cycle a set through normal → warmup → drop → fail — the Hevy tap. */
export function cycleSetType(exerciseId: string, setId: string): void {
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      active: {
        ...st.active,
        exercises: st.active.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) => {
                  if (s.id !== setId) return s
                  const next =
                    SET_TYPE_ORDER[(SET_TYPE_ORDER.indexOf(s.type) + 1) % SET_TYPE_ORDER.length]
                  return { ...s, type: next }
                }),
              }
            : ex,
        ),
      },
    }
  })
}

/** Appends a planned row, copying the previous row's numbers as a starting point. */
export function addPlannedSet(exerciseId: string): void {
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      active: {
        ...st.active,
        exercises: st.active.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex
          const last = ex.sets[ex.sets.length - 1]
          return { ...ex, sets: [...ex.sets, plannedSet(last?.weight ?? 0, last?.reps ?? 0)] }
        }),
      },
    }
  })
}

export function updateSet(
  exerciseId: string,
  setId: string,
  patch: { weight?: number; reps?: number },
): void {
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      active: {
        ...st.active,
        exercises: st.active.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
            : ex,
        ),
      },
    }
  })
}

/**
 * Marks a set done and starts the rest timer. Empty rows adopt the fallback
 * (previous session's numbers) so a bare checkmark repeats last time.
 * Returns false when there's nothing usable to log.
 */
export function completeSet(
  exerciseId: string,
  setId: string,
  fallback?: { weight: number; reps: number },
): boolean {
  const st = ghisaStore.get()
  if (!st.active) return false
  const ex = st.active.exercises.find((e) => e.id === exerciseId)
  const set = ex?.sets.find((s) => s.id === setId)
  if (!ex || !set) return false
  let weight = set.weight
  let reps = set.reps
  if (reps < 1 && fallback && fallback.reps >= 1) {
    weight = fallback.weight
    reps = fallback.reps
  }
  if (reps < 1) return false
  ghisaStore.set((s) => ({
    ...s,
    restUntil: Date.now() + s.restSeconds * 1000,
    active: {
      ...s.active!,
      exercises: s.active!.exercises.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((x) => (x.id === setId ? { ...x, weight, reps, done: true } : x)),
            }
          : e,
      ),
    },
  }))
  return true
}

export function uncompleteSet(exerciseId: string, setId: string): void {
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      active: {
        ...st.active,
        exercises: st.active.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, done: false } : s)) }
            : ex,
        ),
      },
    }
  })
}

export function removeSet(exerciseId: string, setId: string): void {
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      active: {
        ...st.active,
        exercises: st.active.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex,
        ),
      },
    }
  })
}

export function finishSession(): Session | null {
  const st = ghisaStore.get()
  if (!st.active) return null
  const closed: Session = {
    ...st.active,
    endTs: Date.now(),
    exercises: st.active.exercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done) }))
      .filter((ex) => ex.sets.length > 0),
  }
  if (closed.exercises.length === 0) {
    ghisaStore.set((s) => ({ ...s, active: null, restUntil: null }))
    return null
  }
  const trimmed = closed
  ghisaStore.set((s) => ({
    ...s,
    active: null,
    restUntil: null,
    history: [trimmed, ...s.history],
  }))
  const minutes = Math.round(((trimmed.endTs ?? Date.now()) - trimmed.startTs) / 60000)
  logEvent({
    module: 'ghisa',
    kind: 'workout',
    value: Math.round(sessionVolume(trimmed)),
    unit: 'kg',
    meta: {
      sets: workingSets(trimmed),
      exercises: trimmed.exercises.length,
      minutes,
      ...(trimmed.templateName ? { template: trimmed.templateName } : {}),
    },
  })
  return trimmed
}

export function discardSession(): void {
  ghisaStore.set((st) => ({ ...st, active: null, restUntil: null }))
}

export function skipRest(): void {
  ghisaStore.set((st) => ({ ...st, restUntil: null }))
}

export function adjustRest(deltaSeconds: number): void {
  ghisaStore.set((st) => {
    if (st.restUntil === null) return st
    const base = Math.max(st.restUntil, Date.now())
    return { ...st, restUntil: Math.max(Date.now(), base + deltaSeconds * 1000) }
  })
}

/* ---------- templates ---------- */

export function saveTemplate(template: {
  id?: string
  name: string
  exercises: TemplateExercise[]
}): void {
  const clean = template.name.trim()
  if (!clean || template.exercises.length === 0) return
  ghisaStore.set((st) => {
    if (template.id) {
      return {
        ...st,
        templates: st.templates.map((t) =>
          t.id === template.id ? { ...t, name: clean, exercises: template.exercises } : t,
        ),
      }
    }
    return {
      ...st,
      templates: [...st.templates, { id: uid(), name: clean, exercises: template.exercises }],
    }
  })
}

export function deleteTemplate(templateId: string): void {
  ghisaStore.set((st) => ({ ...st, templates: st.templates.filter((t) => t.id !== templateId) }))
}

/* ---------- prototype soul: previous values, PRs, per-exercise analytics ---------- */

export function previousSets(history: readonly Session[], exerciseName: string): SetEntry[] {
  const name = exerciseName.trim().toLowerCase()
  for (const session of history) {
    const match = session.exercises.find((ex) => ex.name.trim().toLowerCase() === name)
    if (match && match.sets.length > 0) return match.sets
  }
  return []
}

/** Heaviest non-warmup weight ever logged for this exercise. */
export function historicalMaxWeight(history: readonly Session[], exerciseName: string): number {
  const name = exerciseName.trim().toLowerCase()
  let max = 0
  for (const session of history) {
    for (const ex of session.exercises) {
      if (ex.name.trim().toLowerCase() !== name) continue
      for (const s of ex.sets) if (s.type !== 'warmup' && s.weight > max) max = s.weight
    }
  }
  return max
}

export interface ExerciseDay {
  ts: number
  sets: SetEntry[]
}

/** Sessions containing the exercise, newest first. */
export function exerciseHistory(history: readonly Session[], exerciseName: string): ExerciseDay[] {
  const name = exerciseName.trim().toLowerCase()
  const out: ExerciseDay[] = []
  for (const session of history) {
    const match = session.exercises.find((ex) => ex.name.trim().toLowerCase() === name)
    if (match && match.sets.length > 0) out.push({ ts: session.startTs, sets: match.sets })
  }
  return out
}

/** Best e1RM per session for the exercise, oldest → newest (sparkline-ready). */
export function e1rmSeries(history: readonly Session[], exerciseName: string): number[] {
  return exerciseHistory(history, exerciseName)
    .map((d) => {
      let best = 0
      for (const s of d.sets) {
        if (s.type === 'warmup' || s.reps < 1) continue
        const est = e1rm(s.weight, s.reps)
        if (est > best) best = est
      }
      return Math.round(best * 2) / 2
    })
    .filter((v) => v > 0)
    .reverse()
}

/** Best (heaviest non-warmup) set for the exercise across history. */
export function bestSet(history: readonly Session[], exerciseName: string): SetEntry | null {
  const name = exerciseName.trim().toLowerCase()
  let best: SetEntry | null = null
  for (const session of history) {
    for (const ex of session.exercises) {
      if (ex.name.trim().toLowerCase() !== name) continue
      for (const s of ex.sets) {
        if (s.type === 'warmup') continue
        if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
          best = s
        }
      }
    }
  }
  return best
}

export function allExerciseNames(history: readonly Session[]): string[] {
  const seen = new Map<string, string>()
  for (const session of history) {
    for (const ex of session.exercises) {
      const key = ex.name.trim().toLowerCase()
      if (!seen.has(key)) seen.set(key, ex.name.trim())
    }
  }
  return [...seen.values()].sort()
}

/* ---------- stats ---------- */

export interface WeekBucket {
  label: string
  value: number
}

/** Working volume per 7-day bucket, oldest → newest, `weeks` buckets ending today. */
export function weeklyVolume(history: readonly Session[], weeks = 8): WeekBucket[] {
  const today = todayKey()
  const buckets: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = shiftDay(today, -(i * 7 + 6))
    const end = shiftDay(today, -(i * 7))
    let value = 0
    for (const s of history) {
      const k = dayKey(s.startTs)
      if (k >= start && k <= end) value += sessionVolume(s)
    }
    const [, , d] = start.split('-')
    const [, m] = start.split('-')
    buckets.push({ label: `${Number(d)}/${Number(m)}`, value: Math.round(value) })
  }
  return buckets
}

export function topExercises(
  history: readonly Session[],
  n = 5,
): { name: string; sets: number }[] {
  const counts = new Map<string, { name: string; sets: number }>()
  for (const session of history) {
    for (const ex of session.exercises) {
      const key = ex.name.trim().toLowerCase()
      const entry = counts.get(key) ?? { name: ex.name.trim(), sets: 0 }
      entry.sets += ex.sets.filter((s) => s.type !== 'warmup').length
      counts.set(key, entry)
    }
  }
  return [...counts.values()].sort((a, b) => b.sets - a.sets).slice(0, n)
}

/* ---------- insights: period aggregation & comparison ---------- */

export type Period = 'week' | 'month' | 'year'

export interface PeriodRange {
  start: string
  end: string
  label: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Calendar-aligned range for `offset` periods back (0 = current). */
export function periodRange(period: Period, offset: number, today = todayKey()): PeriodRange {
  if (period === 'week') {
    const start = shiftDay(weekStartKey(today), -7 * offset)
    const end = shiftDay(start, 6)
    const [, m, d] = start.split('-')
    return { start, end, label: offset === 0 ? 'This week' : `Wk of ${Number(d)}/${Number(m)}` }
  }
  const [y, m] = today.split('-').map(Number)
  if (period === 'month') {
    const date = new Date(y, m - 1 - offset, 1, 12)
    const yy = date.getFullYear()
    const mm = date.getMonth()
    const start = dayKey(date.getTime())
    const end = dayKey(new Date(yy, mm + 1, 0, 12).getTime())
    return { start, end, label: `${MONTHS[mm]} ${yy}` }
  }
  const yy = y - offset
  return { start: `${yy}-01-01`, end: `${yy}-12-31`, label: String(yy) }
}

export interface PeriodStats {
  workouts: number
  volume: number
  sets: number
  reps: number
  minutes: number
  avgMinutes: number
}

export function aggregatePeriod(history: readonly Session[], range: PeriodRange): PeriodStats {
  let workouts = 0
  let volume = 0
  let sets = 0
  let reps = 0
  let minutes = 0
  for (const s of history) {
    const k = dayKey(s.startTs)
    if (k < range.start || k > range.end) continue
    workouts++
    volume += sessionVolume(s)
    minutes += s.endTs ? Math.round((s.endTs - s.startTs) / 60000) : 0
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.done || set.type === 'warmup') continue
        sets++
        reps += set.reps
      }
    }
  }
  return {
    workouts,
    volume: Math.round(volume),
    sets,
    reps,
    minutes,
    avgMinutes: workouts > 0 ? Math.round(minutes / workouts) : 0,
  }
}

/** % change vs previous; null when the previous period had nothing ("new"). */
export function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

export interface InsightBucket {
  label: string
  value: number
}

/** Chart breakdown for the current period: week→sessions, month→weeks, year→months. */
export function periodBuckets(
  history: readonly Session[],
  period: Period,
  today = todayKey(),
): InsightBucket[] {
  const range = periodRange(period, 0, today)
  if (period === 'week') {
    return history
      .filter((s) => {
        const k = dayKey(s.startTs)
        return k >= range.start && k <= range.end
      })
      .sort((a, b) => a.startTs - b.startTs)
      .map((s) => {
        const d = new Date(s.startTs)
        return {
          label: d.toLocaleDateString(undefined, { weekday: 'short' }),
          value: Math.round(sessionVolume(s)),
        }
      })
  }
  if (period === 'month') {
    const buckets: InsightBucket[] = []
    let wStart = weekStartKey(range.start)
    let i = 1
    while (wStart <= range.end) {
      const wEnd = shiftDay(wStart, 6)
      let v = 0
      for (const s of history) {
        const k = dayKey(s.startTs)
        if (k >= wStart && k <= wEnd && k >= range.start && k <= range.end) v += sessionVolume(s)
      }
      buckets.push({ label: `W${i}`, value: Math.round(v) })
      wStart = shiftDay(wStart, 7)
      i++
    }
    return buckets
  }
  const year = Number(range.start.slice(0, 4))
  return MONTHS.map((label, mi) => {
    const start = dayKey(new Date(year, mi, 1, 12).getTime())
    const end = dayKey(new Date(year, mi + 1, 0, 12).getTime())
    let v = 0
    for (const s of history) {
      const k = dayKey(s.startTs)
      if (k >= start && k <= end) v += sessionVolume(s)
    }
    return { label: label[0], value: Math.round(v) }
  })
}

/** The coaching card — the principles that survive every program fad. */
export const TRAINING_ADVICE: readonly { title: string; body: string }[] = [
  {
    title: 'Progressive overload is the whole game',
    body: 'Add a rep, a set, or 2.5 kg — one of them, most weeks. The charts above exist to catch the weeks where nothing moved. Volume drifting up over months matters more than any single session.',
  },
  {
    title: 'Keep the program longer than feels exciting',
    body: 'Eight to twelve weeks minimum before changing anything structural. Templates here are deliberately reusable: the value is in the repetition, because you can only progress on what you repeat.',
  },
  {
    title: 'Core lifts carry the load',
    body: 'Squat, bench, deadlift, press, row — get stronger on these and log them honestly. Accessories are where freedom lives: rotate them by feel without guilt, they season the meal, they are not the meal.',
  },
  {
    title: 'Warmups are preparation, not production',
    body: "That's why W-sets are excluded from volume and PRs everywhere in GHISA — inflating the numbers would only blur the signal you're training for.",
  },
]

import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent } from '../../core/events'

export interface SetEntry {
  id: string
  weight: number
  reps: number
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
  exercises: ExerciseEntry[]
}

export interface GhisaState {
  active: Session | null
  history: Session[] // newest first
  /** Rest timer target (epoch ms) — timestamp-based, throttling-proof. */
  restUntil: number | null
  restSeconds: number
}

const DEFAULTS: GhisaState = {
  active: null,
  history: [],
  restUntil: null,
  restSeconds: 90,
}

/** v1 predates the rest timer — carry sessions over, fill new fields. */
export function migrateGhisa(data: unknown, fromVersion: number): GhisaState {
  if (fromVersion === 1 && data !== null && typeof data === 'object') {
    const d = data as Partial<GhisaState>
    return {
      ...DEFAULTS,
      active: d.active ?? null,
      history: Array.isArray(d.history) ? d.history : [],
    }
  }
  return DEFAULTS
}

export const ghisaStore = createPersistedStore<GhisaState>('ghisa', DEFAULTS, 2, migrateGhisa)

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

export function sessionVolume(s: Session): number {
  let v = 0
  for (const ex of s.exercises) for (const set of ex.sets) v += set.weight * set.reps
  return v
}

export function sessionSets(s: Session): number {
  let n = 0
  for (const ex of s.exercises) n += ex.sets.length
  return n
}

/* ---------- actions ---------- */

export function startSession(): void {
  ghisaStore.set((st) =>
    st.active ? st : { ...st, active: { id: uid(), startTs: Date.now(), exercises: [] } },
  )
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
        exercises: [...st.active.exercises, { id: uid(), name: clean, sets: [] }],
      },
    }
  })
}

export function addSet(exerciseId: string, weight: number, reps: number): void {
  ghisaStore.set((st) => {
    if (!st.active) return st
    return {
      ...st,
      restUntil: Date.now() + st.restSeconds * 1000,
      active: {
        ...st.active,
        exercises: st.active.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: [...ex.sets, { id: uid(), weight, reps }] }
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

/** Finishes the active session. Returns the archived session, or null if it was empty. */
export function finishSession(): Session | null {
  const st = ghisaStore.get()
  if (!st.active) return null
  const done: Session = { ...st.active, endTs: Date.now() }
  const hasWork = done.exercises.some((ex) => ex.sets.length > 0)
  if (!hasWork) {
    ghisaStore.set((s) => ({ ...s, active: null, restUntil: null }))
    return null
  }
  const trimmed: Session = {
    ...done,
    exercises: done.exercises.filter((ex) => ex.sets.length > 0),
  }
  ghisaStore.set((s) => ({ ...s, active: null, restUntil: null, history: [trimmed, ...s.history] }))
  const minutes = Math.round(((trimmed.endTs ?? Date.now()) - trimmed.startTs) / 60000)
  logEvent({
    module: 'ghisa',
    kind: 'workout',
    value: Math.round(sessionVolume(trimmed)),
    unit: 'kg',
    meta: { sets: sessionSets(trimmed), exercises: trimmed.exercises.length, minutes },
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

/* ---------- prototype soul: previous values + PR detection ---------- */

/** Sets from the most recent past session containing this exercise. */
export function previousSets(history: readonly Session[], exerciseName: string): SetEntry[] {
  const name = exerciseName.trim().toLowerCase()
  for (const session of history) {
    const match = session.exercises.find((ex) => ex.name.trim().toLowerCase() === name)
    if (match && match.sets.length > 0) return match.sets
  }
  return []
}

/** Heaviest weight ever logged for this exercise across history. */
export function historicalMaxWeight(history: readonly Session[], exerciseName: string): number {
  const name = exerciseName.trim().toLowerCase()
  let max = 0
  for (const session of history) {
    for (const ex of session.exercises) {
      if (ex.name.trim().toLowerCase() !== name) continue
      for (const s of ex.sets) if (s.weight > max) max = s.weight
    }
  }
  return max
}

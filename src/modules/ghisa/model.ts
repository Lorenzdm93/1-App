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
}

export const ghisaStore = createPersistedStore<GhisaState>('ghisa', {
  active: null,
  history: [],
})

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
    ghisaStore.set((s) => ({ ...s, active: null }))
    return null
  }
  const trimmed: Session = {
    ...done,
    exercises: done.exercises.filter((ex) => ex.sets.length > 0),
  }
  ghisaStore.set((s) => ({ active: null, history: [trimmed, ...s.history] }))
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
  ghisaStore.set((st) => ({ ...st, active: null }))
}

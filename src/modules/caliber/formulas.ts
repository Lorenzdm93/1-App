/**
 * Strength math. Standards are bodyweight-ratio approximations for
 * orientation, not competition percentiles — a compass, not a scale.
 */

export type Sex = 'm' | 'f'

export interface Lift {
  id: string
  name: string
}

export const LIFTS: readonly Lift[] = [
  { id: 'squat', name: 'Squat' },
  { id: 'bench', name: 'Bench' },
  { id: 'deadlift', name: 'Deadlift' },
  { id: 'ohp', name: 'OHP' },
  { id: 'row', name: 'Row' },
]

export function liftById(id: string): Lift {
  return LIFTS.find((l) => l.id === id) ?? LIFTS[0]
}

export { epley, brzycki, e1rm, repsForTarget, weightForTarget } from '../../core/strength'

export const LEVELS: readonly string[] = [
  'Untrained',
  'Beginner',
  'Novice',
  'Intermediate',
  'Advanced',
  'Elite',
]

/** Bodyweight multiples marking the entry to Beginner … Elite (5 thresholds → 6 buckets). */
export const STANDARDS: Record<string, Record<Sex, readonly number[]>> = {
  squat: { m: [0.8, 1.2, 1.6, 2.1, 2.6], f: [0.5, 0.8, 1.2, 1.6, 2.0] },
  bench: { m: [0.6, 0.9, 1.2, 1.6, 2.0], f: [0.35, 0.5, 0.75, 1.0, 1.3] },
  deadlift: { m: [1.0, 1.4, 1.9, 2.4, 3.0], f: [0.6, 1.0, 1.4, 1.9, 2.3] },
  ohp: { m: [0.4, 0.6, 0.8, 1.05, 1.3], f: [0.25, 0.4, 0.5, 0.7, 0.85] },
  row: { m: [0.5, 0.8, 1.0, 1.3, 1.6], f: [0.35, 0.5, 0.7, 0.9, 1.1] },
}

export interface LevelResult {
  /** 0 = Untrained … 5 = Elite */
  index: number
  name: string
  /** Progress within the current bucket toward the next threshold, 0..1. Elite: 1. */
  frac: number
}

export function levelFor(liftId: string, sex: Sex, ratio: number): LevelResult {
  const thresholds = (STANDARDS[liftId] ?? STANDARDS.bench)[sex]
  let index = 0
  while (index < thresholds.length && ratio >= thresholds[index]) index++
  let frac: number
  if (index >= thresholds.length) {
    frac = 1
  } else {
    const lower = index === 0 ? 0 : thresholds[index - 1]
    const upper = thresholds[index]
    frac = upper > lower ? Math.min(Math.max((ratio - lower) / (upper - lower), 0), 1) : 0
  }
  return { index, name: LEVELS[index], frac }
}

/** Approximate population percentile at each threshold entry (Beginner … Elite). */
export const PERCENTILES: readonly number[] = [5, 20, 50, 80, 95]

/** "Stronger than ~X% of lifters in your weight class" — interpolated within the bucket. */
export function percentileFor(level: LevelResult): number {
  const lower = level.index === 0 ? 0 : PERCENTILES[level.index - 1]
  const upper = level.index >= PERCENTILES.length ? 99 : PERCENTILES[level.index]
  return Math.round(lower + level.frac * (upper - lower))
}

export interface Confidence {
  label: 'High' | 'Good' | 'Fair' | 'Rough'
  /** 0 green … 2 red-ish, used for the dot colour. */
  grade: 0 | 1 | 2
  note: string
}

/** e1RM formulas diverge as reps rise — the dot says how much to trust the number. */
export function confidenceFor(reps: number): Confidence {
  if (reps <= 3) return { label: 'High', grade: 0, note: 'Triples and under track a true 1RM closely.' }
  if (reps <= 6) return { label: 'Good', grade: 0, note: 'The classic estimation zone — Epley and Brzycki agree well here.' }
  if (reps <= 10) return { label: 'Fair', grade: 1, note: 'The formulas start diverging; treat the number as a range.' }
  return { label: 'Rough', grade: 2, note: 'Past ten reps this measures endurance more than max strength.' }
}

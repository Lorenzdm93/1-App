/**
 * GHISA → platform integrations, fired once per finished workout.
 *
 * This file is deliberately the ONLY place GHISA touches sibling modules.
 * Each integration is fault-isolated: a failure in CALIBER or CADENCE can
 * never break a workout save. The pure decision functions are exported for
 * tests; `runFinishIntegrations` is the single impure entry point.
 *
 * Architectural note: when a third consumer appears, this pattern should be
 * inverted into event-bus subscriptions (modules reacting to ghisa events)
 * instead of direct calls. Two consumers doesn't justify that machinery yet.
 */
import { epley, latestWeight, ghisaStore, type Workout } from './model'
import { caliberStore, logTest } from '../caliber/model'
import {
  cadenceStore,
  activeHabits,
  isChecked,
  toggleCheck,
  type Habit,
} from '../cadence/model'
import { todayKey } from '../../core/dates'

/* ------------------------- CALIBER: PR handoff ------------------------- */

/** GHISA library id → CALIBER lift id. Only true barbell-standard matches. */
export const GHISA_TO_CALIBER: Record<string, string> = {
  'bench-press': 'bench',
  'squat': 'squat',
  'deadlift': 'deadlift',
  'ohp': 'ohp',
  'barbell-row': 'row',
  'pull-up': 'pullup',
}

export interface CaliberCandidate {
  liftId: string
  /** Best session e1RM, rounded to 0.5 exactly like CALIBER's logTest will. */
  e1rm: number
}

/**
 * Best non-warmup e1RM per CALIBER-mapped lift in this workout.
 * Pull-up is bodyweight-based in CALIBER: without a known bodyweight the
 * total can't be computed honestly, so it's skipped rather than corrupted.
 */
export function caliberCandidates(workout: Workout, bodyweightKg?: number): CaliberCandidate[] {
  const best = new Map<string, number>()
  for (const entry of workout.entries) {
    const liftId = GHISA_TO_CALIBER[entry.exerciseId]
    if (!liftId) continue
    for (const s of entry.sets) {
      if (s.type === 'W') continue
      let load = s.weight
      if (liftId === 'pullup') {
        if (!bodyweightKg || bodyweightKg <= 0) continue
        load = bodyweightKg + s.weight
      }
      const e1 = epley(load, s.reps)
      if (e1 > (best.get(liftId) ?? 0)) best.set(liftId, e1)
    }
  }
  return [...best.entries()]
    .map(([liftId, e1]) => ({ liftId, e1rm: Math.round(e1 * 2) / 2 }))
    .filter((c) => c.e1rm > 0)
}

/** Candidates that beat CALIBER's stored PR (or seed a lift with none). */
export function caliberPushes(
  candidates: CaliberCandidate[],
  prs: Record<string, { e1rm: number } | undefined>,
): CaliberCandidate[] {
  return candidates.filter((c) => {
    const prev = prs[c.liftId]
    return !prev || c.e1rm > prev.e1rm
  })
}

/* --------------------- CADENCE: workout habit check --------------------- */

const NAME_RE = /workout|exercise|gym|train|lift|weights|palestra|allenamento|pesi/i
const EMOJI_RE = /💪|🏋️|🏋️‍♂️|🏋️‍♀️|🦾/u

/** Build habits that read as "the workout habit" — by name (EN/IT) or emoji. */
export function findWorkoutHabits(habits: Habit[]): Habit[] {
  return habits.filter(
    (h) => h.type === 'build' && (NAME_RE.test(h.name) || EMOJI_RE.test(h.emoji)),
  )
}

/* ----------------------------- entry point ----------------------------- */

export interface IntegrationResult {
  /** CALIBER lift ids that recorded a new PR. */
  caliberPRs: string[]
  /** CADENCE habit names checked off for today. */
  cadenceMarked: string[]
}

export function runFinishIntegrations(workout: Workout): IntegrationResult {
  const out: IntegrationResult = { caliberPRs: [], cadenceMarked: [] }

  try {
    const bw = latestWeight(ghisaStore.get().measures)
    const pushes = caliberPushes(caliberCandidates(workout, bw), caliberStore.get().prs)
    for (const p of pushes) {
      if (logTest(p.liftId, p.e1rm)) out.caliberPRs.push(p.liftId)
    }
  } catch {
    /* CALIBER unavailable or shape drifted — the workout save must not care. */
  }

  try {
    const st = cadenceStore.get()
    const today = todayKey()
    for (const h of findWorkoutHabits(activeHabits(st))) {
      if (!isChecked(cadenceStore.get(), h.id, today)) {
        toggleCheck(h.id, today)
        out.cadenceMarked.push(h.name)
      }
    }
  } catch {
    /* Same guarantee for CADENCE. */
  }

  return out
}

/** Shared strength math — platform-level so GHISA and CALIBER never import each other. */

export function epley(weight: number, reps: number): number {
  return reps <= 1 ? weight : weight * (1 + reps / 30)
}

export function brzycki(weight: number, reps: number): number {
  if (reps <= 1) return weight
  const r = Math.min(reps, 36)
  return (weight * 36) / (37 - r)
}

/** Averaged estimate — the two formulas bracket most lifters. */
export function e1rm(weight: number, reps: number): number {
  return (epley(weight, reps) + brzycki(weight, reps)) / 2
}

/** Inverse Epley: reps needed at `weight` to reach `target` e1RM. */
export function repsForTarget(weight: number, target: number): number {
  if (weight <= 0) return 0
  if (target <= weight) return 1
  return Math.ceil(30 * (target / weight - 1))
}

/** Inverse Epley: weight needed at `reps` to reach `target` e1RM. */
export function weightForTarget(reps: number, target: number): number {
  return target / (1 + Math.max(1, reps) / 30)
}

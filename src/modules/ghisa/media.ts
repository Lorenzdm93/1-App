/**
 * Exercise media — photo pairs from free-exercise-db
 * (github.com/yuhonas/free-exercise-db, MIT license, ~870 exercises).
 * Each exercise has two poses (0.jpg start / 1.jpg end); flipping between
 * them reads as a short demonstration loop, Hevy-style.
 *
 * Images are hotlinked at runtime from raw.githubusercontent.com — the
 * user's browser fetches them; nothing is bundled. Every consumer MUST
 * degrade gracefully (onError → monogram fallback): a wrong mapping or
 * offline session renders a clean initial tile, never a broken image.
 *
 * NOTE: folder ids below follow the dataset's Name_With_Underscores
 * convention and could not be network-verified from the build sandbox
 * (egress blocked). Run `node scripts/verify-ghisa-media.mjs` locally to
 * check all URLs and print any misses.
 */

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

/** GHISA library id → free-exercise-db folder id. Omissions render as monograms. */
export const EX_MEDIA: Record<string, string> = {
  'bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'incline-bench': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'incline-db-press': 'Incline_Dumbbell_Press',
  'db-bench': 'Dumbbell_Bench_Press',
  'chest-fly': 'Cable_Crossover',
  'dip': 'Dips_-_Chest_Version',
  'push-up': 'Pushups',
  'deadlift': 'Barbell_Deadlift',
  'barbell-row': 'Bent_Over_Barbell_Row',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'pull-up': 'Pullups',
  'seated-row': 'Seated_Cable_Rows',
  'db-row': 'One-Arm_Dumbbell_Row',
  'face-pull': 'Face_Pull',
  'squat': 'Barbell_Squat',
  'front-squat': 'Front_Barbell_Squat',
  'rdl': 'Romanian_Deadlift',
  'leg-press': 'Leg_Press',
  'leg-curl': 'Lying_Leg_Curls',
  'leg-extension': 'Leg_Extensions',
  'bulgarian-split': 'Split_Squat_with_Dumbbells',
  'lunge': 'Dumbbell_Walking_Lunge',
  'hip-thrust': 'Barbell_Hip_Thrust',
  'calf-raise': 'Standing_Calf_Raises',
  'ohp': 'Standing_Military_Press',
  'db-shoulder-press': 'Dumbbell_Shoulder_Press',
  'lateral-raise': 'Side_Lateral_Raise',
  'rear-delt-fly': 'Seated_Bent-Over_Rear_Delt_Raise',
  'upright-row': 'Upright_Cable_Row',
  'bicep-curl': 'Dumbbell_Bicep_Curl',
  'barbell-curl': 'Barbell_Curl',
  'hammer-curl': 'Hammer_Curls',
  'preacher-curl': 'Preacher_Curl',
  'triceps-pushdown': 'Triceps_Pushdown',
  'skull-crusher': 'EZ-Bar_Skullcrusher',
  'overhead-extension': 'Cable_Rope_Overhead_Triceps_Extension',
  'plank': 'Plank',
  'cable-crunch': 'Cable_Crunch',
  'hanging-leg-raise': 'Hanging_Leg_Raise',
  'ab-wheel': 'Ab_Roller',
  't-bar-row': 'Lying_T-Bar_Row',
  'chest-supported-row': 'Smith_Machine_Bent_Over_Row',
  'good-morning': 'Good_Morning',
  'hack-squat': 'Hack_Squat',
  'goblet-squat': 'Goblet_Squat',
  'sumo-deadlift': 'Sumo_Deadlift',
  'seated-calf-raise': 'Seated_Calf_Raise',
  'machine-chest-press': 'Machine_Bench_Press',
  'pec-deck': 'Butterfly',
  'cable-lateral-raise': 'Cable_Lateral_Raise',
  'barbell-shrug': 'Barbell_Shrug',
  'arnold-press': 'Arnold_Dumbbell_Press',
  'close-grip-bench': 'Close-Grip_Barbell_Bench_Press',
  'concentration-curl': 'Concentration_Curls',
  'incline-db-curl': 'Incline_Dumbbell_Curl',
  'decline-bench': 'Decline_Barbell_Bench_Press',
  'chin-up': 'Chin-Up',
  'back-extension': 'Hyperextensions_Back_Extensions',
  'crunch': 'Crunches',
  'lying-leg-raise': 'Flat_Bench_Lying_Leg_Raise',
}

/** Two-pose URL pair for an exercise, or null (custom / unmapped). */
export function mediaUrls(exerciseId: string): [string, string] | null {
  const folder = EX_MEDIA[exerciseId]
  if (!folder) return null
  return [`${BASE}${folder}/0.jpg`, `${BASE}${folder}/1.jpg`]
}

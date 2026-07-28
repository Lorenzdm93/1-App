/**
 * Exercise media — photo pairs from free-exercise-db
 * (github.com/yuhonas/free-exercise-db, MIT license).
 *
 * The files are BUNDLED, not hotlinked. They were previously fetched live from
 * raw.githubusercontent.com, which meant three problems: an undisclosed third
 * party saw every user's IP, the images vanished offline — in a gym basement,
 * which is the whole point of this app — and GitHub does not support raw
 * hotlinking for production traffic.
 *
 * public/ex/<id>-0.webp / -1.webp, 480px square, ~19 KB each. Regenerate with
 * `node scripts/build-exercise-media.mjs`; the output is committed.
 *
 * Consumers must still degrade gracefully (onError -> monogram): an id with no
 * media renders a clean initial tile, never a broken image.
 */

/** Exercise ids with bundled media. Everything else falls back to a monogram. */
const HAS_MEDIA: ReadonlySet<string> = new Set([
  'ab-wheel', 'arnold-press', 'back-extension', 'barbell-curl',
  'barbell-row', 'barbell-shrug', 'bench-press', 'bicep-curl',
  'bulgarian-split', 'cable-crunch', 'cable-lateral-raise', 'calf-raise',
  'chest-fly', 'chest-supported-row', 'chin-up', 'close-grip-bench',
  'concentration-curl', 'crunch', 'db-bench', 'db-row',
  'db-shoulder-press', 'deadlift', 'decline-bench', 'dip',
  'face-pull', 'front-squat', 'goblet-squat', 'good-morning',
  'hack-squat', 'hammer-curl', 'hanging-leg-raise', 'hip-thrust',
  'incline-bench', 'incline-db-curl', 'incline-db-press', 'lat-pulldown',
  'lateral-raise', 'leg-curl', 'leg-extension', 'leg-press',
  'lunge', 'lying-leg-raise', 'machine-chest-press', 'ohp',
  'overhead-extension', 'pec-deck', 'plank', 'preacher-curl',
  'pull-up', 'push-up', 'rdl', 'rear-delt-fly',
  'seated-calf-raise', 'seated-row', 'skull-crusher', 'squat',
  'sumo-deadlift', 't-bar-row', 'triceps-pushdown', 'upright-row',
])

/** Relative on purpose: correct under the Pages sub-path and Capacitor's file scheme alike. */
export function mediaUrls(exerciseId: string): [string, string] | null {
  if (!HAS_MEDIA.has(exerciseId)) return null
  return [`ex/${exerciseId}-0.webp`, `ex/${exerciseId}-1.webp`]
}

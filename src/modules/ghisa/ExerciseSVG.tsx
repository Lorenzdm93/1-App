/** Two-pose movement figures — A↔B morph, offline, no assets. */
const POSES: Record<string, [string, string]> = {
  bench: [
    'M6 30h36M14 30v-6h20v6M10 18h28M10 18v-5M38 18v-5M17 24l5-5h6l5 5',
    'M6 30h36M14 30v-6h20v6M10 10h28M10 10v-4M38 10v-4M17 24l5-12h6l5 12',
  ],
  squat: [
    'M24 8a3 3 0 1 0 .1 0M24 12v10M24 22l-7 7M24 22l7 7M17 16h14',
    'M24 14a3 3 0 1 0 .1 0M24 18v6M24 24l-8 3M24 24l8 3M15 20h18M16 27l3 5M32 27l-3 5',
  ],
  deadlift: [
    'M24 12a3 3 0 1 0 .1 0M24 16l-4 8 2 10M20 24l10-3M8 34h32M12 34v-3M36 34v-3',
    'M24 6a3 3 0 1 0 .1 0M24 10v14l-2 10M22 16h4M8 22h32M12 22v-3M36 22v-3',
  ],
  pullup: [
    'M8 8h32M24 14a3 3 0 1 0 .1 0M24 18v10l-3 8M24 20l-8-11M24 20l8-11',
    'M8 8h32M24 11a3 3 0 1 0 .1 0M24 15v10l-3 8M24 16l-8-7M24 16l8-7',
  ],
  ohp: [
    'M24 12a3 3 0 1 0 .1 0M24 16v12l-4 6M24 28l4 6M14 16h20M14 16v-4M34 16v-4',
    'M24 12a3 3 0 1 0 .1 0M24 16v12l-4 6M24 28l4 6M14 6h20M14 6v-3M34 6v-3M20 16l-4-9M28 16l4-9',
  ],
  row: [
    'M24 10a3 3 0 1 0 .1 0M24 14l-6 8 2 10M18 22l4 6M14 30h20M16 30v-2M32 30v-2',
    'M24 10a3 3 0 1 0 .1 0M24 14l-6 8 2 10M18 22l4 6M14 22h20M16 22v-2M32 22v-2M22 28l6-5',
  ],
}

export function poseFor(exerciseName: string): [string, string] | null {
  const n = exerciseName.toLowerCase()
  if (n.includes('bench')) return POSES.bench
  if (n.includes('squat')) return POSES.squat
  if (n.includes('deadlift')) return POSES.deadlift
  if (n.includes('pull-up') || n.includes('pullup') || n.includes('chin')) return POSES.pullup
  if (n.includes('overhead') || n.includes('ohp') || n.includes('shoulder press')) return POSES.ohp
  if (n.includes('row')) return POSES.row
  return null
}

export default function ExerciseSVG({ name, size = 120 }: { name: string; size?: number }) {
  const pose = poseFor(name)
  if (!pose) return null
  const [a, b] = pose
  return (
    <svg width={size} height={size * 0.83} viewBox="0 0 48 40" className="gh-exanim" aria-hidden="true">
      <path d={a} fill="none" stroke="var(--m-ghisa)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="d" dur="2.2s" repeatCount="indefinite" values={`${a};${b};${a}`} calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.2 1;0.4 0 0.2 1" />
      </path>
    </svg>
  )
}

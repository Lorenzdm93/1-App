export interface Phase {
  label: string
  seconds: number
  /** Target orb scale at the END of this phase (1 = full, 0.62 = resting). */
  scale: number
}

export interface Protocol {
  id: string
  name: string
  sub: string
  /** Each pattern keeps its own accent, as in the original instrument. */
  accentVar: string
  phases: Phase[]
}

export const PROTOCOLS: readonly Protocol[] = [
  {
    id: 'box',
    name: 'Box',
    sub: '4 · 4 · 4 · 4 — steady focus',
    accentVar: 'var(--acc-jade)',
    phases: [
      { label: 'Inhale', seconds: 4, scale: 1 },
      { label: 'Hold', seconds: 4, scale: 1 },
      { label: 'Exhale', seconds: 4, scale: 0.62 },
      { label: 'Hold', seconds: 4, scale: 0.62 },
    ],
  },
  {
    id: 'relax478',
    name: '4-7-8',
    sub: 'Long exhale — downshift to rest',
    accentVar: 'var(--acc-moon)',
    phases: [
      { label: 'Inhale', seconds: 4, scale: 1 },
      { label: 'Hold', seconds: 7, scale: 1 },
      { label: 'Exhale', seconds: 8, scale: 0.62 },
    ],
  },
  {
    id: 'coherence',
    name: 'Coherence',
    sub: '5.5 in · 5.5 out — heart-rate balance',
    accentVar: 'var(--acc-brass)',
    phases: [
      { label: 'Inhale', seconds: 5.5, scale: 1 },
      { label: 'Exhale', seconds: 5.5, scale: 0.62 },
    ],
  },
  {
    id: 'sigh',
    name: 'Sigh',
    sub: 'Double inhale, long exhale — fast reset',
    accentVar: 'var(--acc-coral)',
    phases: [
      { label: 'Inhale', seconds: 2, scale: 0.88 },
      { label: 'Top up', seconds: 1, scale: 1 },
      { label: 'Exhale', seconds: 6, scale: 0.62 },
    ],
  },
]

export function protocolById(id: string): Protocol {
  return PROTOCOLS.find((p) => p.id === id) ?? PROTOCOLS[0]
}

export function cycleSeconds(p: Protocol): number {
  return p.phases.reduce((s, ph) => s + ph.seconds, 0)
}

/** Position within the protocol cycle for a given elapsed time. */
export function phaseAt(
  p: Protocol,
  elapsedSec: number,
): { phase: Phase; index: number; remaining: number } {
  const cycle = cycleSeconds(p)
  let t = elapsedSec % cycle
  for (let i = 0; i < p.phases.length; i++) {
    const ph = p.phases[i]
    if (t < ph.seconds) return { phase: ph, index: i, remaining: ph.seconds - t }
    t -= ph.seconds
  }
  const lastIndex = p.phases.length - 1
  return { phase: p.phases[lastIndex], index: lastIndex, remaining: 0 }
}

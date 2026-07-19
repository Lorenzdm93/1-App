/**
 * The protocol catalog — every pattern carries its physiology in plain words.
 * Categories mirror the prototype: Down-shift (calm), Steady & Sharpen (focus),
 * Energise (activation — with warnings where they belong).
 */

export interface Phase {
  label: string
  seconds: number
  /** 1 = lungs full (figure expanded), 0.62 = lungs empty. */
  scale: number
  /** One-line instruction shown during the phase — nostrils, mouth, posture. */
  hint?: string
}

export type Category = 'downshift' | 'steady' | 'energise'

export interface Protocol {
  id: string
  name: string
  /** Pattern shorthand, e.g. '4 · 7 · 8'. */
  sub: string
  /** One-line card description. */
  desc: string
  /** Longer verbose text shown on the stage view. */
  detail: string
  category: Category
  /** Small caps tag on the card: FOCUS, SLEEP, QUICK CALM… */
  tag: string
  /** Suggested session length in minutes (label only — sessions stay open-ended). */
  suggestedMin: number
  accentVar: string
  glyph: 'sigh' | 'ring' | 'wave' | 'tri' | 'box' | 'nadi' | 'bellows'
  warning?: string
  phases: Phase[]
}

export const PROTOCOLS: readonly Protocol[] = [
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    sub: '2× in · long out',
    desc: 'Double inhale, long exhale. The fastest known off-switch for acute stress.',
    detail:
      'Two stacked inhales through the nose re-inflate collapsed air sacs, then a long mouth exhale offloads CO₂ and slows the heart within a breath or two. One to three cycles is often enough; a few minutes deepens the effect. Use it in the moment — before a hard call, after bad news.',
    category: 'downshift',
    tag: 'QUICK CALM',
    suggestedMin: 2,
    accentVar: 'var(--rs-sigh, #e58a6b)',
    glyph: 'sigh',
    phases: [
      { label: 'Inhale', seconds: 1.5, scale: 0.88, hint: 'Through the nose, most of the way' },
      { label: 'Top-up', seconds: 0.8, scale: 1, hint: 'A second short sip — nose again' },
      { label: 'Long exhale', seconds: 6, scale: 0.62, hint: 'Slow, through the mouth' },
    ],
  },
  {
    id: 'coherence',
    name: 'Coherent Breathing',
    sub: '5.5 · 5.5',
    desc: 'Five and a half breaths a minute — the resonance frequency of the heart.',
    detail:
      'Equal in and out at about 5.5 seconds each lands most people at their cardiovascular resonance frequency, where heart-rate variability peaks. It is the workhorse: unremarkable in the moment, cumulative over weeks. Ten minutes daily is the classic dose.',
    category: 'downshift',
    tag: 'BALANCE',
    suggestedMin: 10,
    accentVar: 'var(--m-respiro)',
    glyph: 'ring',
    phases: [
      { label: 'Inhale', seconds: 5.5, scale: 1, hint: 'Nose, unhurried, into the belly' },
      { label: 'Exhale', seconds: 5.5, scale: 0.62, hint: 'Nose, same pace — no push' },
    ],
  },
  {
    id: 'exhale',
    name: 'Extended Exhale',
    sub: '4 · 8',
    desc: 'The tide going out. Exhale twice as long as you inhale.',
    detail:
      'Exhalation is when the vagus nerve brakes the heart — doubling its length tilts the whole cycle parasympathetic. Gentler than 4-7-8 (no hold), so it suits anyone who finds breath retention claustrophobic. Good default for winding down.',
    category: 'downshift',
    tag: 'UNWIND',
    suggestedMin: 5,
    accentVar: 'var(--m-respiro)',
    glyph: 'wave',
    phases: [
      { label: 'Inhale', seconds: 4, scale: 1, hint: 'Through the nose' },
      { label: 'Exhale', seconds: 8, scale: 0.62, hint: 'Twice as long — let it drain' },
    ],
  },
  {
    id: '478',
    name: '4 · 7 · 8 Breath',
    sub: '4 · 7 · 8',
    desc: "Dr. Weil's natural tranquiliser. Long hold, longer exhale.",
    detail:
      'Inhale four, hold seven, exhale eight — the hold lets CO₂ build, the long exhale releases it with interest. Drowsiness is the point: this one belongs in bed or on the edge of it. If the hold feels like strain, shrink the numbers but keep the 4:7:8 ratio.',
    category: 'downshift',
    tag: 'SLEEP',
    suggestedMin: 4,
    accentVar: 'var(--rs-478, #b48ead)',
    glyph: 'tri',
    phases: [
      { label: 'Inhale', seconds: 4, scale: 1, hint: 'Quietly, through the nose' },
      { label: 'Hold', seconds: 7, scale: 1, hint: 'Lungs full — let CO₂ build' },
      { label: 'Exhale', seconds: 8, scale: 0.62, hint: 'Whoosh out through the mouth' },
    ],
  },
  {
    id: 'box',
    name: 'Box Breathing',
    sub: '4 · 4 · 4 · 4',
    desc: "Equal sides, steady mind. The operator's reset before anything high-stakes.",
    detail:
      'Four equal sides — in, hold, out, hold. Used by military and surgical teams because it steadies without sedating: arousal comes down, attention stays up. Trace the square with the dot and let the corners do the counting.',
    category: 'steady',
    tag: 'FOCUS',
    suggestedMin: 3,
    accentVar: 'var(--m-respiro)',
    glyph: 'box',
    phases: [
      { label: 'Inhale', seconds: 4, scale: 1, hint: 'In through the nose' },
      { label: 'Hold', seconds: 4, scale: 1, hint: 'Full — trace the top of the box' },
      { label: 'Exhale', seconds: 4, scale: 0.62, hint: 'Out, same count' },
      { label: 'Hold', seconds: 4, scale: 0.62, hint: 'Empty — steady at the bottom' },
    ],
  },
  {
    id: 'nadi',
    name: 'Nadi Shodhana',
    sub: '4 · 4 · 6 × both sides',
    desc: 'Alternate-nostril balance from pranayama — one side at a time.',
    detail:
      'Close the right nostril with your thumb, inhale left; close the left with your ring finger, exhale right; inhale right, exhale left — that is one round. The app keeps the rhythm (in 4, hold 4, out 6); your hand does the switching. Traditionally used to settle a scattered mind before concentration work.',
    category: 'steady',
    tag: 'BALANCE',
    suggestedMin: 6,
    accentVar: 'var(--m-respiro)',
    glyph: 'nadi',
    phases: [
      { label: 'Inhale left', seconds: 4, scale: 1, hint: 'Thumb closes the RIGHT nostril' },
      { label: 'Hold', seconds: 4, scale: 1, hint: 'Both closed, soft face' },
      { label: 'Exhale right', seconds: 6, scale: 0.62, hint: 'Ring finger releases the RIGHT side' },
      { label: 'Inhale right', seconds: 4, scale: 1, hint: 'Stay on the right side' },
      { label: 'Hold', seconds: 4, scale: 1, hint: 'Both closed again' },
      { label: 'Exhale left', seconds: 6, scale: 0.62, hint: 'Thumb releases the LEFT side' },
    ],
  },
  {
    id: 'rounds',
    name: 'Wim Hof Rounds',
    sub: '30 × deep · then hold',
    desc: 'Thirty full breaths, then a long retention. Strong medicine — read the warning.',
    detail:
      'Ride 30 deep, unforced breaths with the tracer — full in, relaxed out. Light-headedness and tingling are expected; that is the CO₂ dropping. After the 30th exhale, stop the session and use the breath-hold tool in Tools to time your retention, then one deep recovery breath held 15 seconds. Two to four rounds.',
    category: 'energise',
    tag: 'ACTIVATE',
    suggestedMin: 8,
    accentVar: 'var(--rs-hof, #e0b84f)',
    glyph: 'bellows',
    warning:
      'Never in or near water, never driving, never standing. Fainting during retention is possible and has drowned experienced practitioners in shallow water. Sit or lie down. Skip it entirely if pregnant or with cardiovascular conditions.',
    phases: [
      { label: 'Deep in', seconds: 1.6, scale: 1, hint: 'Belly, then chest — through the nose' },
      { label: 'Let go', seconds: 1.6, scale: 0.66, hint: 'Just release, don\'t push' },
    ],
  },
]

export function protocolById(id: string): Protocol {
  return PROTOCOLS.find((p) => p.id === id) ?? PROTOCOLS[4]
}

export function cycleSeconds(p: Protocol): number {
  return p.phases.reduce((sum, ph) => sum + ph.seconds, 0)
}

export interface PhasePosition {
  index: number
  phase: Phase
  remaining: number
}

/** Where inside the cycle a session at `elapsedSeconds` sits. */
export function phaseAt(p: Protocol, elapsedSeconds: number): PhasePosition {
  const cycle = cycleSeconds(p)
  let t = elapsedSeconds % cycle
  for (let i = 0; i < p.phases.length; i++) {
    const ph = p.phases[i]
    if (t < ph.seconds) return { index: i, phase: ph, remaining: ph.seconds - t }
    t -= ph.seconds
  }
  return { index: 0, phase: p.phases[0], remaining: p.phases[0].seconds }
}

export const CATEGORIES: readonly { id: Category; label: string }[] = [
  { id: 'downshift', label: 'Down-shift' },
  { id: 'steady', label: 'Steady & sharpen' },
  { id: 'energise', label: 'Energise' },
]

export interface CustomPattern {
  inS: number
  hold1: number
  outS: number
  hold2: number
}

/** Builds a runnable protocol from the custom pattern. Holds of 0 are skipped. */
export function buildCustomProtocol(c: CustomPattern): Protocol {
  const inS = Math.min(20, Math.max(1, c.inS))
  const outS = Math.min(20, Math.max(1, c.outS))
  const h1 = Math.min(20, Math.max(0, c.hold1))
  const h2 = Math.min(20, Math.max(0, c.hold2))
  const phases: Phase[] = [{ label: 'Inhale', seconds: inS, scale: 1 }]
  if (h1 > 0) phases.push({ label: 'Hold', seconds: h1, scale: 1 })
  phases.push({ label: 'Exhale', seconds: outS, scale: 0.62 })
  if (h2 > 0) phases.push({ label: 'Hold', seconds: h2, scale: 0.62 })
  return {
    id: 'custom',
    name: 'Custom',
    sub: [inS, h1, outS, h2].filter((v, i) => v > 0 || i === 0 || i === 2).join(' · '),
    desc: 'Your numbers, your rhythm.',
    detail:
      'Set the four numbers to any pattern a teacher or a book gave you. Holds at zero are skipped. Longer exhale than inhale calms; equal sides steadies.',
    category: 'steady',
    tag: 'YOURS',
    suggestedMin: 5,
    accentVar: 'var(--m-respiro)',
    glyph: 'box',
    phases,
  }
}

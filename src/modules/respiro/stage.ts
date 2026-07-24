/**
 * RESPIRO stage — the prototype's instrument math, ported faithfully.
 * Every technique renders as to-scale geometry: side lengths equal phase
 * seconds, so a comet moving at constant speed lands every phase change
 * exactly on a vertex. Pure module — no DOM, fully testable.
 */

export type PhaseKey = 'in' | 'in2' | 'hold' | 'out' | 'hold2'

export const PHASE_LABEL: Record<PhaseKey, string> = {
  in: 'Inhale', in2: 'Inhale again', hold: 'Hold', out: 'Exhale', hold2: 'Hold empty',
}
export const PHASE_COLOR: Record<PhaseKey, string> = {
  in: 'var(--rp-jade)', in2: 'var(--rp-jade)', hold: 'var(--rp-moon)', out: 'var(--rp-coral)', hold2: 'var(--rp-moon)',
}

export interface Technique {
  id: string
  name: string
  goal: string
  accent: 'jade' | 'coral' | 'moon' | 'brass'
  geo: 'square' | 'circle' | 'poly' | 'wave' | 'nostril' | 'hof'
  pattern: [PhaseKey, number][] | null
  patternStr: string
  sub: string
  desc: string
  durations: number[] | null
  defDur?: number
  nostril?: ('L' | 'R')[]
  defRounds?: number
  defBreaths?: number
  caution?: string
  custom?: boolean
}

export const TECHNIQUES: readonly Technique[] = [
  {
    id: 'box', name: 'Box Breathing', goal: 'Focus', accent: 'jade', geo: 'square',
    pattern: [['in', 4], ['hold', 4], ['out', 4], ['hold2', 4]],
    patternStr: '4 · 4 · 4 · 4',
    sub: "Equal sides, steady mind. The operator's reset before anything high-stakes.",
    desc: 'Inhale, hold, exhale, hold — four seconds each. Equal ratios settle the nervous system into balanced regulation: not sedated, not wired, just steady. Used before presentations, hard conversations, and by anyone who needs their hands to stop shaking.',
    durations: [1, 2, 3, 5, 10], defDur: 3,
  },
  {
    id: 'coherent', name: 'Coherent Breathing', goal: 'Balance', accent: 'jade', geo: 'circle',
    pattern: [['in', 5.5], ['out', 5.5]],
    patternStr: '5.5 · 5.5',
    sub: 'Five and a half breaths a minute — the resonance frequency of the heart.',
    desc: 'Slow, even breathing at ~5.5 breaths per minute synchronises heart-rate variability with the breath. This is the cadence used in HRV biofeedback: a long, quiet downshift for when the day feels chaotic.',
    durations: [2, 3, 5, 10, 15], defDur: 5,
  },
  {
    id: 'sigh', name: 'Physiological Sigh', goal: 'Quick calm', accent: 'coral', geo: 'wave',
    pattern: [['in', 1.6], ['in2', 1.0], ['out', 6]],
    patternStr: '2× in · long out',
    sub: 'Double inhale, long exhale. The fastest known off-switch for acute stress.',
    desc: 'Two inhales through the nose — the second a short top-up that pops collapsed alveoli — then one long exhale through the mouth. Stanford research found five minutes daily improved mood more than mindfulness meditation. Works in a single cycle when your chest feels tight.',
    durations: [1, 2, 3, 5], defDur: 2,
  },
  {
    id: '478', name: '4 · 7 · 8 Breath', goal: 'Sleep', accent: 'moon', geo: 'poly',
    pattern: [['in', 4], ['hold', 7], ['out', 8]],
    patternStr: '4 · 7 · 8',
    sub: "Dr. Weil's natural tranquiliser. Long hold, longer exhale.",
    desc: 'Inhale through the nose for 4, hold for 7, exhale slowly through the mouth for 8. The extended hold and exhale drop heart rate and quiet the mind — best practised lying down, at the end of the day.',
    durations: [1, 2, 3, 5], defDur: 2,
  },
  {
    id: 'marea', name: 'Extended Exhale', goal: 'Unwind', accent: 'moon', geo: 'circle',
    pattern: [['in', 4], ['out', 8]],
    patternStr: '4 · 8',
    sub: 'The tide going out. Exhale twice as long as you inhale.',
    desc: 'The simplest evidence-based downshift: a 1:2 ratio. Every long exhale leans on the vagus nerve and slows the heart. Impossible to do wrong — if 4·8 feels like a stretch, breathe 3·6 and let it lengthen on its own.',
    durations: [2, 3, 5, 10], defDur: 3,
  },
  {
    id: 'nadi', name: 'Nadi Shodhana', goal: 'Balance', accent: 'brass', geo: 'nostril',
    pattern: [['in', 4], ['hold', 4], ['out', 6], ['in', 4], ['hold', 4], ['out', 6]],
    patternStr: 'L 4·4·6 / R 4·4·6',
    nostril: ['L', 'L', 'R', 'R', 'R', 'L'],
    sub: 'Alternate-nostril pranayama. Yogic channel-clearing, one side at a time.',
    desc: 'Close the right nostril with your thumb, inhale left. Close both and hold. Release the right side, exhale. Then mirror: inhale right, hold, exhale left. The instrument shows which nostril is open at every moment — follow the lit channel.',
    durations: [3, 5, 7, 10], defDur: 5,
  },
  {
    id: 'hof', name: 'Wim Hof Rounds', goal: 'Energise', accent: 'coral', geo: 'hof',
    pattern: null,
    patternStr: '30 × · hold · 15s',
    sub: 'Rounds of strong breathing, then a long retention on empty lungs.',
    desc: 'Each round: ~30 full, rhythmic breaths (in through the nose, let go out the mouth), then exhale and hold on empty lungs as long as comfortable — tap when you need to breathe — then one deep recovery inhale held 15 seconds. Sit or lie down.',
    durations: null, defRounds: 3, defBreaths: 30,
    caution: "Never practise this in or near water, while standing, or while driving. Light-headedness and tingling are normal; stop if it feels wrong. Skip it if you're pregnant or have cardiovascular conditions.",
  },
]

/** Custom-slot phases as stored by the app: seconds for in / hold / out / hold-empty. */
export interface CustomPhases { inS: number; hold1: number; outS: number; hold2: number }

export function customTechnique(c: CustomPhases): Technique {
  const pat: [PhaseKey, number][] = []
  if (c.inS > 0) pat.push(['in', c.inS])
  if (c.hold1 > 0) pat.push(['hold', c.hold1])
  if (c.outS > 0) pat.push(['out', c.outS])
  if (c.hold2 > 0) pat.push(['hold2', c.hold2])
  const shown = [c.inS, c.hold1, c.outS, c.hold2]
  return {
    id: 'custom', name: 'Custom Pattern', goal: 'Custom', accent: 'brass', geo: 'poly',
    pattern: pat.length >= 2 ? pat : [['in', 4], ['out', 4]],
    patternStr: shown.filter((v, ix) => v > 0 || ix < 3).map((v) => (v % 1 ? v.toFixed(1) : String(v))).join(' · '),
    sub: 'Your own pattern.',
    desc: 'A pattern you built. Its shape is drawn to scale — every side is as long as its phase, so the dot moves at one constant speed and each turn is a transition.',
    durations: [2, 3, 5, 10], defDur: 3, custom: true,
  }
}

export function techniqueById(id: string, custom: CustomPhases): Technique | null {
  const t = TECHNIQUES.find((x) => x.id === id)
  if (t) return t
  if (id === 'custom') return customTechnique(custom)
  return null
}

export const ACCENT_VAR: Record<Technique['accent'], string> = {
  jade: 'var(--rp-jade)', coral: 'var(--rp-coral)', moon: 'var(--rp-moon)', brass: 'var(--rp-brass)',
}

/* ------------------------------ math ------------------------------ */

export const VB = 340
export const C = VB / 2
export const easeInOut = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t))
const clampASin = (x: number): number => Math.asin(Math.min(1, Math.max(-1, x)))

/**
 * Unique convex polygon inscribed in a circle with the given side lengths
 * (in order). Null when n<3 or the longest side ≥ sum of the rest.
 */
export function cyclicPolygonPts(sides: number[]): [number, number][] | null {
  const n = sides.length
  if (n < 3) return null
  const max = Math.max(...sides)
  const sum = sides.reduce((a, b) => a + b, 0)
  if (max >= sum - max - 1e-9) return null
  const mi = sides.indexOf(max)
  const angInside = (R: number) => sides.reduce((a, s) => a + 2 * clampASin(s / (2 * R)), 0)
  let R: number
  let angles: number[]
  if (angInside(max / 2 + 1e-12) >= 2 * Math.PI) {
    let lo = max / 2
    let hi = sum
    for (let i = 0; i < 90; i++) {
      const m = (lo + hi) / 2
      if (angInside(m) > 2 * Math.PI) lo = m
      else hi = m
    }
    R = (lo + hi) / 2
    angles = sides.map((s) => 2 * clampASin(s / (2 * R)))
  } else {
    const h = (R2: number) => sides.reduce((a, s, i) => a + (i === mi ? -clampASin(s / (2 * R2)) : clampASin(s / (2 * R2))), 0)
    let lo = max / 2
    let hi = max
    while (h(hi) <= 0 && hi < max * 1e7) hi *= 2
    for (let i = 0; i < 90; i++) {
      const m = (lo + hi) / 2
      if (h(m) < 0) lo = m
      else hi = m
    }
    R = (lo + hi) / 2
    angles = sides.map((s, i) => (i === mi ? 2 * Math.PI - 2 * clampASin(s / (2 * R)) : 2 * clampASin(s / (2 * R))))
  }
  let a = -Math.PI / 2
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    pts.push([R * Math.cos(a), R * Math.sin(a)])
    a += angles[i]
  }
  return pts
}

export function fitPts(pts: [number, number][], cx: number, cy: number, fit: number): [number, number][] {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const w = Math.max(...xs) - Math.min(...xs)
  const hgt = Math.max(...ys) - Math.min(...ys)
  const k = fit / Math.max(w, hgt, 1e-9)
  const mx = (Math.max(...xs) + Math.min(...xs)) / 2
  const my = (Math.max(...ys) + Math.min(...ys)) / 2
  return pts.map(([x, y]) => [cx + (x - mx) * k, cy + (y - my) * k])
}

export function phaseFractions(pattern: [PhaseKey, number][] | null): number[] {
  if (!pattern) return []
  const total = pattern.reduce((a, [, d]) => a + d, 0)
  let acc = 0
  return pattern.map(([, d]) => {
    const f = acc / total
    acc += d
    return f
  })
}

export interface Geo {
  d: string
  ticks?: { x1: number; y1: number; x2: number; y2: number }[]
  verts?: { x: number; y: number }[]
  twin?: { dL: string; dR: string }
  open?: boolean
}

function tickedCircle(fractions: number[], r: number): Geo {
  const d = `M ${C} ${C - r} A ${r} ${r} 0 1 1 ${C - 0.01} ${C - r} Z`
  const ticks = fractions.map((f) => {
    const a = -Math.PI / 2 + f * 2 * Math.PI
    return { x1: C + (r - 9) * Math.cos(a), y1: C + (r - 9) * Math.sin(a), x2: C + (r + 9) * Math.cos(a), y2: C + (r + 9) * Math.sin(a) }
  })
  return { d, ticks }
}

export function geoFor(tech: Technique): Geo {
  switch (tech.geo) {
    case 'square': {
      const s = 210
      const x = C - s / 2
      const y = C - s / 2
      const r = 26
      const d = `M ${x + r} ${y} H ${x + s - r} A ${r} ${r} 0 0 1 ${x + s} ${y + r} V ${y + s - r} A ${r} ${r} 0 0 1 ${x + s - r} ${y + s} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + s - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
      return { d }
    }
    case 'circle':
      return tickedCircle(phaseFractions(tech.pattern), 112)
    case 'poly': {
      const sides = (tech.pattern ?? []).map(([, d]) => d)
      const raw = cyclicPolygonPts(sides)
      if (!raw) return tickedCircle(phaseFractions(tech.pattern), 112)
      const pts = fitPts(raw, C, C, 236)
      const d = 'M ' + pts.map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' L ') + ' Z'
      return { d, verts: pts.map((p) => ({ x: p[0], y: p[1] })) }
    }
    case 'wave': {
      const d = `M 30 250 C 55 250 60 170 84 158 C 96 152 100 168 108 160 C 132 136 130 96 158 88 C 172 84 178 96 190 108 C 232 150 268 216 310 244`
      return { d, open: true }
    }
    case 'nostril': {
      const dL = `M ${C - 78} 268 C ${C - 118} 210 ${C - 96} 120 ${C} 74`
      const dR = `M ${C} 74 C ${C + 96} 120 ${C + 118} 210 ${C + 78} 268`
      return { d: dL + ' ' + dR.replace('M', 'L'), twin: { dL, dR } }
    }
    default:
      return tickedCircle(phaseFractions(tech.pattern), 110)
  }
}

/** Breath level 0..1 for a phase key at progress p. */
export function breathLevel(key: PhaseKey, p: number): number {
  switch (key) {
    case 'in': return easeInOut(p)
    case 'in2': return 0.55 + 0.45 * easeInOut(p)
    case 'hold': return 1
    case 'out': return 1 - easeInOut(p)
    case 'hold2': return 0
  }
}

export interface Seg { k: PhaseKey; d: number; from: number; to: number }

/** Cumulative cycle fractions per phase — the tick's lookup table. */
export function buildSegs(pattern: [PhaseKey, number][]): { segs: Seg[]; cycleDur: number } {
  const cycleDur = pattern.reduce((a, [, d]) => a + d, 0)
  let acc = 0
  const segs = pattern.map(([k, d]) => {
    const from = acc / cycleDur
    acc += d
    return { k, d, from, to: acc / cycleDur }
  })
  return { segs, cycleDur }
}

/** The segment active at cycle progress cp ∈ [0,1). */
export function segAt(segs: Seg[], cp: number): { seg: Seg; ix: number; pp: number } {
  let ix = segs.findIndex((s) => cp >= s.from && cp < s.to)
  if (ix === -1) ix = segs.length - 1
  const seg = segs[ix]
  const pp = (cp - seg.from) / (seg.to - seg.from)
  return { seg, ix, pp: Math.min(1, Math.max(0, pp)) }
}

/**
 * ORA — fasting, hour by hour. A fast is a timestamp pair with a target;
 * elapsed time is pure math, immune to backgrounding. Protocols are daily
 * rhythms (14:10 … OMAD), a custom hour target, or an eating window that
 * derives the fast around when you actually eat. Completed fasts feed the
 * event stream; weight and hydration ride alongside as context.
 */
import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { logEvent, eventsStore, removeEvent } from '../../core/events'
import { dayKey, todayKey, shiftDay } from '../../core/dates'

export interface Protocol {
  id: string
  name: string
  fastH: number
  eatH: number
  desc: string
  kind: 'rhythm' | 'custom' | 'window' | 'extended'
}

export const PROTOCOLS: readonly Protocol[] = [
  { id: 'window', name: 'Window', fastH: 16, eatH: 8, kind: 'window',
    desc: 'Pick when you eat instead of counting hours — say, first bite at 12:00, last bite by 20:00. ORA fasts you around it.' },
  { id: 'custom', name: '16h', fastH: 16, eatH: 8, kind: 'custom',
    desc: 'Name your own target — any length from a few hours to multi-day.' },
  { id: 'p1410', name: '14:10', fastH: 14, eatH: 10, kind: 'rhythm',
    desc: 'A gentle daily rhythm — fast overnight plus a little, eat in a roomy 10-hour window. The easiest place to start.' },
  { id: 'p168', name: '16:8', fastH: 16, eatH: 8, kind: 'rhythm',
    desc: 'The classic. Skip breakfast, eat lunch through dinner. Reaches solid fat-burning every day and fits most routines.' },
  { id: 'p186', name: '18:6', fastH: 18, eatH: 6, kind: 'rhythm',
    desc: 'A firmer daily fast that dips into early ketosis. Two meals in a tight 6-hour window — good once 16:8 feels easy.' },
  { id: 'p204', name: '20:4', fastH: 20, eatH: 4, kind: 'rhythm',
    desc: 'The "warrior" pattern — one main meal plus a snack inside 4 hours. Deep daily fat-burning; best for experienced fasters.' },
  { id: 'omad', name: 'OMAD', fastH: 23, eatH: 1, kind: 'rhythm',
    desc: 'One meal a day. Roughly 23 hours fasted, one unrushed plate. Simple to run, demanding to hold.' },
  { id: 'e24', name: '24h', fastH: 24, eatH: 0, kind: 'extended',
    desc: 'A full day, dinner to dinner. Touches the start of autophagy without seriously disrupting your week.' },
  { id: 'e36', name: '36h', fastH: 36, eatH: 0, kind: 'extended',
    desc: 'The "monk fast" — a whole calendar day without eating. Deep ketosis and rising autophagy. Plan a quiet day.' },
  { id: 'e48', name: '48h', fastH: 48, eatH: 0, kind: 'extended',
    desc: 'Two days. Autophagy and growth-hormone peak territory. Electrolytes are essential; keep effort low.' },
  { id: 'e72', name: '72h', fastH: 72, eatH: 0, kind: 'extended',
    desc: 'Three days — deep cellular renewal and immune reset territory. For experienced fasters, ideally with medical guidance.' },
]

export function protocolById(id: string): Protocol {
  return PROTOCOLS.find((p) => p.id === id) ?? PROTOCOLS[3]
}

/* ---------- stages: what's happening inside ---------- */

export interface Stage {
  name: string
  fromH: number
  toH: number | null
  body: string
  noteKind: 'Now' | 'Tip' | 'Care'
  note: string
  color: string // css var reference for the phase tone
}

export const STAGES: readonly Stage[] = [
  { name: 'Fed', fromH: 0, toH: 4, color: '#6C8B9E',
    body: 'Digestion is underway. Blood sugar and insulin rise while nutrients from your last meal are absorbed and stored.',
    noteKind: 'Now', note: 'Insulin is up, so fat-burning is paused — completely normal. Sip water and let digestion settle.' },
  { name: 'Winding down', fromH: 4, toH: 12, color: '#5FA79C',
    body: 'Insulin is falling and your body leans on stored glycogen for fuel. Blood sugar returns to baseline.',
    noteKind: 'Tip', note: 'A good stretch to stay busy. Water, black coffee and plain tea are fine and can soften early hunger.' },
  { name: 'Fat burning', fromH: 12, toH: 16, color: '#D9A15C',
    body: 'Glycogen is running low, so your body pivots to burning fat. The first ketones begin to appear.',
    noteKind: 'Tip', note: 'Hunger often comes in waves and passes. A pinch of salt in water helps if you feel flat.' },
  { name: 'Ketosis', fromH: 16, toH: 24, color: '#E8834E',
    body: 'Ketones become a main fuel. Mental clarity often rises as appetite drops.',
    noteKind: 'Tip', note: 'Many people feel clear and even here. Mind your electrolytes — sodium, potassium, magnesium. Break gently whenever you\'re ready.' },
  { name: 'Autophagy', fromH: 24, toH: 48, color: '#6FB394',
    body: 'Autophagy ramps up as cells recycle damaged parts. Growth hormone rises to protect muscle, and insulin sits at its lowest.',
    noteKind: 'Care', note: 'Electrolytes matter more now. Move gently and rest well. If you feel dizzy, faint or unwell, break the fast.' },
  { name: 'Deep autophagy', fromH: 48, toH: 72, color: '#4E9E86',
    body: 'Cellular cleanup and immune renewal near their peak, and IGF-1 drops. This is extended-fast territory.',
    noteKind: 'Care', note: 'Best for experienced fasters, ideally with medical guidance. Prioritise electrolytes and hydration; plan a gentle refeed.' },
  { name: 'Extended renewal', fromH: 72, toH: null, color: '#3E8F7C',
    body: 'Deep cellular renewal continues. Both benefits and risks rise the longer you go.',
    noteKind: 'Care', note: 'Multi-day fasts warrant medical supervision. Break carefully with small, simple foods to avoid refeeding problems.' },
]

export function stageFor(hours: number): Stage {
  for (const s of STAGES) if (s.toH === null || hours < s.toH) return s
  return STAGES[STAGES.length - 1]
}

/* ---------- state ---------- */

export interface Fast {
  id: string
  startTs: number
  endTs: number
  targetH: number
  protocolId: string
  hit: boolean
}

export interface WeightEntry {
  ts: number
  kg: number
}

export interface OraState {
  current: { startTs: number; targetH: number; protocolId: string } | null
  fasts: Fast[] // newest first
  protocolId: string
  customH: number
  window: { firstBite: string; lastBite: string }
  weights: WeightEntry[] // newest first
  hydration: Record<string, number>
  phaseAlerts: boolean
  /** Post-fast eating window (IF rhythms) — a gentle countdown, never an alarm. */
  eating: { startTs: number; windowH: number } | null
  /** Milestone ids already celebrated — so unlocks toast exactly once. */
  celebrated: string[]
}

const DEFAULTS: OraState = {
  current: null,
  fasts: [],
  protocolId: 'p168',
  customH: 16,
  window: { firstBite: '12:00', lastBite: '20:00' },
  weights: [],
  hydration: {},
  phaseAlerts: false,
  eating: null,
  celebrated: [],
}

export function migrateOra(data: unknown, _from: number): OraState {
  const d = (data && typeof data === 'object' ? data : {}) as Partial<OraState>
  const st: OraState = {
    ...DEFAULTS,
    ...d,
    eating: d.eating && typeof d.eating === 'object' ? d.eating : null,
    celebrated: Array.isArray(d.celebrated) ? d.celebrated : [],
    fasts: Array.isArray(d.fasts) ? d.fasts : [],
    weights: Array.isArray(d.weights) ? d.weights : [],
    hydration: d.hydration && typeof d.hydration === 'object' ? d.hydration : {},
  }
  return st
}

export const oraStore = createPersistedStore<OraState>('ora', DEFAULTS, 2, migrateOra)

/* ---------- window math (overnight-safe) ---------- */

function parseHM(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Fasting hours implied by an eating window — lastBite → next firstBite. */
export function windowFastHours(firstBite: string, lastBite: string): number | null {
  const a = parseHM(firstBite)
  const b = parseHM(lastBite)
  if (a === null || b === null) return null
  const eat = (b - a + 24 * 60) % (24 * 60)
  const fast = 24 * 60 - eat
  return Math.round((fast / 60) * 10) / 10
}

export function targetHoursFor(st: OraState): number {
  const p = protocolById(st.protocolId)
  if (p.kind === 'custom') return st.customH
  if (p.kind === 'window') return windowFastHours(st.window.firstBite, st.window.lastBite) ?? 16
  return p.fastH
}

/* ---------- actions ---------- */

export function setProtocol(id: string): void {
  oraStore.set((s) => ({ ...s, protocolId: id }))
}

export function setCustomH(h: number): void {
  const v = Math.min(120, Math.max(1, Math.round(h * 10) / 10))
  oraStore.set((s) => ({ ...s, customH: v }))
}

export function setWindow(firstBite: string, lastBite: string): void {
  oraStore.set((s) => ({ ...s, window: { firstBite, lastBite } }))
}

export function beginFast(now = Date.now()): boolean {
  const st = oraStore.get()
  if (st.current) return false
  oraStore.set((s) => ({
    ...s,
    current: { startTs: now, targetH: targetHoursFor(s), protocolId: s.protocolId },
  }))
  return true
}

/** "Already fasting?" — move the start back (never into the future). */
export function setStartTime(ts: number, now = Date.now()): void {
  oraStore.set((s) =>
    s.current ? { ...s, current: { ...s.current, startTs: Math.min(ts, now) } } : s,
  )
}

export function elapsedH(startTs: number, now = Date.now()): number {
  return (now - startTs) / 3_600_000
}

/** Ending always logs — early is data, not failure. */
export function endFast(now = Date.now()): Fast | null {
  const st = oraStore.get()
  if (!st.current) return null
  const hours = elapsedH(st.current.startTs, now)
  const fast: Fast = {
    id: uid(),
    startTs: st.current.startTs,
    endTs: now,
    targetH: st.current.targetH,
    protocolId: st.current.protocolId,
    hit: hours >= st.current.targetH,
  }
  const winH = fast.targetH < 24 ? Math.round((24 - fast.targetH) * 10) / 10 : 0
  oraStore.set((s) => ({
    ...s,
    current: null,
    fasts: [fast, ...s.fasts].slice(0, 1000),
    eating: winH > 0 ? { startTs: now, windowH: winH } : null,
  }))
  logEvent({
    module: 'ora',
    kind: 'fast',
    ts: now,
    value: Math.round(hours * 10) / 10,
    unit: 'h',
    meta: { target: fast.targetH, hit: fast.hit },
  })
  return fast
}

export function deleteFast(id: string): void {
  const st = oraStore.get()
  const f = st.fasts.find((x) => x.id === id)
  oraStore.set((s) => ({ ...s, fasts: s.fasts.filter((x) => x.id !== id) }))
  if (f) {
    const ev = eventsStore
      .get()
      .find((e) => e.module === 'ora' && e.kind === 'fast' && e.ts === f.endTs)
    if (ev) removeEvent(ev.id)
  }
}

export function logWeight(kg: number, now = Date.now()): void {
  const v = Math.round(kg * 10) / 10
  if (!Number.isFinite(v) || v <= 0) return
  oraStore.set((s) => ({ ...s, weights: [{ ts: now, kg: v }, ...s.weights].slice(0, 500) }))
}

export function addGlass(delta: number, day = todayKey()): void {
  oraStore.set((s) => {
    const cur = s.hydration[day] ?? 0
    const next = Math.min(20, Math.max(0, cur + delta))
    return { ...s, hydration: { ...s.hydration, [day]: next } }
  })
}

export function setPhaseAlerts(on: boolean): void {
  oraStore.set((s) => ({ ...s, phaseAlerts: on }))
}

/* ---------- stats ---------- */

export interface OraStats {
  streak: number
  bestStreak: number
  count: number
  hitRate: number
  longestH: number
  avgH: number
  totalH: number
}

export function oraStats(fasts: readonly Fast[], today = todayKey()): OraStats {
  const days = new Set<string>()
  for (const f of fasts) days.add(dayKey(f.endTs))
  let streak = 0
  let cursor = days.has(today) ? today : shiftDay(today, -1)
  while (days.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  let bestStreak = 0
  const sorted = [...days].sort()
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    run = prev !== null && shiftDay(prev, 1) === d ? run + 1 : 1
    if (run > bestStreak) bestStreak = run
    prev = d
  }
  const count = fasts.length
  const hits = fasts.filter((f) => f.hit).length
  const hours = fasts.map((f) => elapsedH(f.startTs, f.endTs))
  const totalH = hours.reduce((a, b) => a + b, 0)
  return {
    streak,
    bestStreak,
    count,
    hitRate: count === 0 ? 0 : Math.round((hits / count) * 100),
    longestH: hours.length === 0 ? 0 : Math.max(...hours),
    avgH: count === 0 ? 0 : totalH / count,
    totalH,
  }
}

/* ---------- milestones ---------- */

export interface Milestone {
  id: string
  name: string
  desc: string
  test(fasts: readonly Fast[], stats: OraStats): boolean
}

export const MILESTONES: readonly Milestone[] = [
  { id: 'first', name: 'First fast', desc: 'Complete any fast', test: (_f, s) => s.count >= 1 },
  { id: 'sixteen', name: 'Sixteen', desc: 'Reach a 16-hour fast', test: (f) => f.some((x) => elapsedH(x.startTs, x.endTs) >= 16) },
  { id: 'ketosis', name: 'Into ketosis', desc: 'Pass 18 hours', test: (f) => f.some((x) => elapsedH(x.startTs, x.endTs) >= 18) },
  { id: 'fullday', name: 'Full day', desc: 'Reach 24 hours', test: (f) => f.some((x) => elapsedH(x.startTs, x.endTs) >= 24) },
  { id: 'fortyeight', name: 'Forty-eight', desc: 'Reach a 48-hour fast', test: (f) => f.some((x) => elapsedH(x.startTs, x.endTs) >= 48) },
  { id: 'momentum', name: 'Momentum', desc: '3-day streak', test: (_f, s) => s.bestStreak >= 3 },
  { id: 'seven', name: 'Seven strong', desc: '7-day streak', test: (_f, s) => s.bestStreak >= 7 },
  { id: 'month', name: 'The habit', desc: '30 fasts logged', test: (_f, s) => s.count >= 30 },
  { id: 'precision', name: 'Precision', desc: '10 goal hits in a row', test: (f) => {
      let run = 0
      for (const x of [...f].reverse()) {
        run = x.hit ? run + 1 : 0
        if (run >= 10) return true
      }
      return false
    } },
  { id: 'century', name: 'Century', desc: '100 hours fasted, all time', test: (_f, s) => s.totalH >= 100 },
]

/* ---------- weekly scorer measure ---------- */

/** Mean goal-completion of fasts finished in the range; null when none. */
export function weekFastScore(st: OraState, start: string, end: string): number | null {
  const inRange = st.fasts.filter((f) => {
    const d = dayKey(f.endTs)
    return d >= start && d <= end
  })
  if (inRange.length === 0) return null
  const sum = inRange.reduce(
    (a, f) => a + Math.min(1, elapsedH(f.startTs, f.endTs) / f.targetH),
    0,
  )
  return sum / inRange.length
}

/* ---------------- v2 additions ---------------- */

export function dismissEating(): void {
  oraStore.set((s) => ({ ...s, eating: null }))
}

/** Edit a logged fast's boundaries; `hit` is recomputed. */
export function editFast(id: string, patch: { startTs?: number; endTs?: number }): void {
  oraStore.set((s) => ({
    ...s,
    fasts: s.fasts.map((f) => {
      if (f.id !== id) return f
      const startTs = patch.startTs ?? f.startTs
      const endTs = patch.endTs ?? f.endTs
      if (endTs <= startTs) return f
      return { ...f, startTs, endTs, hit: elapsedH(startTs, endTs) >= f.targetH }
    }),
  }))
}

/** Newly earned, not-yet-celebrated milestones — marks them and returns them. */
export function claimNewMilestones(): Milestone[] {
  const st = oraStore.get()
  const s = oraStats(st.fasts)
  const fresh = MILESTONES.filter((m) => m.test(st.fasts, s) && !st.celebrated.includes(m.id))
  if (fresh.length > 0) {
    oraStore.set((x) => ({ ...x, celebrated: [...x.celebrated, ...fresh.map((m) => m.id)] }))
  }
  return fresh
}

/* One-time v2 reconciliation, safely AFTER every declaration above: users
   arriving with history but no celebration record get their already-earned
   milestones marked quietly — no confetti storm for ancient history. */
;(function seedCelebratedOnce() {
  const st = oraStore.get()
  if (st.celebrated.length === 0 && st.fasts.length > 0) {
    const s = oraStats(st.fasts)
    const ids = MILESTONES.filter((m) => m.test(st.fasts, s)).map((m) => m.id)
    if (ids.length > 0) oraStore.set((x) => ({ ...x, celebrated: ids }))
  }
})()

/** Minutes fasted attributed to each end-day — the CADENCE feed. */
export function fastMinutesByDay(fasts: readonly Fast[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const f of fasts) {
    const d = dayKey(f.endTs)
    m.set(d, (m.get(d) ?? 0) + (f.endTs - f.startTs) / 60_000)
  }
  return m
}

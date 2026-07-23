/**
 * GHISA v5 — a 1:1 port of the standalone prototype's data model.
 * Exercises are id-referenced (library + customs), templates hold
 * {exerciseId, sets}, workouts store only completed sets as numbers.
 * v4 state (name-based sessions/templates) migrates losslessly.
 */
import { createPersistedStore, createStore } from '../../core/store'
import { logEvent } from '../../core/events'
import { epley as coreEpley, brzycki as coreBrzycki } from '../../core/strength'

/* ------------------------------ types ------------------------------ */

export type SetType = 'N' | 'W' | 'D' | 'F' // normal, warmup, drop, failure

export interface Exercise {
  id: string
  name: string
  muscle: string
  equipment: string
  custom: boolean
  /** One-line setup/execution cue, shown on the exercise page. */
  cue?: string
}

export interface TemplateItem {
  exerciseId: string
  sets: number
}

export interface Template {
  id: string
  name: string
  items: TemplateItem[]
}

/** Sets inside the live workout keep raw input strings, exactly like the prototype. */
export interface ActiveSet {
  id: string
  type: SetType
  weight: string
  reps: string
  done: boolean
  prs: string[]
}

export interface ActiveEntry {
  id: string
  exerciseId: string
  supersetGroup: string | null
  sets: ActiveSet[]
}

export interface ActiveWorkout {
  id: string
  name: string
  startedAt: number
  entries: ActiveEntry[]
}

/** Saved sets are numbers; only completed sets survive Finish. */
export interface WSet {
  id: string
  type: SetType
  weight: number
  reps: number
  done: boolean
  prs: string[]
}

export interface WEntry {
  id: string
  exerciseId: string
  supersetGroup: string | null
  sets: WSet[]
}

export interface Workout {
  id: string
  name: string
  startedAt: number
  /** minutes */
  duration: number
  entries: WEntry[]
  sets: number
  reps: number
  volume: number
  prCount: number
}

export interface GhisaSettings {
  restSec: number
  unit: 'kg'
  heightCm?: number
}

/** Manual body measurement — all fields optional, kg / cm. */
export interface Measure {
  id: string
  ts: number
  weightKg?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  bicepsCm?: number
  thighCm?: number
}

export interface GhisaState {
  exercises: Exercise[]
  templates: Template[]
  workouts: Workout[]
  measures: Measure[]
  settings: GhisaSettings
  active: ActiveWorkout | null
}

/* ---------------------------- seed data ---------------------------- */

export const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const

const LIB_ROWS: [string, string, string, string, string][] = [
  ['bench-press', 'Bench Press', 'Chest', 'Barbell', 'Shoulder blades pinned, feet planted, bar to mid-chest, press up and slightly back.'],
  ['incline-bench', 'Incline Bench Press', 'Chest', 'Barbell', 'Bench at ~30°, grip just outside shoulders, lower to the upper chest, press without flaring.'],
  ['incline-db-press', 'Incline Dumbbell Press', 'Chest', 'Dumbbell', 'Bench 30–45°, dumbbells over the upper chest, deep stretch at the bottom, press up together.'],
  ['db-bench', 'Dumbbell Bench Press', 'Chest', 'Dumbbell', 'Flat bench, elbows ~45° from the torso, lower to a full stretch, press without clanging.'],
  ['chest-fly', 'Cable Chest Fly', 'Chest', 'Cable', 'Fix a slight elbow bend, open wide to a stretch, squeeze the cables together at mid-chest.'],
  ['dip', 'Dip', 'Chest', 'Bodyweight', 'Lean the torso forward, elbows track back, lower to a deep stretch, press up without shrugging.'],
  ['push-up', 'Push-Up', 'Chest', 'Bodyweight', 'One rigid line, hands under shoulders, chest to the floor, press without the hips sagging.'],
  ['deadlift', 'Deadlift', 'Back', 'Barbell', 'Bar over mid-foot, hinge and grip, brace hard, push the floor away and stand tall.'],
  ['barbell-row', 'Barbell Row', 'Back', 'Barbell', 'Hinge to ~45° with a flat back, pull the bar to the lower ribs, lower under control.'],
  ['lat-pulldown', 'Lat Pulldown', 'Back', 'Cable', 'Slight lean back, drive the elbows down to bring the bar to the upper chest — no swinging.'],
  ['pull-up', 'Pull-Up', 'Back', 'Bodyweight', 'From a dead hang, pull the chest to the bar, elbows down and back, full stretch every rep.'],
  ['seated-row', 'Seated Cable Row', 'Back', 'Cable', 'Sit tall, pull the handle to the waist, squeeze the shoulder blades, resist the return.'],
  ['db-row', 'Dumbbell Row', 'Back', 'Dumbbell', 'One hand braced, flat back, pull the dumbbell to the hip without twisting the torso.'],
  ['face-pull', 'Face Pull', 'Back', 'Cable', 'Rope at face height, pull toward the eyes with elbows high, finish with hands apart.'],
  ['squat', 'Back Squat', 'Legs', 'Barbell', 'Bar on the upper back, brace, sit down between the hips, drive up through mid-foot.'],
  ['front-squat', 'Front Squat', 'Legs', 'Barbell', 'Bar on the front delts with elbows high, torso upright, sit deep and stand.'],
  ['rdl', 'Romanian Deadlift', 'Legs', 'Barbell', 'Soft knees, push the hips back, bar along the thighs to a hamstring stretch, squeeze up.'],
  ['leg-press', 'Leg Press', 'Legs', 'Machine', 'Feet mid-platform, lower deep — stop before the lower back rolls off the pad.'],
  ['leg-curl', 'Leg Curl', 'Legs', 'Machine', 'Hips pinned to the pad, curl the heels to the glutes, lower slowly.'],
  ['leg-extension', 'Leg Extension', 'Legs', 'Machine', 'Sit tall, extend to full lockout, pause a beat, lower under control.'],
  ['bulgarian-split', 'Bulgarian Split Squat', 'Legs', 'Dumbbell', 'Rear foot on the bench, slight forward lean, drop the back knee, drive through the front heel.'],
  ['lunge', 'Walking Lunge', 'Legs', 'Dumbbell', 'Long stride, back knee toward the floor, push through the front heel, stay tall.'],
  ['hip-thrust', 'Hip Thrust', 'Legs', 'Barbell', 'Upper back on the bench, chin tucked, drive the hips to full lockout and squeeze.'],
  ['calf-raise', 'Standing Calf Raise', 'Legs', 'Machine', 'Full stretch at the bottom, pause, drive to tip-toes — no bouncing.'],
  ['ohp', 'Overhead Press', 'Shoulders', 'Barbell', 'Glutes tight, press from the collarbone straight overhead, head through at lockout.'],
  ['db-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulders', 'Dumbbell', 'Dumbbells at ear height, press overhead without arching, lower to a full stretch.'],
  ['lateral-raise', 'Lateral Raise', 'Shoulders', 'Dumbbell', 'Slight forward lean, raise to shoulder height leading with the elbows — no swing.'],
  ['rear-delt-fly', 'Rear Delt Fly', 'Shoulders', 'Dumbbell', 'Hinge over, arms wide with soft elbows, squeeze the rear delts without momentum.'],
  ['upright-row', 'Upright Row', 'Shoulders', 'Cable', 'Pull the cable up the body, elbows lead and stay above the wrists, stop at the lower chest.'],
  ['bicep-curl', 'Dumbbell Curl', 'Arms', 'Dumbbell', 'Elbows pinned to the sides, curl without swinging, lower slow and full.'],
  ['barbell-curl', 'Barbell Curl', 'Arms', 'Barbell', 'Shoulder-width grip, elbows still, curl to shoulder height, control the negative.'],
  ['hammer-curl', 'Hammer Curl', 'Arms', 'Dumbbell', 'Neutral grip, elbows pinned, curl and squeeze at the top — no body English.'],
  ['preacher-curl', 'Preacher Curl', 'Arms', 'Machine', 'Armpits over the pad, curl to the top, lower to a near-full stretch.'],
  ['triceps-pushdown', 'Triceps Pushdown', 'Arms', 'Cable', 'Elbows pinned to the ribs, press to lockout — only the forearms move.'],
  ['skull-crusher', 'Skull Crusher', 'Arms', 'Barbell', 'Upper arms vertical, lower the bar toward the forehead, extend without flaring.'],
  ['overhead-extension', 'Overhead Triceps Extension', 'Arms', 'Cable', 'Elbows by the ears, lower behind the head to a stretch, extend to lockout.'],
  ['plank', 'Plank', 'Core', 'Bodyweight', 'Elbows under shoulders, glutes and abs squeezed, one straight line — keep breathing.'],
  ['cable-crunch', 'Cable Crunch', 'Core', 'Cable', 'Kneel with hips still, crunch the ribs toward the pelvis, resist the way back up.'],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'Core', 'Bodyweight', 'Dead hang, no swing — raise the legs by curling the pelvis up.'],
  ['ab-wheel', 'Ab Wheel Rollout', 'Core', 'Bodyweight', 'Braced and hollow, roll out only as far as the back stays flat, pull back with the abs.'],
]

export const LIB: Exercise[] = LIB_ROWS.map(([id, name, muscle, equipment, cue]) => ({
  id, name, muscle, equipment, custom: false, cue,
}))

const SEED_TEMPLATES: Template[] = [
  {
    id: 'tpl-push', name: 'Push Day',
    items: [
      { exerciseId: 'bench-press', sets: 4 },
      { exerciseId: 'ohp', sets: 3 },
      { exerciseId: 'incline-db-press', sets: 3 },
      { exerciseId: 'lateral-raise', sets: 3 },
      { exerciseId: 'triceps-pushdown', sets: 3 },
    ],
  },
  {
    id: 'tpl-pull', name: 'Pull Day',
    items: [
      { exerciseId: 'deadlift', sets: 3 },
      { exerciseId: 'barbell-row', sets: 3 },
      { exerciseId: 'lat-pulldown', sets: 3 },
      { exerciseId: 'face-pull', sets: 3 },
      { exerciseId: 'bicep-curl', sets: 3 },
    ],
  },
  {
    id: 'tpl-legs', name: 'Leg Day',
    items: [
      { exerciseId: 'squat', sets: 4 },
      { exerciseId: 'rdl', sets: 3 },
      { exerciseId: 'leg-press', sets: 3 },
      { exerciseId: 'leg-curl', sets: 3 },
      { exerciseId: 'calf-raise', sets: 3 },
    ],
  },
]

/* ------------------------------ utils ------------------------------ */

export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export const DAY = 86400000

/** Estimated 1RM — delegates to core/strength so GHISA and CALIBER can never drift. */
export function epley(w: unknown, r: unknown): number {
  const weight = Number(w) || 0
  const reps = Number(r) || 0
  if (weight <= 0 || reps <= 0) return 0
  return coreEpley(weight, reps)
}

/** Secondary estimate, mirrored from CALIBER's dual readout. */
export function brzycki(w: unknown, r: unknown): number {
  const weight = Number(w) || 0
  const reps = Number(r) || 0
  if (weight <= 0 || reps <= 0) return 0
  return coreBrzycki(weight, reps)
}

export const roundTo = (v: number, step: number): number => Math.round(v / step) * step

export const round1 = (n: number): number => Math.round(n * 10) / 10
export const round2p5 = (n: number): number => Math.round(n / 2.5) * 2.5

export function fmtVol(v: number): string {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
  if (v >= 10000) return Math.round(v / 1000) + 'k'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return String(Math.round(v))
}

export function fmtDur(min: number): string {
  const m = Math.round(min)
  if (m < 60) return m + 'm'
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm'
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
export function fmtDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

export function mondayOf(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  const shift = (d.getDay() + 6) % 7
  return d.getTime() - shift * DAY
}

export function weekStreak(workouts: Workout[], now = Date.now()): number {
  if (workouts.length === 0) return 0
  const weeks = new Set(workouts.map((w) => mondayOf(w.startedAt)))
  let cur = mondayOf(now)
  let streak = 0
  if (!weeks.has(cur)) cur -= 7 * DAY
  while (weeks.has(cur)) {
    streak += 1
    cur -= 7 * DAY
  }
  return streak
}

export type Period = 'week' | 'month' | 'year' | 'all'

export function periodStart(period: Period, now = new Date()): number {
  if (period === 'week') return mondayOf(now.getTime())
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  if (period === 'year') return new Date(now.getFullYear(), 0, 1).getTime()
  return 0
}

interface TotalsLikeSet { done: boolean; weight: string | number; reps: string | number }
interface TotalsLikeEntry { sets: TotalsLikeSet[] }

export function workoutTotals(entries: TotalsLikeEntry[]): { sets: number; reps: number; volume: number } {
  let sets = 0
  let reps = 0
  let volume = 0
  entries.forEach((e) =>
    e.sets.forEach((s) => {
      if (!s.done) return
      sets += 1
      reps += Number(s.reps) || 0
      volume += (Number(s.weight) || 0) * (Number(s.reps) || 0)
    }),
  )
  return { sets, reps, volume }
}

export function suggestName(now = new Date()): string {
  const h = now.getHours()
  if (h < 11) return 'Morning Workout'
  if (h < 17) return 'Afternoon Workout'
  return 'Evening Workout'
}

/* PR detection against saved history (warmups excluded) */
export function historyMaxes(
  workouts: Workout[],
  exerciseId: string,
): { maxW: number; maxE: number; maxR: number; sessions: number } {
  let maxW = 0
  let maxE = 0
  let maxR = 0
  let sessions = 0
  workouts.forEach((w) => {
    let hit = false
    w.entries.forEach((e) => {
      if (e.exerciseId !== exerciseId) return
      e.sets.forEach((s) => {
        if (s.type === 'W') return
        hit = true
        maxW = Math.max(maxW, Number(s.weight) || 0)
        maxE = Math.max(maxE, epley(s.weight, s.reps))
        maxR = Math.max(maxR, Number(s.reps) || 0)
      })
    })
    if (hit) sessions += 1
  })
  return { maxW, maxE, maxR, sessions }
}

export function detectPRs(
  workouts: Workout[],
  exerciseId: string,
  weight: number,
  reps: number,
  type: SetType,
): string[] {
  if (type === 'W') return []
  const { maxW, maxE, maxR } = historyMaxes(workouts, exerciseId)
  if (maxW === 0 && maxE === 0 && maxR === 0) return [] // no history yet
  const prs: string[] = []
  if (weight > maxW) prs.push('Weight')
  if (epley(weight, reps) > maxE + 0.01) prs.push('1RM')
  if (reps > maxR) prs.push('Reps')
  return prs
}

/* --------------------------- demo data --------------------------- */

export function makeDemoWorkouts(now = Date.now()): Workout[] {
  const plans: { name: string; day: number; items: [string, number, number][] }[] = [
    { name: 'Push Day', day: 0, items: [['bench-press', 4, 67.5], ['ohp', 3, 40], ['incline-db-press', 3, 24], ['lateral-raise', 3, 10], ['triceps-pushdown', 3, 25]] },
    { name: 'Pull Day', day: 2, items: [['deadlift', 3, 115], ['barbell-row', 3, 65], ['lat-pulldown', 3, 60], ['face-pull', 3, 20], ['bicep-curl', 3, 12]] },
    { name: 'Leg Day', day: 4, items: [['squat', 4, 87.5], ['rdl', 3, 80], ['leg-press', 3, 140], ['leg-curl', 3, 45], ['calf-raise', 3, 60]] },
  ]
  const workouts: Workout[] = []
  const thisMonday = mondayOf(now)
  for (let week = 8; week >= 1; week--) {
    plans.forEach((plan) => {
      const start = thisMonday - week * 7 * DAY + plan.day * DAY + 18 * 3600000
      if (start > now) return
      const entries: WEntry[] = plan.items.map(([exId, nSets, base]) => {
        const prog = (8 - week) * (base >= 60 ? 2.5 : 1)
        const sets: WSet[] = []
        for (let i = 0; i < nSets; i++) {
          const drop = i === nSets - 1 ? 0.95 : 1
          const weight = round2p5((base + prog) * drop + (Math.random() < 0.3 ? 2.5 : 0))
          const reps = 8 + Math.floor(Math.random() * 3) - (i === 0 ? 0 : Math.floor(Math.random() * 2))
          sets.push({ id: uid(), type: 'N', weight, reps: Math.max(5, reps), done: true, prs: [] })
        }
        return { id: uid(), exerciseId: exId, supersetGroup: null, sets }
      })
      const totals = workoutTotals(entries)
      workouts.push({
        id: uid(), name: plan.name, startedAt: start,
        duration: 52 + Math.floor(Math.random() * 22),
        entries, ...totals, prCount: 0,
      })
    })
  }
  return workouts
}

/* ------------------------- defaults + store ------------------------- */

function defaults(): GhisaState {
  return {
    exercises: LIB,
    templates: SEED_TEMPLATES,
    workouts: [],
    measures: [],
    settings: { restSec: 90, unit: 'kg' },
    active: null,
  }
}

/* ---------------------------- migration ---------------------------- */

const OLD_TYPE: Record<string, SetType> = { normal: 'N', warmup: 'W', drop: 'D', fail: 'F' }

/** Keyword muscle guess for old names that aren't in the library. */
function guessMuscle(name: string): string {
  const n = name.toLowerCase()
  if (/curl(?!.*leg)|bicep|tricep|pushdown|skull/.test(n)) return 'Arms'
  if (/squat|leg|lunge|calf|thrust|rdl|deadlift.*romanian/.test(n)) return 'Legs'
  if (/row|pull|lat|deadlift|face/.test(n)) return 'Back'
  if (/lateral|shoulder|delt|press.*overhead|ohp|upright/.test(n)) return 'Shoulders'
  if (/bench|chest|fly|flies|dip|push-?up/.test(n)) return 'Chest'
  if (/plank|crunch|ab|core|leg raise/.test(n)) return 'Core'
  return 'Other'
}

const NAME_ALIAS: Record<string, string> = {
  'squat': 'squat',
  'pull-up': 'pull-up',
  'pullup': 'pull-up',
  'chest flies': 'chest-fly',
  'chest fly': 'chest-fly',
  'biceps curl': 'bicep-curl',
  'bicep curl': 'bicep-curl',
  'calf raise': 'calf-raise',
  'overhead press': 'ohp',
  'romanian deadlift': 'rdl',
  'incline dumbbell press': 'incline-db-press',
}

/** Resolve an old free-text exercise name to a library id, creating a custom on miss. */
function resolveExercise(name: string, pool: Exercise[]): { id: string; pool: Exercise[] } {
  const key = name.trim().toLowerCase()
  const hit = pool.find((e) => e.name.toLowerCase() === key)
  if (hit) return { id: hit.id, pool }
  const alias = NAME_ALIAS[key]
  if (alias && pool.some((e) => e.id === alias)) return { id: alias, pool }
  const custom: Exercise = {
    id: 'custom-' + uid(),
    name: name.trim(),
    muscle: guessMuscle(name),
    equipment: 'Custom',
    custom: true,
  }
  return { id: custom.id, pool: [...pool, custom] }
}

interface OldSet { id?: string; weight?: number; reps?: number; type?: string; done?: boolean }
interface OldExercise { id?: string; name?: string; sets?: OldSet[] }
interface OldSession { id?: string; name?: string; startTs?: number; endTs?: number; exercises?: OldExercise[] }
interface OldTemplateExercise { name?: string; targetSets?: number }
interface OldTemplate { id?: string; name?: string; exercises?: OldTemplateExercise[] }
interface OldState {
  active?: OldSession | null
  history?: OldSession[]
  restSeconds?: number
  templates?: OldTemplate[]
}

function isOldState(d: unknown): d is OldState {
  return typeof d === 'object' && d !== null && 'history' in d && !('workouts' in d)
}

export function migrateGhisa(data: unknown, _fromVersion: number): GhisaState {
  const base = defaults()
  if (data === null || typeof data !== 'object') return base

  /* --- v4 and older: name-based sessions/templates --- */
  if (isOldState(data)) {
    let pool = [...LIB]
    const workouts: Workout[] = []
    for (const s of data.history ?? []) {
      const entries: WEntry[] = []
      for (const ex of s.exercises ?? []) {
        if (!ex.name) continue
        const sets: WSet[] = (ex.sets ?? [])
          .filter((x) => x.done)
          .map((x) => ({
            id: x.id ?? uid(),
            type: OLD_TYPE[x.type ?? 'normal'] ?? 'N',
            weight: Number(x.weight) || 0,
            reps: Number(x.reps) || 0,
            done: true,
            prs: [],
          }))
        if (sets.length === 0) continue
        const r = resolveExercise(ex.name, pool)
        pool = r.pool
        entries.push({ id: ex.id ?? uid(), exerciseId: r.id, supersetGroup: null, sets })
      }
      if (entries.length === 0) continue
      const totals = workoutTotals(entries)
      const startTs = s.startTs ?? Date.now()
      workouts.push({
        id: s.id ?? uid(),
        name: s.name?.trim() || 'Workout',
        startedAt: startTs,
        duration: Math.max(1, ((s.endTs ?? startTs + 45 * 60000) - startTs) / 60000),
        entries,
        ...totals,
        prCount: 0,
      })
    }
    workouts.sort((a, b) => a.startedAt - b.startedAt)

    const templates: Template[] = []
    for (const t of data.templates ?? []) {
      const items: TemplateItem[] = []
      for (const te of t.exercises ?? []) {
        if (!te.name) continue
        const r = resolveExercise(te.name, pool)
        pool = r.pool
        items.push({ exerciseId: r.id, sets: Math.max(1, Math.min(10, te.targetSets ?? 3)) })
      }
      if (items.length > 0) templates.push({ id: t.id ?? 'tpl-' + uid(), name: t.name?.trim() || 'Template', items })
    }

    let active: ActiveWorkout | null = null
    const oa = data.active
    if (oa && Array.isArray(oa.exercises)) {
      const entries: ActiveEntry[] = []
      for (const ex of oa.exercises) {
        if (!ex.name) continue
        const r = resolveExercise(ex.name, pool)
        pool = r.pool
        entries.push({
          id: ex.id ?? uid(),
          exerciseId: r.id,
          supersetGroup: null,
          sets: (ex.sets ?? []).map((x) => ({
            id: x.id ?? uid(),
            type: OLD_TYPE[x.type ?? 'normal'] ?? 'N',
            weight: x.weight && x.weight > 0 ? String(x.weight) : '',
            reps: x.reps && x.reps > 0 ? String(x.reps) : '',
            done: Boolean(x.done),
            prs: [],
          })),
        })
      }
      active = { id: oa.id ?? uid(), name: oa.name ?? '', startedAt: oa.startTs ?? Date.now(), entries }
    }

    return {
      exercises: pool,
      templates: templates.length > 0 ? templates : base.templates,
      workouts,
      measures: [],
      settings: { restSec: typeof data.restSeconds === 'number' ? data.restSeconds : 90, unit: 'kg' },
      active,
    }
  }

  /* --- v5 shape: normalize defensively --- */
  const d = data as Partial<GhisaState>
  const stored = Array.isArray(d.exercises) && d.exercises.length > 0 ? d.exercises : base.exercises
  /* Library-backed entries refresh from LIB (authoritative name/muscle/cue); customs pass through. */
  const exercises = stored.map((e) => {
    if (e.custom) return e
    const lib = LIB.find((l) => l.id === e.id)
    return lib ?? e
  })
  const known = new Set(exercises.map((e) => e.id))
  for (const libEx of LIB) if (!known.has(libEx.id)) exercises.push(libEx)
  return {
    exercises,
    templates: Array.isArray(d.templates) ? d.templates : base.templates,
    workouts: Array.isArray(d.workouts) ? d.workouts : [],
    measures: Array.isArray(d.measures) ? d.measures : [],
    settings: { ...base.settings, ...(d.settings ?? {}) },
    active: d.active ?? null,
  }
}

export const ghisaStore = createPersistedStore<GhisaState>('ghisa', defaults(), 7, migrateGhisa)

/** Ephemeral UI channel — lets the dashboard open the live workout screen. Never persisted. */
export const ghisaUi = createStore<{ liveOpen: boolean }>({ liveOpen: false })

/* ------------------------------ actions ------------------------------ */

export function exerciseById(st: GhisaState, id: string): Exercise | undefined {
  return st.exercises.find((e) => e.id === id)
}

function blankSet(type: SetType = 'N', weight = ''): ActiveSet {
  return { id: uid(), type, weight, reps: '', done: false, prs: [] }
}

/** Start empty or from a template. If a workout is already running, this is a no-op. */
export function startWorkout(tpl: Template | null): void {
  ghisaStore.set((st) => {
    if (st.active) return st
    const entries: ActiveEntry[] = tpl
      ? tpl.items.map((it) => ({
          id: uid(),
          exerciseId: it.exerciseId,
          supersetGroup: null,
          sets: Array.from({ length: it.sets }, () => blankSet()),
        }))
      : []
    return { ...st, active: { id: uid(), name: tpl ? tpl.name : '', startedAt: Date.now(), entries } }
  })
}

export function setActive(fn: (a: ActiveWorkout) => ActiveWorkout): void {
  ghisaStore.set((st) => (st.active ? { ...st, active: fn(st.active) } : st))
}

export function patchEntry(entryId: string, fn: (e: ActiveEntry) => ActiveEntry): void {
  setActive((a) => ({ ...a, entries: a.entries.map((e) => (e.id === entryId ? fn(e) : e)) }))
}

export function updateSet(entryId: string, setId: string, patch: Partial<ActiveSet>): void {
  patchEntry(entryId, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
  }))
}

const SET_TYPES: readonly SetType[] = ['N', 'W', 'D', 'F']

export function cycleType(entryId: string, setId: string): void {
  patchEntry(entryId, (e) => ({
    ...e,
    sets: e.sets.map((s) =>
      s.id === setId ? { ...s, type: SET_TYPES[(SET_TYPES.indexOf(s.type) + 1) % SET_TYPES.length] } : s,
    ),
  }))
}

export function addSet(entryId: string, type: SetType = 'N'): void {
  patchEntry(entryId, (e) => {
    const last = e.sets[e.sets.length - 1]
    return { ...e, sets: [...e.sets, blankSet(type, last ? last.weight : '')] }
  })
}

export function removeLastSet(entryId: string): void {
  patchEntry(entryId, (e) => ({ ...e, sets: e.sets.length > 1 ? e.sets.slice(0, -1) : e.sets }))
}

export function removeEntry(entryId: string): void {
  setActive((a) => ({ ...a, entries: a.entries.filter((e) => e.id !== entryId) }))
}

export function addEntryFor(exerciseId: string): void {
  setActive((a) => ({
    ...a,
    entries: [
      ...a.entries,
      { id: uid(), exerciseId, supersetGroup: null, sets: [blankSet(), blankSet(), blankSet()] },
    ],
  }))
}

export function supersetWithNext(entryId: string): void {
  setActive((a) => {
    const idx = a.entries.findIndex((e) => e.id === entryId)
    if (idx < 0 || idx >= a.entries.length - 1) return a
    const group = a.entries[idx].supersetGroup || a.entries[idx + 1].supersetGroup || uid()
    return {
      ...a,
      entries: a.entries.map((e, i) => (i === idx || i === idx + 1 ? { ...e, supersetGroup: group } : e)),
    }
  })
}

export function clearSuperset(entryId: string): void {
  setActive((a) => ({
    ...a,
    entries: a.entries.map((e) => (e.id === entryId ? { ...e, supersetGroup: null } : e)),
  }))
}

export interface FinishResult {
  workout: Workout
  volumePR: boolean
}

/** Prototype finish: keep only completed sets as numbers; empty session just discards. */
export function finishWorkout(name: string): FinishResult | null {
  const st = ghisaStore.get()
  const active = st.active
  if (!active) return null
  const entries: WEntry[] = active.entries
    .map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      supersetGroup: e.supersetGroup,
      sets: e.sets
        .filter((s) => s.done)
        .map((s) => ({
          id: s.id,
          type: s.type,
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
          done: true,
          prs: s.prs,
        })),
    }))
    .filter((e) => e.sets.length > 0)
  if (entries.length === 0) {
    ghisaStore.set((s) => ({ ...s, active: null }))
    return null
  }
  const totals = workoutTotals(entries)
  const bestVol = st.workouts.reduce((a, w) => Math.max(a, w.volume), 0)
  const prCount = entries.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.prs.length, 0), 0)
  const workout: Workout = {
    id: active.id,
    name,
    startedAt: active.startedAt,
    duration: Math.max(1, (Date.now() - active.startedAt) / 60000),
    entries,
    ...totals,
    prCount,
  }
  ghisaStore.set((s) => ({ ...s, workouts: [...s.workouts, workout], active: null }))
  logEvent({ module: 'ghisa', kind: 'session', value: totals.volume, unit: 'kg' })
  return { workout, volumePR: bestVol > 0 && totals.volume > bestVol }
}

export function cancelWorkout(): void {
  ghisaStore.set((st) => ({ ...st, active: null }))
}

export function deleteWorkout(id: string): void {
  ghisaStore.set((st) => ({ ...st, workouts: st.workouts.filter((w) => w.id !== id) }))
}

export function saveTemplate(tpl: Template): void {
  ghisaStore.set((st) => {
    const exists = st.templates.some((t) => t.id === tpl.id)
    return {
      ...st,
      templates: exists ? st.templates.map((t) => (t.id === tpl.id ? tpl : t)) : [...st.templates, tpl],
    }
  })
}

export function deleteTemplate(id: string): void {
  ghisaStore.set((st) => ({ ...st, templates: st.templates.filter((t) => t.id !== id) }))
}

export function addCustomExercise(ex: Exercise): void {
  ghisaStore.set((st) => ({ ...st, exercises: [...st.exercises, ex] }))
}

export function setRestSec(sec: number): void {
  ghisaStore.set((st) => ({ ...st, settings: { ...st.settings, restSec: sec } }))
}

export function seedDemo(): void {
  ghisaStore.set((st) => ({ ...st, workouts: [...st.workouts, ...makeDemoWorkouts()] }))
}

/** Removes demo/all workouts + custom exercises + templates back to seeds. Active survives nothing. */
export function resetAll(): void {
  ghisaStore.set(() => defaults())
}

/* ---------------------- v6: measures + profile helpers ---------------------- */

export function addMeasure(m: Omit<Measure, 'id' | 'ts'> & { ts?: number }): void {
  const entry: Measure = { id: uid(), ts: m.ts ?? Date.now(), ...m }
  ghisaStore.set((st) => ({ ...st, measures: [...st.measures, entry] }))
}

export function deleteMeasure(id: string): void {
  ghisaStore.set((st) => ({ ...st, measures: st.measures.filter((x) => x.id !== id) }))
}

export function setHeight(cm: number | undefined): void {
  ghisaStore.set((st) => ({ ...st, settings: { ...st.settings, heightCm: cm } }))
}

export function latestWeight(measures: Measure[]): number | undefined {
  for (let i = measures.length - 1; i >= 0; i--) {
    const w = measures[i].weightKg
    if (typeof w === 'number' && w > 0) return w
  }
  return undefined
}

export type ProfileMetric = 'duration' | 'volume' | 'reps'

/** Weekly buckets (Mon-start) over the last `weeksBack` weeks for the profile chart. */
export function weeklyMetric(
  workouts: Workout[],
  weeksBack: number,
  metric: ProfileMetric,
  now = Date.now(),
): { label: string; vol: number; ts: number }[] {
  const thisMon = mondayOf(now)
  const out: { label: string; vol: number; ts: number }[] = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = thisMon - i * 7 * DAY
    let v = 0
    for (const w of workouts) {
      if (w.startedAt < start || w.startedAt >= start + 7 * DAY) continue
      v += metric === 'duration' ? w.duration : metric === 'volume' ? w.volume : w.reps
    }
    out.push({ label: fmtDateShort(start), vol: Math.round(v), ts: start })
  }
  return out
}

const dayFloor = (ts: number): number => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Hevy-style lifetime rest days: days since the first workout (inclusive of today) minus distinct training days. */
export function totalRestDays(workouts: Workout[], now = Date.now()): number {
  if (workouts.length === 0) return 0
  const days = new Set(workouts.map((w) => dayFloor(w.startedAt)))
  const first = Math.min(...days)
  const span = Math.floor((dayFloor(now) - first) / DAY) + 1
  return Math.max(0, span - days.size)
}

/** Distinct training days as day-floor timestamps — feeds the calendar. */
export function workoutDaySet(workouts: Workout[]): Set<number> {
  return new Set(workouts.map((w) => dayFloor(w.startedAt)))
}

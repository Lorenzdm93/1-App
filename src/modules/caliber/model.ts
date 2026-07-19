import { createPersistedStore } from '../../core/store'
import { logEvent } from '../../core/events'
import { liftById, type Sex } from './formulas'

export interface PR {
  e1rm: number
  ts: number
}

export interface TestEntry {
  e1rm: number
  ts: number
}

export interface CaliberState {
  sex: Sex
  bodyweight: number
  /** cm; context only (BMI line) — never a percentile axis. */
  height: number | null
  liftId: string
  weight: number
  reps: number
  prs: Record<string, PR>
  /** Every logged test per lift, oldest → newest — chart fuel. */
  tests: Record<string, TestEntry[]>
  /** The aim: "top X%". 30 = stronger than 70% of the population. */
  aimTop: number
  /** Which lifts this lifter actually chases — no squat for a bad back is a valid life. */
  lifts: string[]
}

const DEFAULTS: CaliberState = {
  sex: 'm',
  bodyweight: 80,
  height: null,
  liftId: 'bench',
  weight: 80,
  reps: 5,
  prs: {},
  tests: {},
  aimTop: 30,
  lifts: ['bench', 'squat', 'deadlift', 'pullup'],
}

import { PERCENTILES } from './formulas'

interface V2Extras {
  targetLevel?: number
}

/**
 * v1 had no test history and no target. v2 aimed at a LEVEL; v3 aims at a
 * percentile — the old target maps to the percentile its threshold sat on.
 */
export function migrateCaliber(data: unknown, fromVersion: number): CaliberState {
  if (fromVersion >= 1 && fromVersion <= 3 && data !== null && typeof data === 'object') {
    const d = data as Partial<CaliberState> & V2Extras
    const prs = d.prs && typeof d.prs === 'object' ? d.prs : {}
    let tests: Record<string, TestEntry[]> = d.tests && typeof d.tests === 'object' ? d.tests : {}
    if (fromVersion === 1) {
      tests = {}
      for (const [lift, pr] of Object.entries(prs)) {
        if (pr && typeof pr.e1rm === 'number') tests[lift] = [{ e1rm: pr.e1rm, ts: pr.ts }]
      }
    }
    let aimTop = 30
    if (typeof d.targetLevel === 'number' && d.targetLevel >= 1 && d.targetLevel <= 5) {
      const pct = PERCENTILES[d.targetLevel - 1]
      aimTop = Math.min(50, Math.max(5, Math.round((100 - pct) / 5) * 5))
    } else if (typeof (d as { aimTop?: number }).aimTop === 'number') {
      aimTop = (d as { aimTop: number }).aimTop
    }
    return {
      ...DEFAULTS,
      sex: d.sex === 'f' ? 'f' : 'm',
      bodyweight: typeof d.bodyweight === 'number' ? d.bodyweight : 80,
      height: typeof (d as { height?: number }).height === 'number' ? (d as { height: number }).height : null,
      liftId: typeof d.liftId === 'string' ? d.liftId : 'bench',
      weight: typeof d.weight === 'number' ? d.weight : 80,
      reps: typeof d.reps === 'number' ? d.reps : 5,
      prs,
      tests,
      aimTop,
      lifts: Array.isArray((d as { lifts?: unknown }).lifts)
        ? ((d as { lifts: string[] }).lifts)
        : DEFAULTS.lifts,
    }
  }
  return DEFAULTS
}

export const caliberStore = createPersistedStore<CaliberState>('caliber', DEFAULTS, 4, migrateCaliber)

export function patchCaliber(patch: Partial<CaliberState>): void {
  caliberStore.set((s) => ({ ...s, ...patch }))
}

/** Records a test into history; returns true when it sets a new PR for the lift. */
export function logTest(liftId: string, estimate: number): boolean {
  const rounded = Math.round(estimate * 2) / 2
  const prev = caliberStore.get().prs[liftId]
  const isPr = !prev || rounded > prev.e1rm
  caliberStore.set((s) => {
    const series = [...(s.tests[liftId] ?? []), { e1rm: rounded, ts: Date.now() }].slice(-40)
    return {
      ...s,
      tests: { ...s.tests, [liftId]: series },
      prs: isPr ? { ...s.prs, [liftId]: { e1rm: rounded, ts: Date.now() } } : s.prs,
    }
  })
  logEvent({
    module: 'caliber',
    kind: isPr ? 'pr' : 'test',
    value: rounded,
    unit: 'kg',
    meta: { lift: liftById(liftId).name },
  })
  return isPr
}

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
  liftId: string
  weight: number
  reps: number
  prs: Record<string, PR>
  /** Every logged test per lift, oldest → newest — chart fuel. */
  tests: Record<string, TestEntry[]>
  /** LEVELS index the lifter is aiming for (1 = Beginner … 5 = Elite). */
  targetLevel: number
}

const DEFAULTS: CaliberState = {
  sex: 'm',
  bodyweight: 80,
  liftId: 'bench',
  weight: 80,
  reps: 5,
  prs: {},
  tests: {},
  targetLevel: 3,
}

/** v1 had no test history and no target. Seed test series from existing PRs. */
export function migrateCaliber(data: unknown, fromVersion: number): CaliberState {
  if (fromVersion === 1 && data !== null && typeof data === 'object') {
    const d = data as Partial<CaliberState>
    const prs = d.prs && typeof d.prs === 'object' ? d.prs : {}
    const tests: Record<string, TestEntry[]> = {}
    for (const [lift, pr] of Object.entries(prs)) {
      if (pr && typeof pr.e1rm === 'number') tests[lift] = [{ e1rm: pr.e1rm, ts: pr.ts }]
    }
    return {
      ...DEFAULTS,
      sex: d.sex === 'f' ? 'f' : 'm',
      bodyweight: typeof d.bodyweight === 'number' ? d.bodyweight : 80,
      liftId: typeof d.liftId === 'string' ? d.liftId : 'bench',
      weight: typeof d.weight === 'number' ? d.weight : 80,
      reps: typeof d.reps === 'number' ? d.reps : 5,
      prs,
      tests,
    }
  }
  return DEFAULTS
}

export const caliberStore = createPersistedStore<CaliberState>('caliber', DEFAULTS, 2, migrateCaliber)

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

import { createPersistedStore } from '../../core/store'
import { logEvent } from '../../core/events'
import { liftById, type Sex } from './formulas'

export interface PR {
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
}

export const caliberStore = createPersistedStore<CaliberState>('caliber', {
  sex: 'm',
  bodyweight: 80,
  liftId: 'bench',
  weight: 80,
  reps: 5,
  prs: {},
})

export function patchCaliber(patch: Partial<CaliberState>): void {
  caliberStore.set((s) => ({ ...s, ...patch }))
}

/** Records a test; returns true when it sets a new PR for the lift. */
export function logTest(liftId: string, estimate: number): boolean {
  const rounded = Math.round(estimate * 2) / 2
  const prev = caliberStore.get().prs[liftId]
  const isPr = !prev || rounded > prev.e1rm
  if (isPr) {
    caliberStore.set((s) => ({
      ...s,
      prs: { ...s.prs, [liftId]: { e1rm: rounded, ts: Date.now() } },
    }))
  }
  logEvent({
    module: 'caliber',
    kind: isPr ? 'pr' : 'test',
    value: rounded,
    unit: 'kg',
    meta: { lift: liftById(liftId).name },
  })
  return isPr
}

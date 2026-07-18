/**
 * The 1% ledger — user's chosen improvement rate, optional weekly goal
 * ceilings, and the frozen record of past weeks. Kept separate from the
 * scoring engine so module code can read it without import cycles.
 */
import { createPersistedStore } from './store'

export interface WeekRecord {
  score: number
  per: Record<string, number>
}

export interface OneState {
  /** Weekly improvement rate: 0.005 | 0.01 | 0.02 */
  rate: number
  /** Optional weekly goal ceilings in native units — maintenance counts at the ceiling. */
  goals: { ghisa?: number; grove?: number; respiro?: number }
  /** Frozen results per Monday weekKey. The current week is always computed live. */
  weekLog: Record<string, WeekRecord>
}

const DEFAULTS: OneState = { rate: 0.01, goals: {}, weekLog: {} }

export const oneStore = createPersistedStore<OneState>('one', DEFAULTS, 1)

export function setRate(rate: number): void {
  oneStore.set((s) => ({ ...s, rate }))
}

export function setGoal(key: keyof OneState['goals'], value: number | undefined): void {
  oneStore.set((s) => {
    const goals = { ...s.goals }
    if (value === undefined || !Number.isFinite(value) || value <= 0) delete goals[key]
    else goals[key] = value
    return { ...s, goals }
  })
}

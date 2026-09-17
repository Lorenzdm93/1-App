/**
 * Builds the Digest entirely from the engine's existing outputs — weekRecap()
 * (this-week-vs-last native deltas), computePulse() (current scores, won weeks,
 * compounding), and the frozen ledger (closed-week history for trends). Because
 * it reuses the same measures as the ring, an insight can never contradict what
 * the app shows. Nothing here reads a module's internals, so the AI layer stays
 * fully decoupled.
 */
import { oneStore } from '../one'
import { settingsStore } from '../settings'
import { enabledModules } from '../registry'
import { todayKey, weekStartKey, shiftDay, dayDiff } from '../dates'
import { computePulse, weekRecap } from '../score'
import type { Digest, DigestModule } from './types'

/** Closed-week keys (Monday), oldest→newest, bounded to the ledger's 26. */
function closedWeekKeys(weekLog: Record<string, unknown>, currentWeek: string): string[] {
  return Object.keys(weekLog)
    .filter((k) => k < currentWeek)
    .sort()
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function buildDigest(today = todayKey()): Digest {
  /* computePulse freezes any elapsed weeks first, so the ledger we read next is
     complete. */
  const pulse = computePulse(today)
  const weekLog = oneStore.get().weekLog
  const currentWeek = weekStartKey(today)
  const closed = closedWeekKeys(weekLog, currentWeek)

  const overallTrend = closed.slice(-8).map((k) => weekLog[k].score)

  /* Consecutive won weeks from the tail. */
  let wonStreak = 0
  for (let i = closed.length - 1; i >= 0; i--) {
    if (weekLog[closed[i]].score >= 100) wonStreak++
    else break
  }

  const recap = weekRecap(today)
  const recapById = new Map(recap.map((r) => [r.id, r]))
  const pulseById = new Map(pulse.modules.map((m) => [m.id, m]))

  const modules: DigestModule[] = []
  for (const mod of enabledModules(settingsStore.get().enabled)) {
    const r = recapById.get(mod.id)
    const p = pulseById.get(mod.id)
    if (!r && !p) continue

    /* Per-module closed-week scores. */
    const scores: number[] = []
    for (const k of closed) {
      const v = weekLog[k].per[mod.id]
      if (v !== undefined) scores.push(v)
    }
    const trendScores = scores.slice(-8)
    let trend4v4: number | null = null
    if (scores.length >= 4) {
      const last4 = scores.slice(-4)
      const prior4 = scores.slice(-8, -4)
      if (prior4.length >= 2) trend4v4 = round1(mean(last4) - mean(prior4))
    }

    modules.push({
      id: mod.id,
      name: mod.name,
      label: r?.label ?? mod.name,
      unit: r?.unit ?? '',
      mode: r?.mode ?? 'growth',
      cur: r ? round1(r.cur) : 0,
      prev: r && r.prev !== null ? round1(r.prev) : null,
      deltaPct: r?.deltaPct ?? null,
      target: r?.target ?? null,
      gap: r ? round1(r.gap) : 0,
      met: r?.met ?? (p?.score !== null && (p?.score ?? 0) >= 100),
      scoreNow: p?.score ?? null,
      trendScores,
      trend4v4,
      weeksTracked: scores.length,
      advice: r?.advice ?? p?.advice ?? null,
    })
  }

  return {
    today,
    weekStart: currentWeek,
    overallScore: pulse.score,
    wonWeeks: pulse.wonWeeks,
    compoundPct: round1(pulse.compoundPct),
    closedWeeks: closed.length,
    overallTrend,
    wonStreak,
    firstWeek: pulse.firstWeek,
    daysElapsed: dayDiff(currentWeek, today),
    modules,
  }
}

/** The exact payload sent to a cloud provider — numbers only, no identifiers,
    module names kept because they carry no personal data and improve prose. */
export function digestForTransport(d: Digest): Record<string, unknown> {
  return {
    weekStart: d.weekStart,
    overall: d.overallScore,
    wonWeeks: d.wonWeeks,
    wonStreak: d.wonStreak,
    compoundPct: d.compoundPct,
    closedWeeks: d.closedWeeks,
    overallTrend: d.overallTrend,
    modules: d.modules.map((m) => ({
      name: m.name,
      label: m.label,
      unit: m.unit,
      mode: m.mode,
      cur: m.cur,
      prev: m.prev,
      deltaPct: m.deltaPct,
      target: m.target,
      gap: m.gap,
      met: m.met,
      score: m.scoreNow,
      trend: m.trendScores,
      trend4v4: m.trend4v4,
      weeks: m.weeksTracked,
    })),
  }
}

/** Cheap identity of a digest's meaningful content, to skip regenerating when
    nothing changed since the last run within the same week. */
export function digestFingerprint(d: Digest): string {
  const parts = [
    d.weekStart,
    d.overallScore ?? 'n',
    d.modules.map((m) => `${m.id}:${m.scoreNow ?? 'n'}:${m.cur}:${m.trend4v4 ?? 'n'}`).join('|'),
  ]
  return parts.join('~')
}

/**
 * The gate: "is anything meaningful happening?" Turns the numeric Digest into a
 * ranked set of Signals. Empty result → no LLM call, no card. This is what
 * keeps AI usage low (many weeks produce nothing) and what the local provider
 * reads instead of an LLM.
 *
 * Thresholds are deliberately conservative — better to stay quiet than to
 * narrate noise. Everything is measured against a module's OWN recent history,
 * never an absolute.
 */
import type { Digest, DigestModule, Signal } from './types'

/* A change only counts once there's enough history to call it a change. */
const MIN_WEEKS_TREND = 3
const REGRESSION_PTS = 8 // score points, 4v4
const REGRESSION_PCT = 25 // native %, this week vs last
const IMPROVEMENT_PTS = 8
const IMPROVEMENT_PCT = 25
const STREAK_MIN = 3

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/** Was this module climbing before the latest reading? (makes a dip notable) */
function wasRising(m: DigestModule): boolean {
  const t = m.trendScores
  if (t.length < 3) return false
  return t[t.length - 2] >= t[t.length - 3] && t[t.length - 3] > 0
}

export function detectSignals(d: Digest): Signal[] {
  const out: Signal[] = []
  if (d.firstWeek) return out // nothing to compare against yet

  /* This-week-so-far vs last-full-week is only a fair comparison once the week
     is essentially done; before then it always looks "down". So native deltas
     drive trend claims only at week's end — mid-week, trends come purely from
     the frozen ledger (trend4v4), which compares complete weeks. */
  const weekComplete = d.daysElapsed >= 6

  for (const m of d.modules) {
    /* --- regression: falling vs its own recent self --- */
    const dropPts = m.trend4v4 !== null && m.trend4v4 <= -REGRESSION_PTS
    const dropPct =
      weekComplete && m.deltaPct !== null && m.deltaPct <= -REGRESSION_PCT && m.weeksTracked >= 2
    if (dropPts || dropPct) {
      const mag = Math.max(
        m.trend4v4 !== null ? -m.trend4v4 / 40 : 0,
        m.deltaPct !== null ? -m.deltaPct / 100 : 0,
      )
      out.push({
        kind: 'regression',
        moduleId: m.id,
        severity: clamp01(0.5 + mag) + (wasRising(m) ? 0.1 : 0),
        data: { deltaPct: m.deltaPct, trend4v4: m.trend4v4, wasRising: wasRising(m) },
      })
    }

    /* --- improvement: climbing vs its own recent self --- */
    const risePts = m.trend4v4 !== null && m.trend4v4 >= IMPROVEMENT_PTS
    const risePct = weekComplete && m.deltaPct !== null && m.deltaPct >= IMPROVEMENT_PCT
    let consecutiveUp = 0
    for (let i = m.trendScores.length - 1; i > 0; i--) {
      if (m.trendScores[i] > m.trendScores[i - 1]) consecutiveUp++
      else break
    }
    /* a real run must actually gain ground, not just hold at a ceiling */
    const runMagnitude =
      consecutiveUp > 0
        ? m.trendScores[m.trendScores.length - 1] - m.trendScores[m.trendScores.length - 1 - consecutiveUp]
        : 0
    const realRun = consecutiveUp >= 3 && runMagnitude >= 5
    if (risePts || risePct || realRun) {
      const mag = Math.max(
        m.trend4v4 !== null ? m.trend4v4 / 40 : 0,
        m.deltaPct !== null ? m.deltaPct / 100 : 0,
        realRun ? consecutiveUp / 6 : 0,
      )
      out.push({
        kind: 'improvement',
        moduleId: m.id,
        severity: clamp01(0.45 + mag),
        data: { deltaPct: m.deltaPct, trend4v4: m.trend4v4, consecutiveUp },
      })
    }

    /* --- opportunity: the actionable gap to this week's pace --- */
    if (!m.met && m.advice && m.scoreNow !== null && m.scoreNow < 100 && m.weeksTracked >= MIN_WEEKS_TREND) {
      const shortfall = (100 - m.scoreNow) / 100
      out.push({
        kind: 'opportunity',
        moduleId: m.id,
        severity: clamp01(0.4 + shortfall * 0.5),
        data: { scoreNow: m.scoreNow, gap: m.gap, unit: m.unit, advice: m.advice, label: m.label },
      })
    }
  }

  /* --- won-week streak / compounding --- */
  if (d.wonStreak >= STREAK_MIN) {
    out.push({
      kind: 'streak',
      moduleId: null,
      severity: clamp01(0.4 + d.wonStreak / 12),
      data: { wonStreak: d.wonStreak, compoundPct: d.compoundPct, wonWeeks: d.wonWeeks },
    })
  }

  /* --- divergence: two modules moving opposite ways over the same weeks.
     Reported as co-occurrence only; the provider must not claim causation. --- */
  const rising = d.modules.filter((m) => m.trend4v4 !== null && m.trend4v4 >= IMPROVEMENT_PTS)
  const falling = d.modules.filter((m) => m.trend4v4 !== null && m.trend4v4 <= -REGRESSION_PTS)
  if (rising.length && falling.length) {
    const up = rising.sort((a, b) => (b.trend4v4 as number) - (a.trend4v4 as number))[0]
    const down = falling.sort((a, b) => (a.trend4v4 as number) - (b.trend4v4 as number))[0]
    if (up.id !== down.id) {
      out.push({
        kind: 'divergence',
        moduleId: down.id,
        severity: 0.55,
        data: {
          upId: up.id, upName: up.name, upDelta: up.trend4v4,
          downId: down.id, downName: down.name, downDelta: down.trend4v4,
        },
      })
    }
  }

  return out.sort((a, b) => b.severity - a.severity)
}

/** The gate proper: is there anything worth an insight this run? */
export function hasMeaningfulSignal(signals: Signal[]): boolean {
  return signals.some((s) => s.severity >= 0.5)
}

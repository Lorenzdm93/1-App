/**
 * The default provider. Turns the gate's Signals into 1–3 structured insights
 * with real numbers and specific actions — no network, no key, no cost, nothing
 * leaves the device. It already hits the north-star for the common cases; the
 * LLM providers exist to add nuance and language, not to do anything this can't.
 */
import type { Confidence, Digest, DigestModule, Insight, InsightProvider, Signal } from './types'

function confFromWeeks(weeks: number): Confidence {
  if (weeks >= 6) return 'high'
  if (weeks >= 3) return 'medium'
  return 'low'
}

function modOf(d: Digest, id: string | null): DigestModule | undefined {
  return id ? d.modules.find((m) => m.id === id) : undefined
}

function pct(n: number | null): string {
  return n === null ? '' : `${Math.abs(Math.round(n))}%`
}

function render(sig: Signal, d: Digest, lead: boolean): Insight | null {
  const m = modOf(d, sig.moduleId)
  const idBase = `${d.weekStart}:${sig.kind}:${sig.moduleId ?? 'overall'}`

  switch (sig.kind) {
    case 'opportunity': {
      if (!m) return null
      return {
        id: idBase,
        type: 'opportunity',
        title: lead ? 'Your biggest opportunity this week' : `Room in ${m.name}`,
        observation: `${m.label} is at ${m.scoreNow}% of your own recent pace this week${
          m.gap > 0 ? `, about ${m.gap} ${m.unit} short.` : '.'
        }`,
        context:
          m.trend4v4 !== null && m.trend4v4 > 0
            ? `It's been climbing lately, so this is a dip within an upward run, not a collapse.`
            : undefined,
        recommendation: m.advice ?? `One focused ${m.label.toLowerCase()} session this week closes most of the gap.`,
        confidence: confFromWeeks(m.weeksTracked),
        moduleId: m.id,
      }
    }
    case 'regression': {
      if (!m) return null
      const weekComplete = d.daysElapsed >= 6
      const by =
        weekComplete && m.deltaPct !== null && m.deltaPct <= -25
          ? `down ${pct(m.deltaPct)} from last week`
          : `easing off its recent average`
      return {
        id: idBase,
        type: 'regression',
        title: `${m.name} is slipping`,
        observation: `${m.label} is ${by}.`,
        context: (sig.data.wasRising as boolean)
          ? `It had been rising for weeks, which is exactly why the turn is worth catching now.`
          : undefined,
        recommendation:
          m.advice ?? `A single ${m.label.toLowerCase()} session this week is usually enough to reverse it.`,
        confidence: confFromWeeks(m.weeksTracked),
        moduleId: m.id,
      }
    }
    case 'improvement': {
      if (!m) return null
      const streak = sig.data.consecutiveUp as number
      const weekDone = d.daysElapsed >= 6
      return {
        id: idBase,
        type: 'improvement',
        title: `${m.name} is on a run`,
        observation:
          streak >= 3
            ? `${m.label} has risen ${streak} weeks straight.`
            : weekDone && m.deltaPct !== null && m.deltaPct > 0
              ? `${m.label} is up ${pct(m.deltaPct)} from last week.`
              : `${m.label} has been climbing over the last few weeks.`,
        recommendation: `Keep it going — even a short session holds the run.`,
        confidence: confFromWeeks(m.weeksTracked),
        moduleId: m.id,
      }
    }
    case 'streak': {
      const n = sig.data.wonStreak as number
      const comp = sig.data.compoundPct as number
      return {
        id: idBase,
        type: 'trend',
        title: `${n} weeks won in a row`,
        observation: `You've beaten your own pace ${n} weeks running — compounding is now +${comp.toFixed(1)}%.`,
        recommendation: `Keep the streak alive; no need to force a bigger week.`,
        confidence: n >= 4 ? 'high' : 'medium',
        moduleId: null,
      }
    }
    case 'divergence': {
      const upName = sig.data.upName as string
      const downName = sig.data.downName as string
      return {
        id: idBase,
        type: 'correlation',
        title: 'Two areas are pulling apart',
        observation: `${upName} has climbed while ${downName} has fallen over the same weeks.`,
        context: `They often move together — worth noticing, though one isn't necessarily causing the other.`,
        recommendation: `A small ${downName} session this week rebalances the two.`,
        confidence: 'medium',
        moduleId: sig.moduleId,
      }
    }
    default:
      return null
  }
}

export const localProvider: InsightProvider = {
  id: 'local',
  label: 'On-device (no AI)',
  async generate(digest, signals) {
    const out: Insight[] = []
    const usedModules = new Set<string>()
    let streakUsed = false

    for (const sig of signals) {
      if (out.length >= 3) break
      /* one insight per module; a single streak line at most */
      if (sig.moduleId && usedModules.has(sig.moduleId)) continue
      if (sig.kind === 'streak') {
        if (streakUsed) continue
      }
      const insight = render(sig, digest, out.length === 0)
      if (!insight) continue
      out.push(insight)
      if (sig.moduleId) usedModules.add(sig.moduleId)
      if (sig.kind === 'streak') streakUsed = true
    }
    return out
  },
}

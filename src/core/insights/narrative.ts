/**
 * The weekly narrative: the digest, read back as a few honest sentences. Pure,
 * deterministic composition from the numbers the engine already computed — no
 * network, no cost, no module coupling. Same source as the insight cards, so it
 * can never contradict the ring.
 *
 * (An LLM narrative would slot in behind the same call once cloud/own-key is on
 * — prose is exactly where a model adds the most — but the local version stands
 * on its own and ships free and private.)
 */
import type { Digest } from './types'
import { t } from '../i18n'

function pctAbs(n: number | null): string {
  return n === null ? '' : `${Math.abs(Math.round(n))}%`
}

/** 2–4 sentences, or null when there's nothing honest to say yet. */
export function weeklyNarrative(d: Digest): string | null {
  if (d.firstWeek || d.overallScore === null) return null

  const parts: string[] = []
  const complete = d.daysElapsed >= 6
  const won = d.overallScore >= 100

  /* 1 — where the week stands */
  if (won) {
    parts.push(t("You're past your pace this week — it's banked."))
  } else if (complete) {
    parts.push(t('The week landed at {p}% of your own pace.', { p: d.overallScore }))
  } else {
    parts.push(t("Partway through the week, you're at {p}% of your pace.", { p: d.overallScore }))
  }

  /* 2 — the standout movers, judged on complete weeks only */
  const movers = d.modules
    .filter((m) => m.trend4v4 !== null && m.weeksTracked >= 3)
    .sort((a, b) => Math.abs(b.trend4v4 as number) - Math.abs(a.trend4v4 as number))
  const up = movers.find((m) => (m.trend4v4 as number) >= 8)
  const down = movers.find((m) => (m.trend4v4 as number) <= -8)
  if (up && down) {
    parts.push(t('{up} keeps climbing while {down} has drifted the other way — worth noticing, if not necessarily connected.', { up: up.name, down: down.name }))
  } else if (up) {
    parts.push(t('{name} is the bright spot: {label} has been climbing for weeks.', { name: up.name, label: up.label.toLowerCase() }))
  } else if (down) {
    parts.push(t('{name} has been sliding off its recent average.', { name: down.name }))
  }

  /* 3 — the one gap that matters this week */
  const gap = d.modules
    .filter((m) => !m.met && m.advice && m.scoreNow !== null && !(down && down.id === m.id) && !(up && up.id === m.id))
    .sort((a, b) => (a.scoreNow as number) - (b.scoreNow as number))[0]
  if (gap) {
    const behind =
      complete && gap.deltaPct !== null && gap.deltaPct < 0
        ? t('down {p}% from last week', { p: pctAbs(gap.deltaPct) })
        : t('the furthest from pace')
    parts.push(t("If one thing deserves the effort, it's {name} — {behind}.", { name: gap.name, behind }))
  }

  /* 4 — the ledger, compounding */
  if (d.wonStreak >= 2) {
    parts.push(t('{n} weeks won in a row now — compounding is +{c}%.', { n: d.wonStreak, c: d.compoundPct.toFixed(1) }))
  } else if (d.wonWeeks > 0) {
    parts.push(d.wonWeeks === 1 ? t('{n} week banked so far, compounding +{c}%.', { n: d.wonWeeks, c: d.compoundPct.toFixed(1) }) : t('{n} weeks banked so far, compounding +{c}%.', { n: d.wonWeeks, c: d.compoundPct.toFixed(1) }))
  }

  return parts.slice(0, 4).join(' ')
}

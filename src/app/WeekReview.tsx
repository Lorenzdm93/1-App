/**
 * The "week in review" card on Profile — the digest read back as a short prose
 * paragraph. Gated by the same AI-insights toggle; silent on a first/empty week.
 */
import { useMemo } from 'react'
import { useStore } from '../core/hooks'
import { eventsStore } from '../core/events'
import { oneStore } from '../core/one'
import { settingsStore } from '../core/settings'
import { buildDigest } from '../core/insights/digest'
import { weeklyNarrative } from '../core/insights/narrative'
import { insightsConfigStore } from '../core/insights/config'

export default function WeekReview() {
  const cfg = useStore(insightsConfigStore)
  const events = useStore(eventsStore)
  const one = useStore(oneStore)
  useStore(settingsStore)

  const text = useMemo(
    () => (cfg.enabled ? weeklyNarrative(buildDigest()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg.enabled, events.length, one.rate, one.goals],
  )

  if (!text) return null
  return (
    <div className="card wk-review">
      <div className="section-label" style={{ marginTop: 0 }}>Your week, read back</div>
      <p className="wk-review-body">{text}</p>
    </div>
  )
}

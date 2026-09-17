/**
 * The insights surface on Today. Reads the cached insights (generated on a
 * cadence by the engine), renders each from its fixed struct, and stays silent
 * when there's nothing meaningful — a quiet week shows nothing at all, which is
 * the point. Tapping an insight that names a module jumps to it.
 */
import { useEffect } from 'react'
import { useStore } from '../core/hooks'
import { eventsStore } from '../core/events'
import { navigate } from '../core/router'
import { moduleById } from '../core/registry'
import {
  insightsCacheStore,
  insightsStatusStore,
  ensureInsights,
  regenerateInsights,
} from '../core/insights/engine'
import { insightsConfigStore } from '../core/insights/config'
import type { Insight, InsightType } from '../core/insights/types'
import { Chevron } from './ui'

const TYPE_LABEL: Record<InsightType, string> = {
  opportunity: 'Opportunity',
  regression: 'Watch',
  improvement: 'On a run',
  trend: 'Trend',
  correlation: 'Pattern',
  goal: 'Goal',
}

function InsightItem({ insight }: { insight: Insight }) {
  const mod = insight.moduleId ? moduleById(insight.moduleId) : null
  const accent = mod?.accentVar ?? 'var(--accent)'
  const go = mod ? () => navigate('/m/' + mod.id) : undefined
  return (
    <div
      className={'insight' + (go ? ' insight-tap' : '')}
      style={{ ['--wc' as string]: accent }}
      onClick={go}
      role={go ? 'button' : undefined}
      tabIndex={go ? 0 : undefined}
      onKeyDown={go ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } } : undefined}
    >
      <div className="insight-top">
        <span className="insight-type">{TYPE_LABEL[insight.type]}</span>
        <span className={'insight-conf conf-' + insight.confidence}>{insight.confidence}</span>
      </div>
      <div className="insight-title">{insight.title}</div>
      <p className="insight-obs">{insight.observation}</p>
      {insight.context && <p className="insight-ctx">{insight.context}</p>}
      <div className="insight-rec">
        <span className="rec-dot" aria-hidden="true" />
        <span>{insight.recommendation}</span>
        {go && <Chevron />}
      </div>
    </div>
  )
}

export default function InsightsSection() {
  const cfg = useStore(insightsConfigStore)
  const cache = useStore(insightsCacheStore)
  const status = useStore(insightsStatusStore)
  const events = useStore(eventsStore)

  useEffect(() => {
    if (cfg.enabled) void ensureInsights()
    // re-checks on data change; the engine no-ops when nothing needs regenerating
  }, [cfg.enabled, cfg.providerId, events.length])

  if (!cfg.enabled) return null
  const insights = cache.insights
  const showSkeleton = status.generating && insights.length === 0
  if (insights.length === 0 && !showSkeleton) return null

  return (
    <section className="insights" aria-label="Insights">
      <div className="insights-head">
        <span className="section-label">Worth your attention</span>
        <button
          className="insights-refresh"
          aria-label="Refresh insights"
          disabled={status.generating}
          onClick={() => void regenerateInsights()}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {showSkeleton ? (
        <div className="insight insight-skel" aria-hidden="true">
          <div className="skel-line w40" />
          <div className="skel-line w80" />
          <div className="skel-line w60" />
        </div>
      ) : (
        insights.map((i) => <InsightItem key={i.id} insight={i} />)
      )}
    </section>
  )
}

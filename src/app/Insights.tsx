/**
 * "This week" — the single, compact section that replaces the old Next Moves +
 * insight cards. The unit is the MODULE, not the card: for each module with
 * something to say, one row that merges what's happening (trend / regression /
 * streak — the interpretive layer) with what to do (the concrete gap-closing
 * action, with real numbers). Observations and their actions were duplicating
 * each other; here they become one line.
 *
 * Actions always show (that's core, ungated). Observations layer in only when
 * AI insights are enabled. A calm week with nothing owed shows nothing.
 */
import { useEffect } from 'react'
import type { CSSProperties, ComponentType } from 'react'
import { useStore } from '../core/hooks'
import { eventsStore } from '../core/events'
import { navigate } from '../core/router'
import { moduleById } from '../core/registry'
import { nextMoves } from '../core/score'
import type { computePulse } from '../core/score'
import { cadenceStore, recentMoodAvg } from '../modules/cadence/model'
import {
  insightsCacheStore,
  insightsStatusStore,
  ensureInsights,
  regenerateInsights,
} from '../core/insights/engine'
import { insightsConfigStore } from '../core/insights/config'
import type { InsightType } from '../core/insights/types'
import { Chevron } from './ui'
import { t } from '../core/i18n'

type Pulse = ReturnType<typeof computePulse>

interface Row {
  key: string
  moduleId: string | null
  accent: string
  kind: InsightType | 'action'
  headline: string
  detail?: string
  priority: number
  severity: number
}

const SEV: Record<string, number> = { high: 0.9, medium: 0.6, low: 0.4 }

function Arrow({ kind }: { kind: Row['kind'] }) {
  if (kind === 'regression') return <span className="tw-arrow dn" aria-hidden="true">↓</span>
  if (kind === 'improvement' || kind === 'trend') return <span className="tw-arrow up" aria-hidden="true">↑</span>
  return null
}

function Glyph({ row }: { row: Row }) {
  const style = { ['--wc' as string]: row.accent } as CSSProperties
  if (row.moduleId) {
    const Icon = moduleById(row.moduleId)?.Icon as ComponentType<{ size?: number }> | undefined
    return <span className="tw-ic" style={style}>{Icon ? <Icon size={13} /> : null}</span>
  }
  return (
    <span className="tw-ic" style={style}>
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3 9.5l6-.8z" fill="currentColor" />
      </svg>
    </span>
  )
}

export default function ThisWeek({ pulse }: { pulse: Pulse }) {
  const cfg = useStore(insightsConfigStore)
  const cache = useStore(insightsCacheStore)
  const status = useStore(insightsStatusStore)
  const events = useStore(eventsStore)

  useEffect(() => {
    if (cfg.enabled) void ensureInsights()
  }, [cfg.enabled, cfg.providerId, events.length])

  const moves = nextMoves(pulse)
  const won = pulse.score !== null && pulse.score >= 100

  /* one row per module: observation headline + concrete action detail */
  const byMod = new Map<string, Row>()
  const extra: Row[] = []
  const insights = cfg.enabled ? cache.insights : []
  for (const ins of insights) {
    const mod = ins.moduleId ? moduleById(ins.moduleId) : null
    const accent = mod?.accentVar ?? 'var(--accent)'
    const priority =
      ins.type === 'regression' ? 0 : ins.type === 'opportunity' ? 1 : ins.type === 'improvement' ? 2 : 3
    const row: Row = {
      key: ins.id,
      moduleId: ins.moduleId ?? null,
      accent,
      kind: ins.type,
      headline: ins.title,
      detail: ins.recommendation,
      priority,
      severity: SEV[ins.confidence] ?? 0.5,
    }
    if (ins.moduleId) byMod.set(ins.moduleId, row)
    else extra.push(row)
  }
  for (const mv of moves) {
    const ex = byMod.get(mv.id)
    if (ex) {
      ex.detail = mv.text // the concrete number beats a generic line
      ex.priority = Math.min(ex.priority, 1) // a real gap is worth acting on
    } else {
      byMod.set(mv.id, {
        key: 'act:' + mv.id,
        moduleId: mv.id,
        accent: mv.accentVar,
        kind: 'action',
        headline: mv.text,
        priority: 1,
        severity: 0.5,
      })
    }
  }
  const rows = [...byMod.values(), ...extra]
    .sort((a, b) => a.priority - b.priority || b.severity - a.severity)
    .slice(0, 4)

  /* footnotes relocated from the hero card */
  const notes: string[] = []
  const mood = recentMoodAvg(cadenceStore.get())
  const gh = pulse.modules.find((m) => m.id === 'ghisa')
  if (mood !== null && mood <= 2.5 && gh && gh.score !== null && gh.score < 70) {
    notes.push(
      'Mood has been low lately and training dipped with it — the two usually travel together. A lighter session still counts.',
    )
  }
  const held = pulse.modules.filter((m) => m.plateauNote)
  if (held.length === 1) notes.push(held[0].plateauNote as string)
  else if (held.length > 1)
    notes.push(
      `Holding your ceilings — ${held.map((m) => m.scorer.label).join(', ')}. Raise any in the engine if there's room; holding is winning.`,
    )

  const showSkeleton = cfg.enabled && status.generating && cache.insights.length === 0 && rows.length === 0
  const wonEmpty = won && moves.length === 0 && rows.length === 0 && notes.length === 0

  if (rows.length === 0 && notes.length === 0 && !showSkeleton && !wonEmpty) return null

  return (
    <section className="thisweek" aria-label="This week">
      <div className="tw-top">
        <span className="section-label">{t('This week')}</span>
        {cfg.enabled && (
          <button
            className="tw-refresh"
            aria-label={t('Refresh')}
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
        )}
      </div>

      {showSkeleton && (
        <div className="tw-row tw-skel" aria-hidden="true">
          <span className="tw-ic" />
          <div className="tw-body">
            <div className="skel-line w60" />
            <div className="skel-line w40" />
          </div>
        </div>
      )}

      {rows.map((r) => {
        const go = r.moduleId ? () => navigate('/m/' + r.moduleId) : undefined
        return (
          <div
            key={r.key}
            className={'tw-row' + (go ? ' tw-tap' : '')}
            style={{ ['--wc' as string]: r.accent } as CSSProperties}
            onClick={go}
            role={go ? 'button' : undefined}
            tabIndex={go ? 0 : undefined}
            onKeyDown={go ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } } : undefined}
          >
            <Glyph row={r} />
            <div className="tw-body">
              <span className="tw-line"><Arrow kind={r.kind} />{r.headline}</span>
              {r.detail && <span className="tw-sub">{r.detail}</span>}
            </div>
            {go && <Chevron />}
          </div>
        )
      })}

      {wonEmpty && <div className="tw-note">Everything above target this week. Rest is also training.</div>}
      {notes.map((n, i) => <div key={'n' + i} className="tw-note">{n}</div>)}
    </section>
  )
}

import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../core/hooks'
import { eventsStore, currentStreak } from '../core/events'
import { settingsStore } from '../core/settings'
import { enabledModules } from '../core/registry'
import { navigate } from '../core/router'
import { todayKey, lastNDayKeys, dayKey } from '../core/dates'
import { oneStore } from '../core/one'
import { computePulse, nextMoves } from '../core/score'
import { Chevron, Empty } from '../app/ui'

function useWeekPulse() {
  const events = useStore(eventsStore)
  const one = useStore(oneStore)
  useStore(settingsStore)
  const today = todayKey()
  return useMemo(() => computePulse(today), [events, today, one.rate, one.goals])
}

function WeekPulseCard({ pulse }: { pulse: ReturnType<typeof computePulse> }) {
  const events = useStore(eventsStore)
  const today = todayKey()
  const moves = nextMoves(pulse)
  const streak = currentStreak(events, today)
  const activeDays = new Set(events.map((e) => dayKey(e.ts)))
  const week = lastNDayKeys(7)
  const rate = oneStore.get().rate

  if (pulse.score === null) {
    return (
      <button className="card hero wp wp-tap" onClick={() => navigate('/one')}>
        <div className="wp-empty-title">Your 1% starts with one log.</div>
        <p className="wp-empty-sub">
          Finish anything — a set, a session, a habit tick — and this becomes your weekly score:
          beat your own recent pace by {rate * 100}% and the week is won. Tap to see how the engine
          works.
        </p>
      </button>
    )
  }

  const won = pulse.score >= 100
  return (
    <>
      <button className={'card hero wp wp-tap' + (won ? ' won' : '')} onClick={() => navigate('/one')}>
        <div className="wp-top">
          <div className={'wp-score num' + (won ? ' won' : '')}>
            {pulse.score}
            <span>%</span>
          </div>
          <div className="wp-copy">
            <b>This week</b>
            <span>
              {won
                ? `${rate * 100}% better than your pace — banked. Anything more is compound interest.`
                : `of the way to ${rate * 100}% better than your 4-week pace.`}
            </span>
          </div>
        </div>
        <div className="wp-bar">
          <i style={{ width: `${Math.min(100, (pulse.score / 100) * 100)}%` }} />
          <em className="wp-mark" />
        </div>
        <div className="wp-strip num">
          <span>{streak}d streak</span>
          <span>·</span>
          <span>{pulse.wonWeeks} week{pulse.wonWeeks === 1 ? '' : 's'} won</span>
          <span>·</span>
          <span className="lit">+{pulse.compoundPct.toFixed(1)}% compounded</span>
        </div>
        {pulse.spark.length >= 2 && (
          <div className="wp-spark" aria-label="Weekly scores">
            {pulse.spark.map((s, i) => (
              <i
                key={i}
                className={s.value >= 100 ? 'won' : ''}
                style={{ height: `${Math.max(12, Math.min(100, (s.value / 120) * 100))}%` }}
              />
            ))}
          </div>
        )}
        <div className="day-dots" aria-label="Last seven days">
          {week.map((day) => (
            <span
              key={day}
              className={'day-dot' + (activeDays.has(day) ? ' on' : '') + (day === today ? ' today' : '')}
            />
          ))}
        </div>
        <span className="wp-open">The full engine ›</span>
      </button>

      {(moves.length > 0 || pulse.modules.some((m) => m.plateauNote)) && (
        <div className="card">
          <div className="card-head">
            <span className="label">{won ? 'Keep or coast' : 'Next moves'}</span>
          </div>
          {moves.map((mv) => (
            <button
              key={mv.id}
              className="wp-move"
              style={{ ['--wc' as string]: mv.accentVar } as CSSProperties}
              onClick={() => navigate('/m/' + mv.id)}
            >
              <span className="wp-move-pill">{mv.name}</span>
              <span>{mv.text}</span>
              <Chevron />
            </button>
          ))}
          {pulse.modules
            .filter((m) => m.plateauNote)
            .map((m) => (
              <div key={m.id} className="wp-note">
                {m.plateauNote}
              </div>
            ))}
          {won && moves.length === 0 && (
            <div className="wp-note">Everything above target. Rest is also training.</div>
          )}
        </div>
      )}
    </>
  )
}

export default function Today() {
  const events = useStore(eventsStore)
  const settings = useStore(settingsStore)
  const modules = enabledModules(settings.enabled)
  const pulse = useWeekPulse()
  const pulseById = new Map(pulse.modules.map((m) => [m.id, m]))

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <div className="screen-head">
        <div className="eyebrow">{dateLabel}</div>
        <h1 className="screen-title">Today</h1>
      </div>

      <WeekPulseCard pulse={pulse} />

      {modules.length === 0 && (
        <Empty title="No modules enabled" sub="Turn on the tools you want in the Modules tab." />
      )}

      {modules.map((m) => (
        <div className="card" key={m.id}>
          <button className="card-head" onClick={() => navigate('/m/' + m.id)}>
            <span className="mark">
              <m.Icon />
            </span>
            <span className="label" style={{ color: m.accentVar }}>
              {m.name}
            </span>
            {(() => {
              const p = pulseById.get(m.id)
              return p && p.score !== null ? (
                <span
                  className={'mw-pct num' + (p.score >= 100 ? ' won' : '')}
                  style={{ ['--wc' as string]: m.accentVar } as CSSProperties}
                >
                  {p.score}%
                </span>
              ) : null
            })()}
            <Chevron />
          </button>
          {(() => {
            const p = pulseById.get(m.id)
            return p && p.score !== null ? (
              <div
                className="mw-bar"
                style={{ ['--wc' as string]: m.accentVar } as CSSProperties}
                aria-label={`${m.name} week progress`}
              >
                <i style={{ width: `${Math.min(100, p.score)}%` }} />
              </div>
            ) : null
          })()}
          <m.Widget />
          {m.QuickActions && (
            <div className="action-row">
              <m.QuickActions />
            </div>
          )}
        </div>
      ))}
    </>
  )
}

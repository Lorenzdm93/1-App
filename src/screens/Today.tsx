import { useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as RPointerEvent } from 'react'
import { useStore } from '../core/hooks'
import { eventsStore, currentStreak } from '../core/events'
import { settingsStore, setModuleOrder } from '../core/settings'
import { enabledModules, moduleById } from '../core/registry'
import { navigate } from '../core/router'
import { todayKey, lastNDayKeys, dayKey } from '../core/dates'
import { oneStore } from '../core/one'
import { computePulse, nextMoves } from '../core/score'
import { Chevron, Empty } from '../app/ui'
import Ring from '../app/Ring'
import ErrorBoundary from '../app/ErrorBoundary'
import { cadenceStore, recentMoodAvg } from '../modules/cadence/model'

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
        <div className="wp-ring-wrap">
          <Ring value={Math.min(120, pulse.score)} accent={won ? 'var(--good)' : 'var(--accent)'} size={158} stroke={13}>
            <span className={'wp-ring-v num' + (won ? ' won' : '')}>{pulse.score}<i>%</i></span>
            <span className="wp-ring-k">this week</span>
          </Ring>
        </div>
        <p className="wp-coach">
          <b>Coaching</b>
          {won
            ? ` You're ${rate * 100}% past your own pace — the week is banked. Anything more is compound interest.`
            : ` ${100 - pulse.score}% left to beat your 4-week pace by ${rate * 100}%. The next moves below close it.`}
        </p>
        <div className="wp-strip num">
          <span>{streak}d streak</span>
          <span>·</span>
          <span>{pulse.wonWeeks} week{pulse.wonWeeks === 1 ? '' : 's'} won</span>
          <span>·</span>
          <span className="lit">+{pulse.compoundPct.toFixed(1)}%</span>
        </div>
        <div className="day-dots" aria-label="Last seven days">
          {week.map((day) => (
            <span
              key={day}
              className={'day-dot' + (activeDays.has(day) ? ' on' : '') + (day === today ? ' today' : '')}
            />
          ))}
        </div>
      </button>

      <div className="ring-row" aria-label="Modules this week">
        {pulse.modules.map((m) => (
          <button key={m.id} className="ring-item" onClick={() => navigate('/m/' + m.id)}>
            <Ring value={m.score === null ? null : Math.min(120, m.score)} accent={m.accentVar} size={68} stroke={7}>
              <span className="ring-item-v num">{m.score === null ? '—' : m.score}</span>
            </Ring>
            <span className="ring-item-k">{m.name}</span>
          </button>
        ))}
      </div>

      {(moves.length > 0 || pulse.modules.some((m) => m.plateauNote)) && (
        <div className="wp-moves">
          <div className="wp-moves-label">{won ? 'Keep or coast' : 'Next moves'}</div>
          {moves.map((mv) => (
            <button
              key={mv.id}
              className="wp-move"
              style={{ ['--wc' as string]: mv.accentVar } as CSSProperties}
              onClick={() => navigate('/m/' + mv.id)}
            >
              <span className="wp-ic">
                {(() => {
                  const M = moduleById(mv.id)!.Icon
                  return <M size={13} />
                })()}
              </span>
              <span>{mv.text}</span>
              <Chevron />
            </button>
          ))}
          {(() => {
            const mood = recentMoodAvg(cadenceStore.get())
            const gh = pulse.modules.find((m) => m.id === 'ghisa')
            if (mood !== null && mood <= 2.5 && gh && gh.score !== null && gh.score < 70) {
              return (
                <div className="wp-note">
                  Mood has been low lately and training volume dipped with it — the two usually
                  travel together. A lighter session still counts; so does saying so in CADENCE.
                </div>
              )
            }
            return null
          })()}
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

  /* ---- module reorder: grip-drag with a drop indicator, commit on release ---- */
  const [dragState, setDragState] = useState<{ id: string; startY: number; dy: number; target: number } | null>(null)
  const dragRef = useRef<typeof dragState>(null)
  dragRef.current = dragState

  function cardMids(): { id: string; mid: number }[] {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-mid]')).map((el) => {
      const r = el.getBoundingClientRect()
      return { id: el.dataset.mid!, mid: r.top + r.height / 2 }
    })
  }
  function onGripDown(e: RPointerEvent<HTMLSpanElement>, id: string, index: number) {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    setDragState({ id, startY, dy: 0, target: index })
    const move = (ev: globalThis.PointerEvent) => {
      const cur = dragRef.current
      if (!cur) return
      const dy = ev.clientY - cur.startY
      const mids = cardMids()
      let target = mids.length - 1
      for (let i = 0; i < mids.length; i++) {
        if (ev.clientY < mids[i].mid) { target = i; break }
        if (i === mids.length - 1) target = mids.length
      }
      setDragState({ ...cur, dy, target: Math.min(target, mids.length) })
    }
    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', up)
      const cur = dragRef.current
      if (cur) {
        const ids = modules.map((x) => x.id)
        const from = ids.indexOf(cur.id)
        let to = cur.target
        if (from !== -1 && to !== from && to !== from + 1) {
          ids.splice(from, 1)
          if (to > from) to -= 1
          ids.splice(to, 0, cur.id)
          setModuleOrder(ids)
        }
      }
      setDragState(null)
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', up)
  }

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

      {modules.map((m, mi) => (
        <div
          className={'card mod-card' + (dragState && dragState.id === m.id ? ' dragging' : '')}
          key={m.id}
          data-mid={m.id}
          style={dragState && dragState.id === m.id ? { transform: `translateY(${dragState.dy}px)` } : undefined}
        >
          {dragState && dragState.target === mi && dragState.id !== m.id && <div className="drop-line" />}
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
            <span
              className="mod-grip"
              role="button"
              aria-label={`Reorder ${m.name}`}
              onPointerDown={(e) => onGripDown(e, m.id, mi)}
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
                <circle cx="2.5" cy="2.5" r="1.4" /><circle cx="7.5" cy="2.5" r="1.4" />
                <circle cx="2.5" cy="8" r="1.4" /><circle cx="7.5" cy="8" r="1.4" />
                <circle cx="2.5" cy="13.5" r="1.4" /><circle cx="7.5" cy="13.5" r="1.4" />
              </svg>
            </span>
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
          <ErrorBoundary name={m.name} compact>
            <m.Widget />
          </ErrorBoundary>
          {m.QuickActions && (
            <div className="action-row">
              <ErrorBoundary name={m.name} compact>
                <m.QuickActions />
              </ErrorBoundary>
            </div>
          )}
        </div>
      ))}
    </>
  )
}

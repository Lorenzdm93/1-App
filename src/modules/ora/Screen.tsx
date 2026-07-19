import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { toast } from '../../core/toast'
import { todayKey, dayKey, shiftDay, weekStartKey } from '../../core/dates'
import { ConfirmSheet, Sheet, Field, parseNum, StatBox, Toggle } from '../../app/ui'
import { Line } from '../../app/charts'
import {
  oraStore, PROTOCOLS, protocolById, STAGES, stageFor, MILESTONES,
  targetHoursFor, windowFastHours, elapsedH, oraStats,
  beginFast, endFast, setStartTime, deleteFast,
  setProtocol, setCustomH, setWindow, logWeight, addGlass,
  type Fast,
} from './model'

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

function fmtHM(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  return `${hh}h ${String(mm).padStart(2, '0')}`
}

function fmtHMS(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/* ---------- the dial: eating window in warm, fasting arc in the module tone ---------- */

function OraDial({
  targetH,
  elapsed,
  running,
  stageName,
}: {
  targetH: number
  elapsed: number | null
  running: boolean
  stageName: string | null
}) {
  const R = 96
  const C = 2 * Math.PI * R
  const fastFrac = Math.min(1, targetH / 24)
  const progress = elapsed !== null ? Math.min(1, elapsed / targetH) : 0
  return (
    <div className={'or-dial-wrap' + (running ? ' live' : '')}>
      <svg viewBox="0 0 220 220" className="or-dial" aria-hidden="true">
        <circle cx="110" cy="110" r={R} fill="none" stroke="var(--raised)" strokeWidth="9" />
        <circle
          cx="110" cy="110" r={R} fill="none"
          stroke="color-mix(in srgb, var(--m-sana) 55%, var(--raised))" strokeWidth="9"
          strokeDasharray={`${C * (1 - fastFrac)} ${C}`}
          transform={`rotate(${-90 + fastFrac * 360} 110 110)`}
          opacity="0.7"
        />
        <circle
          cx="110" cy="110" r={R} fill="none"
          stroke="color-mix(in srgb, var(--m-ora) 45%, var(--raised))" strokeWidth="9"
          strokeDasharray={`${C * fastFrac} ${C}`}
          transform="rotate(-90 110 110)"
        />
        {running && (
          <>
            <defs>
              <linearGradient id="or-live-g" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--m-ora)" />
                <stop offset="100%" stopColor="color-mix(in srgb, var(--m-ora) 45%, #ffffff)" />
              </linearGradient>
            </defs>
            <circle
              cx="110" cy="110" r={R} fill="none"
              stroke="url(#or-live-g)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${C * fastFrac * progress} ${C}`}
              transform="rotate(-90 110 110)"
              className="or-arc-live"
            />
          </>
        )}
      </svg>
      <div className="or-dial-center">
        {running && elapsed !== null ? (
          <>
            <span className="or-dial-time num">{fmtHMS(elapsed * 3_600_000)}</span>
            <span className="or-dial-sub num">of {targetH}h · {Math.round(progress * 100)}%</span>
            {stageName && <span className="or-dial-stage">{stageName}</span>}
          </>
        ) : (
          <>
            <span className="or-dial-target num">{targetH}</span>
            <span className="or-dial-sub">hour target</span>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- timer tab ---------- */

function TimerTab() {
  const st = useStore(oraStore)
  const now = useNow(st.current !== null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [editStart, setEditStart] = useState(false)
  const [startDraft, setStartDraft] = useState('')
  const [customDraft, setCustomDraft] = useState(String(st.customH))
  const [fb, setFb] = useState(st.window.firstBite)
  const [lb, setLb] = useState(st.window.lastBite)
  const lastStage = useRef<string | null>(null)

  const running = st.current !== null
  const elapsed = st.current ? elapsedH(st.current.startTs, now) : null
  const stage = elapsed !== null ? stageFor(elapsed) : null
  const targetH = st.current ? st.current.targetH : targetHoursFor(st)

  // phase alert (while open) — the toast is the bell
  useEffect(() => {
    if (!st.phaseAlerts || !stage) return
    if (lastStage.current !== null && lastStage.current !== stage.name) {
      toast(`New stage — ${stage.name}`)
    }
    lastStage.current = stage.name
  }, [stage?.name, st.phaseAlerts])

  const next = stage && stage.toH !== null ? STAGES[STAGES.indexOf(stage) + 1] : null
  const untilNext = stage && stage.toH !== null && elapsed !== null ? stage.toH - elapsed : null

  return (
    <>
      <OraDial targetH={targetH} elapsed={elapsed} running={running} stageName={stage?.name ?? null} />

      {running ? (
        <>
          {next && untilNext !== null && (
            <p className="or-next num">
              {next.name} in {fmtHM(untilNext)}
            </p>
          )}
          <button className="btn btn-primary or-cta" onClick={() => setConfirmEnd(true)}>
            End fast
          </button>
          <button
            className="linklike or-startlink"
            onClick={() => {
              const d = new Date(st.current!.startTs)
              setStartDraft(
                `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
              )
              setEditStart(true)
            }}
          >
            Started at the wrong time? Adjust it
          </button>
        </>
      ) : (
        <>
          <button className="btn btn-primary or-cta" onClick={() => beginFast()}>
            ▶&nbsp; Begin fast
          </button>
          <button
            className="linklike or-startlink"
            onClick={() => {
              beginFast()
              const d = new Date()
              setStartDraft(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
              setEditStart(true)
            }}
          >
            Already fasting? Set your start time
          </button>

          <div className="or-sched-head">
            <span className="or-h2">Your schedule</span>
            <span className="or-hint">tap to choose</span>
          </div>
          {PROTOCOLS.filter((p) => p.kind !== 'rhythm').map((p) => (
            <button
              key={p.id}
              className={'card or-proto' + (st.protocolId === p.id ? ' on' : '')}
              onClick={() => setProtocol(p.id)}
            >
              <span className="or-proto-name">{p.kind === 'custom' ? `${st.customH}h` : p.name}</span>
              <span className="or-proto-main">
                <em className="num">
                  {p.kind === 'window'
                    ? 'you choose the times'
                    : 'any length you like'}
                </em>
                <span>{p.desc}</span>
                {p.kind === 'window' && st.protocolId === 'window' && (
                  <span className="or-window-row" onClick={(e) => e.stopPropagation()}>
                    <input className="tinput num" value={fb}
                      onChange={(e) => { setFb(e.target.value); setWindow(e.target.value, lb) }} />
                    <i>→</i>
                    <input className="tinput num" value={lb}
                      onChange={(e) => { setLb(e.target.value); setWindow(fb, e.target.value) }} />
                    <b className="num">
                      {windowFastHours(fb, lb) !== null ? `${windowFastHours(fb, lb)}h fast` : '—'}
                    </b>
                  </span>
                )}
                {p.kind === 'custom' && st.protocolId === 'custom' && (
                  <span className="or-window-row" onClick={(e) => e.stopPropagation()}>
                    <input className="tinput num" inputMode="decimal" value={customDraft}
                      onChange={(e) => {
                        setCustomDraft(e.target.value)
                        const n = parseNum(e.target.value)
                        if (n !== null && n > 0) setCustomH(n)
                      }} />
                    <b className="num">hours</b>
                  </span>
                )}
              </span>
              <span className={'or-radio' + (st.protocolId === p.id ? ' on' : '')} />
            </button>
          ))}

          <div className="or-sched-head">
            <span className="or-h2">Daily rhythms</span>
            <span className="or-hint">intermittent fasting</span>
          </div>
          {PROTOCOLS.filter((p) => p.kind === 'rhythm').map((p) => (
            <button
              key={p.id}
              className={'card or-proto' + (st.protocolId === p.id ? ' on' : '')}
              onClick={() => setProtocol(p.id)}
            >
              <span className="or-proto-name">{p.name}</span>
              <span className="or-proto-main">
                <em className="num">{p.fastH}h fast · {p.eatH}h eating</em>
                <span>{p.desc}</span>
              </span>
              <span className={'or-radio' + (st.protocolId === p.id ? ' on' : '')} />
            </button>
          ))}
        </>
      )}

      <ConfirmSheet
        open={confirmEnd}
        title={elapsed !== null && st.current && elapsed >= st.current.targetH ? 'End the fast?' : 'End early?'}
        body={
          elapsed !== null && st.current && elapsed >= st.current.targetH
            ? `${fmtHM(elapsed)} — target reached. Break gently: water first, then something small and simple.`
            : `${elapsed !== null ? fmtHM(elapsed) : ''} of ${st.current?.targetH}h. Ending early is data, not failure — it still goes in the log, and the log is what improves.`
        }
        actionLabel="End fast"
        onConfirm={() => {
          const f = endFast()
          if (f) toast(f.hit ? `${fmtHM(elapsedH(f.startTs, f.endTs))} — goal reached` : 'Logged. Tomorrow is another window.')
        }}
        onClose={() => setConfirmEnd(false)}
      />

      <Sheet open={editStart} title="When did the fast start?" onClose={() => setEditStart(false)}>
        <Field label="Start time (today or yesterday)">
          <input className="tinput num" value={startDraft} onChange={(e) => setStartDraft(e.target.value)} placeholder="21:30" />
        </Field>
        <p className="rs-foot">
          If that time hasn't happened yet today, ORA assumes you mean yesterday — overnight fasts
          are the normal case.
        </p>
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 12 }}
          onClick={() => {
            const m = startDraft.match(/^(\d{1,2}):(\d{2})$/)
            if (!m) {
              toast('Time as HH:MM, e.g. 21:30')
              return
            }
            const d = new Date()
            d.setHours(Number(m[1]), Number(m[2]), 0, 0)
            let ts = d.getTime()
            if (ts > Date.now()) ts -= 24 * 3_600_000
            setStartTime(ts)
            setEditStart(false)
            toast('Start time set')
          }}
        >
          Set start
        </button>
      </Sheet>
    </>
  )
}

/* ---------- body tab ---------- */

function BodyTab() {
  const st = useStore(oraStore)
  const now = useNow(st.current !== null)
  const elapsed = st.current ? elapsedH(st.current.startTs, now) : null
  const cur = elapsed !== null ? stageFor(elapsed) : null
  return (
    <>
      <div className="card">
        <p className="guide-p" style={{ margin: 0 }}>
          Every fast moves through these stages. {st.current
            ? 'You are inside the highlighted one — the timeline tracks you hour by hour.'
            : 'Start a fast to see where you are in real time — the timeline below tracks your progress hour by hour.'}
        </p>
      </div>
      <div className="or-sched-head">
        <span className="or-h2">Stage by stage</span>
        <span className="or-hint">hours fasting</span>
      </div>
      <div className="or-rail">
        {STAGES.map((s) => {
          const active = cur?.name === s.name
          return (
            <div key={s.name} className={'or-stage' + (active ? ' active' : '')}>
              <span className={'or-stage-dot' + (active ? ' on' : '')} />
              <div className="card or-stage-card" style={{ ['--sc' as string]: s.color } as CSSProperties}>
                <div className="or-stage-head">
                  <b>{s.name}</b>
                  <span className="num">{s.toH === null ? `${s.fromH}–+` : `${s.fromH}–${s.toH}h`}</span>
                </div>
                <p>{s.body}</p>
                <div className={'or-note ' + s.noteKind.toLowerCase()}>
                  <b>{active && s.noteKind !== 'Care' ? 'Now' : s.noteKind}</b>
                  <span>{s.note}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="card guide">
        <p>
          <b>A note on honesty.</b> Stage hours are typical ranges from fasting research, not lab
          readings of your body — sleep, activity and your last meal all shift them. Treat the
          timeline as a map, not a measurement.
        </p>
      </div>
    </>
  )
}

/* ---------- progress tab ---------- */

function ProgressTab() {
  const st = useStore(oraStore)
  const [kg, setKg] = useState('')
  const today = todayKey()
  const stats = oraStats(st.fasts, today)
  const glasses = st.hydration[today] ?? 0
  const unlockedCount = MILESTONES.filter((m) => m.test(st.fasts, stats)).length
  const recent = [...st.fasts].slice(0, 14).reverse()

  // consistency: last 17 weeks × 7 days, sana-heatmap pattern
  const weeks: string[][] = []
  const thisMonday = weekStartKey(today)
  for (let w = 16; w >= 0; w--) {
    const ws = shiftDay(thisMonday, -7 * w)
    weeks.push(Array.from({ length: 7 }, (_, i) => shiftDay(ws, i)))
  }
  const fastDays = new Map<string, boolean>()
  for (const f of st.fasts) {
    const key = dayKey(f.endTs)
    fastDays.set(key, (fastDays.get(key) ?? false) || f.hit)
  }

  return (
    <>
      <div className="ins-grid">
        <StatBox label="current streak" value={`${stats.streak}d`} />
        <StatBox label="best streak" value={`${stats.bestStreak}d`} />
        <StatBox label="fasts logged" value={String(stats.count)} />
        <StatBox label="goal hit rate" value={`${stats.hitRate}%`} />
        <StatBox label="longest fast" value={fmtHM(stats.longestH)} />
        <StatBox label="average fast" value={fmtHM(stats.avgH)} />
      </div>
      <div className="card or-total num">
        <b>{Math.round(stats.totalH)}</b> hours fasted, all time
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ora)' }}>Recent fasts</span>
          <span className="one-best num">last {recent.length}</span>
        </div>
        {recent.length === 0 ? (
          <div className="rs-foot">Complete a few fasts to see your trend.</div>
        ) : (
          <>
            <div className="or-bars">
              {recent.map((f) => {
                const h = elapsedH(f.startTs, f.endTs)
                const pct = Math.min(100, (h / Math.max(24, f.targetH)) * 100)
                const goalPct = Math.min(100, (f.targetH / Math.max(24, f.targetH)) * 100)
                return (
                  <div className="or-bar-col" key={f.id} title={`${h.toFixed(1)}h of ${f.targetH}h`}>
                    <i className={f.hit ? 'hit' : 'early'} style={{ height: `${pct}%` }} />
                    <em style={{ bottom: `${goalPct}%` }} />
                  </div>
                )
              })}
            </div>
            <div className="or-legend">
              <span><i className="hit" /> Goal reached</span>
              <span><i className="early" /> Ended early</span>
              <span><i className="line" /> Goal line</span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ora)' }}>Consistency</span>
          <span className="one-best num">last 17 weeks</span>
        </div>
        <div className="sn-heat" aria-label="Fasting days heatmap">
          {weeks.map((col, i) => (
            <div className="sn-heat-col" key={i}>
              {col.map((d) => {
                const future = d > today
                const has = fastDays.has(d)
                const hit = fastDays.get(d) === true
                const cls = future ? ' future' : has ? (hit ? ' full' : ' part') : ' zero'
                return <span key={d} className={'sn-heat-cell' + cls} />
              })}
            </div>
          ))}
        </div>
        <div className="cd-heat-label num">any fast · brighter = goal reached</div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ora)' }}>Weight</span>
        </div>
        <div className="or-weight-row">
          <input className="tinput num" inputMode="decimal" placeholder="—" value={kg}
            onChange={(e) => setKg(e.target.value)} />
          <span className="or-unit">kg</span>
          <button className="btn btn-primary" style={{ minWidth: 76 }}
            onClick={() => {
              const n = parseNum(kg)
              if (n === null || n <= 0) { toast('Weight in kg, e.g. 78,4'); return }
              logWeight(n)
              setKg('')
              toast('Weight logged')
            }}>
            Log
          </button>
        </div>
        {st.weights.length >= 2 ? (
          <Line values={[...st.weights].reverse().map((w) => w.kg)} accentVar="var(--m-ora)" />
        ) : (
          <p className="rs-foot">Log your weight now and then to see the trend alongside your fasts.</p>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ora)' }}>Hydration today</span>
          <span className="one-best num">aim 8+ glasses</span>
        </div>
        <div className="or-hydro">
          <div className="or-hydro-count num"><b>{glasses}</b> / 8 glasses<span>≈ 250 ml each</span></div>
          <div className="or-hydro-btns">
            <button onClick={() => addGlass(-1)} aria-label="Remove glass">−</button>
            <button onClick={() => addGlass(1)} aria-label="Add glass">+</button>
          </div>
        </div>
        <div className="or-glasses">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className={'or-glass' + (i < glasses ? ' on' : '')} />
          ))}
        </div>
      </div>

      <div className="or-sched-head">
        <span className="or-h2">Milestones</span>
        <span className="or-hint num">{unlockedCount}/{MILESTONES.length}</span>
      </div>
      <div className="or-miles">
        {MILESTONES.map((m) => {
          const on = m.test(st.fasts, stats)
          return (
            <div key={m.id} className={'or-mile' + (on ? ' on' : '')}>
              <b>{m.name}</b>
              <span>{m.desc}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ---------- log tab ---------- */

function LogTab() {
  const st = useStore(oraStore)
  const [del, setDel] = useState<Fast | null>(null)
  return (
    <>
      {st.fasts.length === 0 ? (
        <div className="or-empty">
          <div className="or-empty-title">No fasts yet</div>
          <p>Your completed and slipped fasts will collect here, newest first. Head to the timer to begin.</p>
        </div>
      ) : (
        st.fasts.map((f) => {
          const h = elapsedH(f.startTs, f.endTs)
          const d = new Date(f.endTs)
          return (
            <div className="card or-log" key={f.id}>
              <div className="or-log-main">
                <b className="num">{fmtHM(h)}</b>
                <span className="num">
                  {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} ·
                  aim {f.targetH}h · {protocolById(f.protocolId).name}
                </span>
              </div>
              <span className={'or-badge' + (f.hit ? ' hit' : '')}>{f.hit ? 'goal ✓' : 'early'}</span>
              <button className="sn-trash sm" onClick={() => setDel(f)} aria-label="Delete fast">🗑</button>
            </div>
          )
        })
      )}
      <ConfirmSheet
        open={del !== null}
        title="Delete this fast?"
        body="It disappears from the log, the stats, and the week's score."
        actionLabel="Delete"
        danger
        onConfirm={() => { if (del) deleteFast(del.id) }}
        onClose={() => setDel(null)}
      />
    </>
  )
}

/* ---------- settings extra ---------- */

export function OraSettingsExtra() {
  const st = useStore(oraStore)
  const rhythms = PROTOCOLS.filter((p) => p.kind === 'rhythm')
  return (
    <div className="card">
      <div className="card-head">
        <span className="label" style={{ color: 'var(--m-ora)' }}>Preferences</span>
      </div>
      <div className="kv">
        <span className="k">Default protocol <span className="hint">· pre-selected on the timer</span></span>
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {rhythms.map((p) => (
          <button key={p.id} className={'chip' + (st.protocolId === p.id ? ' on' : '')} onClick={() => setProtocol(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="kv">
        <span className="k">Phase alerts <span className="hint">· a toast when you enter a new stage, while the app is open</span></span>
        <Toggle
          on={st.phaseAlerts}
          label="Phase alerts"
          onChange={() => oraStore.set((s) => ({ ...s, phaseAlerts: !s.phaseAlerts }))}
        />
      </div>
      <p className="rs-foot" style={{ marginTop: 12 }}>
        <b>ORA is not medical advice.</b> Intermittent and extended fasting are not right for
        everyone. Do not fast — and talk to a doctor first — if you are pregnant, breastfeeding,
        under 18, underweight, have a history of disordered eating, or take medication affecting
        blood sugar or blood pressure. Multi-day fasts warrant medical supervision.
      </p>
    </div>
  )
}

/* ---------- screen ---------- */

export default function OraScreen({ tab = 'timer' }: { tab?: string }) {
  if (tab === 'body') return <BodyTab />
  if (tab === 'progress') return <ProgressTab />
  if (tab === 'log') return <LogTab />
  return <TimerTab />
}

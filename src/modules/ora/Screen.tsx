/**
 * ORA — fasting, hour by hour. Prototype-faithful or2 rebuild:
 * the whole surface tints to your current metabolic stage, the ring wears
 * the stages as bezel arcs, and every fast ends with honest numbers.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { todayKey, dayKey, lastNDayKeys } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Toggle, Field } from '../../app/ui'
import {
  oraStore, PROTOCOLS, protocolById, STAGES, stageFor, targetHoursFor, windowFastHours,
  setProtocol, setCustomH, setWindow, beginFast, setStartTime, endFast, deleteFast, editFast,
  logWeight, addGlass, setPhaseAlerts, elapsedH, oraStats, MILESTONES, claimNewMilestones,
  dismissEating, type Fast, type Milestone, type OraState, type Stage,
} from './model'

const H = 3_600_000

function useNow(active: boolean, everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [active, everyMs])
  return now
}

const fmtHM = (h: number): string => {
  const m = Math.round(h * 60)
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}`
}
const fmtClock = (ms: number): { hhmm: string; ss: string } => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    hhmm: `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`,
    ss: String(s % 60).padStart(2, '0'),
  }
}
const timeAt = (ts: number): string => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const dayAt = (ts: number): string => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
const toLocalInput = (ts: number): string => {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fromLocalInput = (v: string): number | null => {
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}
const stageAccent = (st: OraState, now: number): string | null =>
  st.current ? stageFor(elapsedH(st.current.startTs, now)).color : null

/* ---------------- the ring ---------------- */

function OraRing({ targetH, elapsedMs, stage }: { targetH: number; elapsedMs: number | null; stage: Stage | null }) {
  const R = 100
  const CIRC = 2 * Math.PI * R
  const frac = elapsedMs === null ? 0 : Math.min(elapsedMs / (targetH * H), 1)
  const knobA = -Math.PI / 2 + frac * 2 * Math.PI
  /* bezel: the stages that fit inside this fast's target, as tinted arcs */
  const arcs = STAGES.filter((s) => s.fromH < targetH).map((s) => {
    const from = s.fromH / targetH
    const to = Math.min(s.toH ?? targetH, targetH) / targetH
    return { color: s.color, from, to }
  })
  const BR = 118
  const arcPath = (from: number, to: number): string => {
    const a0 = -Math.PI / 2 + from * 2 * Math.PI
    const a1 = -Math.PI / 2 + Math.max(from, to - 0.004) * 2 * Math.PI
    const large = to - from > 0.5 ? 1 : 0
    return `M ${130 + BR * Math.cos(a0)} ${130 + BR * Math.sin(a0)} A ${BR} ${BR} 0 ${large} 1 ${130 + BR * Math.cos(a1)} ${130 + BR * Math.sin(a1)}`
  }
  return (
    <svg viewBox="0 0 260 260" className="or2-ring" aria-hidden="true">
      {arcs.map((a, i) => (
        <path key={i} d={arcPath(a.from, a.to)} fill="none" stroke={a.color} strokeWidth={5} strokeLinecap="round" opacity={0.45} />
      ))}
      <circle cx={130} cy={130} r={R} fill="none" stroke="var(--or-line2)" strokeWidth={7} />
      {elapsedMs !== null && (
        <>
          <circle
            cx={130} cy={130} r={R} fill="none"
            stroke={stage?.color ?? 'var(--or-accent)'} strokeWidth={7} strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)}
            transform="rotate(-90 130 130)"
          />
          <circle cx={130 + R * Math.cos(knobA)} cy={130 + R * Math.sin(knobA)} r={9}
            fill={stage?.color ?? 'var(--or-accent)'} stroke="var(--or-bg)" strokeWidth={3} />
        </>
      )}
    </svg>
  )
}

/* ---------------- sheets ---------------- */

function WindowSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const st = useStore(oraStore)
  const [first, setFirst] = useState(st.window.firstBite)
  const [last, setLast] = useState(st.window.lastBite)
  useEffect(() => {
    if (open) { setFirst(st.window.firstBite); setLast(st.window.lastBite) }
  }, [open])
  const fastH = windowFastHours(first, last)
  return (
    <Sheet open={open} title="Eating window" onClose={onClose}>
      <div className="or2">
        <Field label="First bite">
          <input className="tinput" type="time" value={first} onChange={(e) => setFirst(e.target.value)} />
        </Field>
        <Field label="Last bite">
          <input className="tinput" type="time" value={last} onChange={(e) => setLast(e.target.value)} />
        </Field>
        <div className="or2-winsum">
          {fastH !== null
            ? <>Eat <b>{first}–{last}</b> · ORA fasts you <b>{fmtHM(fastH)}</b> around it, overnight included.</>
            : 'Enter both times to see the fast this implies.'}
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={fastH === null}
          onClick={() => { setWindow(first, last); setProtocol('window'); onClose(); toast('Window saved') }}>
          Save window
        </button>
      </div>
    </Sheet>
  )
}

function CustomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const st = useStore(oraStore)
  const [h, setH] = useState(st.customH)
  useEffect(() => { if (open) setH(st.customH) }, [open])
  return (
    <Sheet open={open} title="Custom target" onClose={onClose}>
      <div className="or2">
        <div className="or2-bignum num">{h}<small>h</small></div>
        <div className="or2-chips">
          {[12, 16, 18, 20, 24, 36, 48].map((v) => (
            <button key={v} className={'chip' + (v === h ? ' on' : '')} onClick={() => setH(v)}>{v}h</button>
          ))}
        </div>
        <div className="or2-stepline">
          <button onClick={() => setH((x) => Math.max(4, x - 1))} aria-label="Less">−</button>
          <span>fine-tune</span>
          <button onClick={() => setH((x) => Math.min(96, x + 1))} aria-label="More">+</button>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}
          onClick={() => { setCustomH(h); setProtocol('custom'); onClose(); toast(`${h}h target set`) }}>
          Set target
        </button>
      </div>
    </Sheet>
  )
}

function StartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const st = useStore(oraStore)
  const [v, setV] = useState(() => toLocalInput(st.current?.startTs ?? Date.now()))
  useEffect(() => { if (open) setV(toLocalInput(oraStore.get().current?.startTs ?? Date.now())) }, [open])
  return (
    <Sheet open={open} title="When did this fast start?" onClose={onClose}>
      <div className="or2">
        <p className="guide-p">Already fasting before you pressed the button? Set the true start — the clock, stages and goal all follow it.</p>
        <Field label="Fast began">
          <input className="tinput" type="datetime-local" value={v} max={toLocalInput(Date.now())} onChange={(e) => setV(e.target.value)} />
        </Field>
        <button className="btn btn-primary" style={{ width: '100%' }}
          onClick={() => {
            const ts = fromLocalInput(v)
            if (ts === null || ts > Date.now()) { toast('Pick a time in the past'); return }
            if (!oraStore.get().current) beginFast(ts)
            else setStartTime(ts)
            onClose()
            toast('Start time set')
          }}>
          Save start time
        </button>
      </div>
    </Sheet>
  )
}

function EndSheet({ open, onClose, onEnded }: { open: boolean; onClose: () => void; onEnded: (f: Fast) => void }) {
  const st = useStore(oraStore)
  const cur = st.current
  const now = useNow(open)
  if (!cur) return null
  const el = now - cur.startTs
  const hours = el / H
  const hit = hours >= cur.targetH
  const d = fmtClock(el)
  return (
    <Sheet open={open} title="End this fast?" onClose={onClose}>
      <div className="or2 or2-endsheet">
        <div className="or2-bignum num">{d.hhmm}<small>:{d.ss}</small></div>
        <p className={'or2-goalline' + (hit ? ' good' : '')}>
          {hit
            ? `Goal reached — ${fmtHM(cur.targetH)} target, done.`
            : `${fmtHM(cur.targetH - hours)} short of your ${fmtHM(cur.targetH)} goal. Early is data, not failure.`}
        </p>
        <button className="btn btn-primary" style={{ width: '100%' }}
          onClick={() => {
            const f = endFast()
            onClose()
            if (f) onEnded(f)
          }}>
          {hit ? 'Log this fast' : 'End early & log'}
        </button>
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>Keep fasting</button>
      </div>
    </Sheet>
  )
}

function CelebrateSheet({ ms, extra, onClose }: { ms: Milestone | null; extra: number; onClose: () => void }) {
  return (
    <Sheet open={ms !== null} title="" onClose={onClose}>
      {ms && (
        <div className="or2 or2-celebrate">
          <div className="badge">★</div>
          <div className="eyebrow">Milestone unlocked{extra > 0 ? ` · +${extra} more` : ''}</div>
          <h3>{ms.name}</h3>
          <p>{ms.desc}</p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Keep it up</button>
        </div>
      )}
    </Sheet>
  )
}

function EditFastSheet({ fast, onClose }: { fast: Fast | null; onClose: () => void }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  useEffect(() => {
    if (fast) { setStart(toLocalInput(fast.startTs)); setEnd(toLocalInput(fast.endTs)) }
  }, [fast?.id])
  return (
    <Sheet open={fast !== null} title="Edit fast" onClose={onClose}>
      {fast && (
        <div className="or2">
          <Field label="Started">
            <input className="tinput" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Ended">
            <input className="tinput" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <button className="btn btn-primary" style={{ width: '100%' }}
            onClick={() => {
              const s = fromLocalInput(start)
              const e = fromLocalInput(end)
              if (s === null || e === null || e <= s) { toast('End must come after start'); return }
              editFast(fast.id, { startTs: s, endTs: e })
              onClose()
              toast('Fast updated')
            }}>
            Save changes
          </button>
          <button className="btn btn-ghost danger" style={{ width: '100%', marginTop: 8 }} onClick={() => setConfirmDel(true)}>
            Delete fast
          </button>
          <ConfirmSheet
            open={confirmDel}
            title="Delete this fast?"
            body="It will be removed from your history and stats. This can't be undone."
            actionLabel="Delete fast"
            danger
            onConfirm={() => { deleteFast(fast.id); setConfirmDel(false); onClose(); toast('Fast deleted') }}
            onClose={() => setConfirmDel(false)}
          />
        </div>
      )}
    </Sheet>
  )
}

/* ---------------- Timer ---------------- */

function TimerTab() {
  const st = useStore(oraStore)
  const now = useNow(st.current !== null || st.eating !== null)
  const [sheet, setSheet] = useState<'window' | 'custom' | 'start' | 'end' | null>(null)
  const [celebrate, setCelebrate] = useState<{ ms: Milestone; extra: number } | null>(null)
  const cur = st.current
  const el = cur ? now - cur.startTs : null
  const stage = cur ? stageFor((el as number) / H) : null
  const targetH = cur ? cur.targetH : targetHoursFor(st)
  const d = el !== null ? fmtClock(el) : null
  const over = cur && (el as number) > cur.targetH * H
  const eatingLeft = st.eating ? st.eating.startTs + st.eating.windowH * H - now : null

  /* phase notifications */
  const lastStage = useRef<string | null>(null)
  useEffect(() => {
    if (!cur || !stage) { lastStage.current = null; return }
    if (lastStage.current !== null && lastStage.current !== stage.name && st.phaseAlerts) {
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`ORA · ${stage.name}`, { body: stage.note, silent: true })
        }
      } catch { /* no notifications */ }
    }
    lastStage.current = stage.name
  }, [stage?.name, cur !== null])

  function onEnded(f: Fast) {
    const fresh = claimNewMilestones()
    if (fresh.length > 0) setCelebrate({ ms: fresh[0], extra: fresh.length - 1 })
    toast(f.hit ? 'Nicely done — goal reached' : 'Fast logged — next one\u2019s fresh')
  }

  const groups: [string, string, typeof PROTOCOLS[number][]][] = [
    ['Your schedule', 'tap to choose', PROTOCOLS.filter((p) => p.kind === 'window' || p.kind === 'custom')],
    ['Daily rhythms', 'intermittent fasting', PROTOCOLS.filter((p) => p.kind === 'rhythm')],
    ['Extended', 'water fasts — read the stage notes', PROTOCOLS.filter((p) => p.kind === 'extended')],
  ]
  const splitLabel = (p: typeof PROTOCOLS[number]): string => {
    if (p.kind === 'window') {
      const fh = windowFastHours(st.window.firstBite, st.window.lastBite)
      return fh !== null ? `eat ${st.window.firstBite}–${st.window.lastBite} · fast ${fmtHM(fh)}` : 'you choose the times'
    }
    if (p.kind === 'custom') return 'any length you like'
    if (p.kind === 'extended') return `${p.fastH}h fast · water only`
    return `${p.fastH}h fast · ${p.eatH}h eating`
  }
  const bigName = (p: typeof PROTOCOLS[number]): string =>
    p.kind === 'custom' ? `${st.customH}h` : p.name

  return (
    <div className="or2" style={stage ? ({ '--or-accent': stage.color } as CSSProperties) : undefined}>
      <div className="or2-timercard card">
        <div className="or2-dialwrap">
          <OraRing targetH={targetH} elapsedMs={el} stage={stage} />
          <div className="or2-center">
            {cur && d ? (
              <>
                <div className="big num">{d.hhmm}<small>:{d.ss}</small></div>
                <div className="phase" style={{ color: stage?.color }}>{stage?.name}</div>
                <div className="meta">
                  {over
                    ? `+${fmtHM((el as number) / H - cur.targetH)} past your ${fmtHM(cur.targetH)} goal`
                    : `${fmtHM(cur.targetH)} target · ends ${timeAt(cur.startTs + cur.targetH * H)}`}
                </div>
              </>
            ) : (
              <>
                <div className="big num">{Math.round(targetH * 10) / 10}</div>
                <div className="meta">hour target</div>
              </>
            )}
          </div>
        </div>
        {cur ? (
          <button className="or2-mainbtn end" onClick={() => setSheet('end')}>■ End fast</button>
        ) : (
          <button className="or2-mainbtn" onClick={() => { beginFast(); toast('Fast started — stay hydrated') }}>▶ Begin fast</button>
        )}
        {!cur && (
          <button className="or2-startlink" onClick={() => setSheet('start')}>
            Already fasting? <u>Set your start time</u>
          </button>
        )}
        {cur && (
          <button className="or2-startlink" onClick={() => setSheet('start')}>
            Started {dayAt(cur.startTs)} · {timeAt(cur.startTs)} — <u>adjust</u>
          </button>
        )}
      </div>

      {!cur && st.eating && eatingLeft !== null && (
        <div className="or2-eating card">
          {eatingLeft > 0 ? (
            <>
              <b>Eating window open</b>
              <span>closes {timeAt(st.eating.startTs + st.eating.windowH * H)} · {fmtHM(eatingLeft / H)} left — your next fast starts when it closes.</span>
            </>
          ) : (
            <>
              <b>Window closed</b>
              <span>Ready when you are — begin the next fast above.</span>
            </>
          )}
          <button className="x" onClick={dismissEating} aria-label="Dismiss">✕</button>
        </div>
      )}

      {groups.map(([title, sub, list]) => (
        <div key={title}>
          <div className="or2-seclabel">{title}<span>{sub}</span></div>
          <div className="or2-protos">
            {list.map((p) => (
              <button
                key={p.id}
                className={'or2-proto' + (st.protocolId === p.id ? ' on' : '')}
                onClick={() => {
                  if (p.kind === 'window') setSheet('window')
                  else if (p.kind === 'custom') setSheet('custom')
                  else { setProtocol(p.id); toast(`${p.name} selected`) }
                }}
              >
                <span className="nm">{bigName(p)}</span>
                <span className="mid">
                  <b className="mono">{splitLabel(p)}</b>
                  <i>{p.desc}</i>
                </span>
                <span className={'radio' + (st.protocolId === p.id ? ' on' : '')} />
              </button>
            ))}
          </div>
        </div>
      ))}

      <WindowSheet open={sheet === 'window'} onClose={() => setSheet(null)} />
      <CustomSheet open={sheet === 'custom'} onClose={() => setSheet(null)} />
      <StartSheet open={sheet === 'start'} onClose={() => setSheet(null)} />
      <EndSheet open={sheet === 'end'} onClose={() => setSheet(null)} onEnded={onEnded} />
      <CelebrateSheet ms={celebrate?.ms ?? null} extra={celebrate?.extra ?? 0} onClose={() => setCelebrate(null)} />
    </div>
  )
}

/* ---------------- Body ---------------- */

function BodyTab() {
  const st = useStore(oraStore)
  const now = useNow(st.current !== null, 30_000)
  const cur = st.current
  const hours = cur ? elapsedH(cur.startTs, now) : null
  const curStage = hours !== null ? stageFor(hours) : null
  return (
    <div className="or2" style={curStage ? ({ '--or-accent': curStage.color } as CSSProperties) : undefined}>
      <div className="or2-eyebrow">The fasting timeline</div>
      <h2 className="or2-h1">What's happening inside</h2>
      <div className="card or2-intro">
        {cur && curStage ? (
          <>Fasting for <b className="num">{fmtHM(hours as number)}</b> — you're in <b style={{ color: curStage.color }}>{curStage.name}</b>. The timeline below tracks your progress hour by hour.</>
        ) : (
          <>Every fast moves through these stages. Start a fast to see where you are in real time — the timeline below tracks your progress hour by hour.</>
        )}
      </div>
      <div className="or2-stagehead">
        <h3>Stage by stage</h3>
        <span>hours fasting</span>
      </div>
      <div className="or2-stages">
        {STAGES.map((s) => {
          const passed = hours !== null && hours >= s.fromH
          const active = curStage === s
          return (
            <div key={s.name} className={'or2-stage card' + (active ? ' on' : '')}>
              <span className={'dot' + (passed ? ' lit' : '')} style={passed ? { borderColor: s.color, background: active ? s.color : undefined } : undefined} />
              <div className="head">
                <b style={{ color: s.color }}>{s.name}</b>
                <span className="hrs mono">{s.toH === null ? `${s.fromH}h+` : `${s.fromH}–${s.toH}h`}</span>
                {active && <span className="nowchip" style={{ background: s.color }}>Now</span>}
              </div>
              <p className="body">{s.body}</p>
              <div className="tip" style={{ borderLeftColor: s.color }}>
                <b>{active ? 'Now' : s.noteKind}.</b> {s.note}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Progress ---------------- */

function ProgressTab() {
  const st = useStore(oraStore)
  const s = oraStats(st.fasts)
  const [kg, setKg] = useState('')
  const today = todayKey()
  const glasses = st.hydration[today] ?? 0

  /* recent fasts chart */
  const recent = [...st.fasts].slice(0, 12).reverse()
  const CAP = 36
  const CH = 96

  /* consistency: 17 weeks */
  const byDay = new Map<string, { fasted: boolean; hit: boolean }>()
  for (const f of st.fasts) {
    const d = dayKey(f.endTs)
    const cur = byDay.get(d) ?? { fasted: false, hit: false }
    byDay.set(d, { fasted: true, hit: cur.hit || f.hit })
  }
  const days = lastNDayKeys(17 * 7)
  const weeks: string[][] = []
  for (let w = 0; w < 17; w++) weeks.push(days.slice(w * 7, w * 7 + 7))

  const unlockedCount = MILESTONES.filter((m) => m.test(st.fasts, s)).length
  const lastW = st.weights[0]
  const prevW = st.weights[1]

  return (
    <div className="or2">
      <div className="or2-eyebrow">Your progress</div>
      <h2 className="or2-h1">Progress</h2>
      <div className="or2-tiles">
        <div className="card t"><b className="num">{s.streak}<small> d</small></b><span>Current streak</span></div>
        <div className="card t"><b className="num">{s.bestStreak}<small> d</small></b><span>Best streak</span></div>
        <div className="card t"><b className="num">{s.count}</b><span>Fasts logged</span></div>
        <div className="card t"><b className="num">{s.hitRate}<small>%</small></b><span>Goal hit rate</span></div>
        <div className="card t"><b className="num">{fmtHM(s.longestH)}</b><span>Longest fast</span></div>
        <div className="card t"><b className="num">{fmtHM(s.avgH)}</b><span>Average fast</span></div>
      </div>
      <div className="card or2-total"><b className="num">{Math.round(s.totalH)}</b> hours fasted, all time</div>

      <div className="or2-seclabel">Recent fasts<span>last {recent.length}</span></div>
      <div className="card or2-chart">
        {recent.length === 0 ? (
          <div className="or2-empty">Complete a few fasts to see your trend.</div>
        ) : (
          <svg viewBox={`0 0 ${recent.length * 26} ${CH + 14}`} style={{ width: '100%', height: 'auto' }} aria-hidden="true">
            {recent.map((f, i) => {
              const hrs = Math.min(CAP, elapsedH(f.startTs, f.endTs))
              const gh = Math.min(CAP, f.targetH)
              const bh = (hrs / CAP) * CH
              const gy = CH - (gh / CAP) * CH
              const x = i * 26 + 5
              return (
                <g key={f.id}>
                  <rect x={x} y={CH - bh} width={16} height={Math.max(2, bh)} rx={4}
                    fill={f.hit ? 'var(--or-good)' : 'var(--or-accent)'} opacity={f.hit ? 0.9 : 0.45} />
                  <line x1={x - 2} x2={x + 18} y1={gy} y2={gy} stroke="var(--or-dim)" strokeWidth={1.4} strokeDasharray="3 3" />
                </g>
              )
            })}
          </svg>
        )}
        <div className="or2-legend">
          <span><i className="sw good" /> Goal reached</span>
          <span><i className="sw acc" /> Ended early</span>
          <span><i className="sw line" /> Goal line</span>
        </div>
      </div>

      <div className="or2-seclabel">Consistency<span>last 17 weeks</span></div>
      <div className="card or2-heatwrap">
        <div className="or2-heat">
          {weeks.map((w, wi) => (
            <div key={wi} className="col">
              {w.map((d) => {
                const v = byDay.get(d)
                const lv = v ? (v.hit ? 2 : 1) : 0
                return <i key={d} className={'c lv' + lv} title={d} />
              })}
            </div>
          ))}
        </div>
        <div className="or2-legend">
          <span><i className="sw good" /> Goal hit</span>
          <span><i className="sw acc" /> Fasted</span>
          <span><i className="sw none" /> None</span>
        </div>
      </div>

      <div className="or2-seclabel">Weight<span>kg</span></div>
      <div className="card or2-weight">
        <div className="row">
          <input className="tinput" inputMode="decimal" placeholder="—" value={kg} onChange={(e) => setKg(e.target.value)} aria-label="Weight in kg" />
          <span className="unit">kg</span>
          <button className="btn btn-primary btn-sm" onClick={() => {
            const v = Number(kg.replace(',', '.'))
            if (!Number.isFinite(v) || v <= 0) { toast('Enter a weight first'); return }
            logWeight(v)
            setKg('')
            toast('Weight logged')
          }}>Log</button>
        </div>
        {lastW ? (
          <p className="hint">
            Last: <b className="num">{lastW.kg} kg</b> · {dayAt(lastW.ts)}
            {prevW && <> · {lastW.kg - prevW.kg <= 0 ? '' : '+'}{(Math.round((lastW.kg - prevW.kg) * 10) / 10)} kg since previous</>}
          </p>
        ) : (
          <p className="hint">Log your weight now and then to see the trend alongside your fasts.</p>
        )}
      </div>

      <div className="or2-seclabel">Hydration today<span>aim 8+ glasses</span></div>
      <div className="card or2-hydro">
        <div className="left">
          <b className="num">{glasses}</b><span className="mono"> / 8 glasses</span>
          <p>≈ 250 ml each</p>
          <div className="glasses">
            {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < glasses ? 'on' : ''} />)}
          </div>
        </div>
        <div className="btns">
          <button onClick={() => addGlass(-1)} aria-label="Remove glass">−</button>
          <button onClick={() => addGlass(1)} aria-label="Add glass">+</button>
        </div>
      </div>

      <div className="or2-seclabel">Milestones<span>{unlockedCount}/{MILESTONES.length}</span></div>
      <div className="or2-miles">
        {MILESTONES.map((m) => {
          const onIt = m.test(st.fasts, s)
          return (
            <div key={m.id} className={'card m' + (onIt ? ' on' : '')}>
              <span className="ic">{onIt ? '★' : '☆'}</span>
              <b>{m.name}</b>
              <span>{m.desc}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Log ---------------- */

function LogTab() {
  const st = useStore(oraStore)
  const [editing, setEditing] = useState<Fast | null>(null)
  return (
    <div className="or2">
      <div className="or2-eyebrow">Every fast</div>
      <h2 className="or2-h1">Log</h2>
      {st.fasts.length === 0 ? (
        <div className="card or2-empty">No fasts yet — the first one starts on the Timer tab.</div>
      ) : (
        <div className="or2-log">
          {st.fasts.map((f) => {
            const p = protocolById(f.protocolId)
            const hrs = elapsedH(f.startTs, f.endTs)
            return (
              <button key={f.id} className="card or2-fast" onClick={() => setEditing(f)}>
                <span className="mid">
                  <b>{p.kind === 'custom' ? `${Math.round(f.targetH)}h custom` : p.kind === 'window' ? 'Window' : p.name}</b>
                  <i>{dayAt(f.endTs)} · {timeAt(f.startTs)} → {timeAt(f.endTs)}</i>
                </span>
                <span className="side">
                  <b className="num">{fmtHM(hrs)}</b>
                  <span className={'chip' + (f.hit ? ' good' : '')}>{f.hit ? '✓ goal' : 'early'}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      <EditFastSheet fast={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

/* ---------------- Settings extra ---------------- */

export function OraSettingsExtra() {
  const st = useStore(oraStore)
  return (
    <div className="or2 or2-setx">
      <div className="kv">
        <span className="k">Stage notifications — a quiet note when you cross into a new phase</span>
        <Toggle
          on={st.phaseAlerts}
          label="Stage notifications"
          onChange={() => {
            const next = !st.phaseAlerts
            setPhaseAlerts(next)
            if (next) {
              try {
                if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
              } catch { /* unsupported */ }
            }
          }}
        />
      </div>
      <div className="or2-disclaimer">
        <b>Not medical advice.</b> Don't fast if you're pregnant, under 18, or have a history of disordered
        eating — talk to a doctor first. Break any fast that makes you feel faint, dizzy or unwell.
      </div>
    </div>
  )
}

/* ---------------- root ---------------- */

export default function OraScreen({ tab = 'timer' }: { tab?: string }) {
  return (
    <>
      {tab === 'timer' && <TimerTab />}
      {tab === 'body' && <BodyTab />}
      {tab === 'progress' && <ProgressTab />}
      {tab === 'log' && <LogTab />}
    </>
  )
}

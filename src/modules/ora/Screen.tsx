import { send as sendNotify, canScheduleAhead } from '../../core/notify'
/**
 * ORA — fasting, hour by hour. Prototype-faithful or2 rebuild:
 * the whole surface tints to your current metabolic stage, the ring wears
 * the stages as bezel arcs, and every fast ends with honest numbers.
 */
import { useEffect, useRef, useState } from 'react'
import { t, localeTag } from '../../core/i18n'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { todayKey, dayKey, lastNDayKeys } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Toggle, Field, SampleDataBlock } from '../../app/ui'
import {
oraStore, PROTOCOLS, protocolById, STAGES, stageFor, targetHoursFor, windowFastHours,
  setProtocol, setCustomH, setWindow, beginFast, setStartTime, endFast, deleteFast, editFast,
  logWeight, addGlass, setPhaseAlerts, elapsedH, oraStats, MILESTONES, claimNewMilestones,
  dismissEating, type Fast, type Milestone, type OraState, type Stage, seedDemo, removeDemo, hasDemo,

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
const timeAt = (ts: number): string => new Date(ts).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' })
const dayAt = (ts: number): string => new Date(ts).toLocaleDateString(localeTag(), { weekday: 'short', day: 'numeric', month: 'short' })
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
    <Sheet open={open} title={t('Eating window')} onClose={onClose}>
      <div className="or2">
        <Field label={t('First bite')}>
          <input className="tinput" type="time" value={first} onChange={(e) => setFirst(e.target.value)} />
        </Field>
        <Field label={t('Last bite')}>
          <input className="tinput" type="time" value={last} onChange={(e) => setLast(e.target.value)} />
        </Field>
        <div className="or2-winsum">
          {fastH !== null
            ? t('Eat {a}–{b} · ORA fasts you {f} around it, overnight included.', { a: first, b: last, f: fmtHM(fastH) })
            : t('Enter both times to see the fast this implies.')}
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={fastH === null}
          onClick={() => { setWindow(first, last); setProtocol('window'); onClose(); toast(t('Window saved')) }}>
          {t('Save window')}
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
    <Sheet open={open} title={t('Custom target')} onClose={onClose}>
      <div className="or2">
        <div className="or2-bignum num">{h}<small>h</small></div>
        <div className="or2-chips">
          {[12, 16, 18, 20, 24, 36, 48].map((v) => (
            <button key={v} className={'chip' + (v === h ? ' on' : '')} onClick={() => setH(v)}>{v}h</button>
          ))}
        </div>
        <div className="or2-stepline">
          <button onClick={() => setH((x) => Math.max(4, x - 1))} aria-label="Less">−</button>
          <span>{t('fine-tune')}</span>
          <button onClick={() => setH((x) => Math.min(96, x + 1))} aria-label="More">+</button>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}
          onClick={() => { setCustomH(h); setProtocol('custom'); onClose(); toast(t('{h}h target set', { h })) }}>
          {t('Set target')}
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
    <Sheet open={open} title={t('When did this fast start?')} onClose={onClose}>
      <div className="or2">
        <p className="guide-p">{t('Already fasting before you pressed the button? Set the true start — the clock, stages and goal all follow it.')}</p>
        <Field label={t('Fast began')}>
          <input className="tinput" type="datetime-local" value={v} max={toLocalInput(Date.now())} onChange={(e) => setV(e.target.value)} />
        </Field>
        <button className="btn btn-primary" style={{ width: '100%' }}
          onClick={() => {
            const ts = fromLocalInput(v)
            if (ts === null || ts > Date.now()) { toast(t('Pick a time in the past')); return }
            if (!oraStore.get().current) beginFast(ts)
            else setStartTime(ts)
            onClose()
            toast(t('Start time set'))
          }}>
          {t('Save start time')}
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
    <Sheet open={open} title={t('End this fast?')} onClose={onClose}>
      <div className="or2 or2-endsheet">
        <div className="or2-bignum num">{d.hhmm}<small>:{d.ss}</small></div>
        <p className={'or2-goalline' + (hit ? ' good' : '')}>
          {hit
            ? t('Goal reached — {t} target, done.', { t: fmtHM(cur.targetH) })
            : t('{short} short of your {target} goal. Early is data, not failure.', { short: fmtHM(cur.targetH - hours), target: fmtHM(cur.targetH) })}
        </p>
        <button className="btn btn-primary" style={{ width: '100%' }}
          onClick={() => {
            const f = endFast()
            onClose()
            if (f) onEnded(f)
          }}>
          {hit ? t('Log this fast') : t('End early & log')}
        </button>
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>{t('Keep fasting')}</button>
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
          <div className="eyebrow">{t('Milestone unlocked')}{extra > 0 ? ' · ' + t('+{n} more', { n: extra }) : ''}</div>
          <h3>{t(ms.name)}</h3>
          <p>{t(ms.desc)}</p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>{t('Keep it up')}</button>
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
    <Sheet open={fast !== null} title={t('Edit fast')} onClose={onClose}>
      {fast && (
        <div className="or2">
          <Field label={t('Started')}>
            <input className="tinput" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t('Ended')}>
            <input className="tinput" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <button className="btn btn-primary" style={{ width: '100%' }}
            onClick={() => {
              const s = fromLocalInput(start)
              const e = fromLocalInput(end)
              if (s === null || e === null || e <= s) { toast(t('End must come after start')); return }
              editFast(fast.id, { startTs: s, endTs: e })
              onClose()
              toast(t('Fast updated'))
            }}>
            {t('Save changes')}
          </button>
          <button className="btn btn-ghost danger" style={{ width: '100%', marginTop: 8 }} onClick={() => setConfirmDel(true)}>
            {t('Delete fast')}
          </button>
          <ConfirmSheet
            open={confirmDel}
            title={t('Delete this fast?')}
            body={t("It will be removed from your history and stats. This can't be undone.")}
            actionLabel={t('Delete fast')}
            danger
            onConfirm={() => { deleteFast(fast.id); setConfirmDel(false); onClose(); toast(t('Fast deleted')) }}
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
          if (!canScheduleAhead()) sendNotify('ora', `ORA · ${stage.name}`, stage.note)
        }
      } catch { /* no notifications */ }
    }
    lastStage.current = stage.name
  }, [stage?.name, cur !== null])

  function onEnded(f: Fast) {
    const fresh = claimNewMilestones()
    if (fresh.length > 0) setCelebrate({ ms: fresh[0], extra: fresh.length - 1 })
    toast(f.hit ? t('Nicely done — goal reached') : t("Fast logged — next one's fresh"))
  }

  const groups: [string, string, typeof PROTOCOLS[number][]][] = [
    [t('Your schedule'), t('tap to choose'), PROTOCOLS.filter((p) => p.kind === 'window' || p.kind === 'custom')],
    [t('Daily rhythms'), t('intermittent fasting'), PROTOCOLS.filter((p) => p.kind === 'rhythm')],
    [t('Extended'), t('water fasts — read the stage notes'), PROTOCOLS.filter((p) => p.kind === 'extended')],
  ]
  const splitLabel = (p: typeof PROTOCOLS[number]): string => {
    if (p.kind === 'window') {
      const fh = windowFastHours(st.window.firstBite, st.window.lastBite)
      return fh !== null ? t('eat {a}–{b} · fast {f}', { a: st.window.firstBite, b: st.window.lastBite, f: fmtHM(fh) }) : t('you choose the times')
    }
    if (p.kind === 'custom') return t('any length you like')
    if (p.kind === 'extended') return t('{h}h fast · water only', { h: p.fastH })
    return t('{f}h fast · {e}h eating', { f: p.fastH, e: p.eatH })
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
                <div className="phase" style={{ color: stage?.color }}>{stage ? t(stage.name) : ''}</div>
                <div className="meta">
                  {over
                    ? t('+{over} past your {target} goal', { over: fmtHM((el as number) / H - cur.targetH), target: fmtHM(cur.targetH) })
                    : t('{target} target · ends {time}', { target: fmtHM(cur.targetH), time: timeAt(cur.startTs + cur.targetH * H) })}
                </div>
              </>
            ) : (
              <>
                <div className="big num">{Math.round(targetH * 10) / 10}</div>
                <div className="meta">{t('hour target')}</div>
              </>
            )}
          </div>
        </div>
        {cur ? (
          <button className="or2-mainbtn end" onClick={() => setSheet('end')}>{t('■ End fast')}</button>
        ) : (
          <button className="or2-mainbtn" onClick={() => { beginFast(); toast(t('Fast started — stay hydrated')) }}>{t('▶ Begin fast')}</button>
        )}
        {!cur && (
          <button className="or2-startlink" onClick={() => setSheet('start')}>
            {t('Already fasting? Set your start time')}
          </button>
        )}
        {cur && (
          <button className="or2-startlink" onClick={() => setSheet('start')}>
            {t('Started {day} · {time} — adjust', { day: dayAt(cur.startTs), time: timeAt(cur.startTs) })}
          </button>
        )}
      </div>

      {!cur && st.eating && eatingLeft !== null && (
        <div className="or2-eating card">
          {eatingLeft > 0 ? (
            <>
              <b>{t('Eating window open')}</b>
              <span>{t('closes {time} · {left} left — your next fast starts when it closes.', { time: timeAt(st.eating.startTs + st.eating.windowH * H), left: fmtHM(eatingLeft / H) })}</span>
            </>
          ) : (
            <>
              <b>{t('Window closed')}</b>
              <span>{t('Ready when you are — begin the next fast above.')}</span>
            </>
          )}
          <button className="x" onClick={dismissEating} aria-label={t('Dismiss')}>✕</button>
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
                  else { setProtocol(p.id); toast(t('{name} selected', { name: p.name })) }
                }}
              >
                <span className="nm">{bigName(p)}</span>
                <span className="mid">
                  <b className="mono">{splitLabel(p)}</b>
                  <i>{t(p.desc)}</i>
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
      <div className="or2-eyebrow">{t('The fasting timeline')}</div>
      <h2 className="or2-h1">{t("What's happening inside")}</h2>
      <div className="card or2-intro">
        {cur && curStage ? (
          <>{t("Fasting for {h} — you're in {stage}. The timeline below tracks your progress hour by hour.", { h: fmtHM(hours as number), stage: t(curStage.name) })}</>
        ) : (
          <>{t('Every fast moves through these stages. Start a fast to see where you are in real time — the timeline below tracks your progress hour by hour.')}</>
        )}
      </div>
      <div className="or2-stagehead">
        <h3>{t('Stage by stage')}</h3>
        <span>{t('hours fasting')}</span>
      </div>
      <div className="or2-stages">
        {STAGES.map((s) => {
          const passed = hours !== null && hours >= s.fromH
          const active = curStage === s
          return (
            <div key={s.name} className={'or2-stage card' + (active ? ' on' : '')}>
              <span className={'dot' + (passed ? ' lit' : '')} style={passed ? { borderColor: s.color, background: active ? s.color : undefined } : undefined} />
              <div className="head">
                <b style={{ color: s.color }}>{t(s.name)}</b>
                <span className="hrs mono">{s.toH === null ? `${s.fromH}h+` : `${s.fromH}–${s.toH}h`}</span>
                {active && <span className="nowchip" style={{ background: s.color }}>{t('Now')}</span>}
              </div>
              <p className="body">{t(s.body)}</p>
              <div className="tip" style={{ borderLeftColor: s.color }}>
                <b>{active ? t('Now') : t(s.noteKind)}.</b> {t(s.note)}
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
      <div className="or2-eyebrow">{t('Your progress')}</div>
      <h2 className="or2-h1">{t('Progress')}</h2>
      <div className="or2-tiles">
        <div className="card t"><b className="num">{s.streak}<small> d</small></b><span>{t('Current streak')}</span></div>
        <div className="card t"><b className="num">{s.bestStreak}<small> d</small></b><span>{t('Best streak')}</span></div>
        <div className="card t"><b className="num">{s.count}</b><span>{t('Fasts logged')}</span></div>
        <div className="card t"><b className="num">{s.hitRate}<small>%</small></b><span>{t('Goal hit rate')}</span></div>
        <div className="card t"><b className="num">{fmtHM(s.longestH)}</b><span>{t('Longest fast')}</span></div>
        <div className="card t"><b className="num">{fmtHM(s.avgH)}</b><span>{t('Average fast')}</span></div>
      </div>
      <div className="card or2-total"><b className="num">{Math.round(s.totalH)}</b> {t('hours fasted, all time')}</div>

      <div className="or2-seclabel">{t('Recent fasts')}<span>{t('last {n}', { n: recent.length })}</span></div>
      <div className="card or2-chart">
        {recent.length === 0 ? (
          <div className="or2-empty">{t('Complete a few fasts to see your trend.')}</div>
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
          <span><i className="sw good" /> {t('Goal reached')}</span>
          <span><i className="sw acc" /> {t('Ended early')}</span>
          <span><i className="sw line" /> {t('Goal line')}</span>
        </div>
      </div>

      <div className="or2-seclabel">{t('Consistency')}<span>{t('last 17 weeks')}</span></div>
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
          <span><i className="sw good" /> {t('Goal hit')}</span>
          <span><i className="sw acc" /> {t('Fasted')}</span>
          <span><i className="sw none" /> {t('None')}</span>
        </div>
      </div>

      <div className="or2-seclabel">{t('Weight')}<span>kg</span></div>
      <div className="card or2-weight">
        <div className="row">
          <input className="tinput" inputMode="decimal" placeholder="—" value={kg} onChange={(e) => setKg(e.target.value)} aria-label={t('Weight in kg')} />
          <span className="unit">kg</span>
          <button className="btn btn-primary btn-sm" onClick={() => {
            const v = Number(kg.replace(',', '.'))
            if (!Number.isFinite(v) || v <= 0) { toast(t('Enter a weight first')); return }
            logWeight(v)
            setKg('')
            toast(t('Weight logged'))
          }}>{t('Log')}</button>
        </div>
        {lastW ? (
          <p className="hint">
            {t('Last: {kg} kg · {day}', { kg: lastW.kg, day: dayAt(lastW.ts) })}
            {prevW && <> {t('{sign}{d} kg since previous', { sign: lastW.kg - prevW.kg <= 0 ? '' : '+', d: Math.round((lastW.kg - prevW.kg) * 10) / 10 })}</>}
          </p>
        ) : (
          <p className="hint">{t('Log your weight now and then to see the trend alongside your fasts.')}</p>
        )}
      </div>

      <div className="or2-seclabel">{t('Hydration today')}<span>{t('aim 8+ glasses')}</span></div>
      <div className="card or2-hydro">
        <div className="left">
          <b className="num">{glasses}</b><span className="mono">{t(' / 8 glasses')}</span>
          <p>{t('≈ 250 ml each')}</p>
          <div className="glasses">
            {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < glasses ? 'on' : ''} />)}
          </div>
        </div>
        <div className="btns">
          <button onClick={() => addGlass(-1)} aria-label={t('Remove glass')}>−</button>
          <button onClick={() => addGlass(1)} aria-label={t('Add glass')}>+</button>
        </div>
      </div>

      <div className="or2-seclabel">{t('Milestones')}<span>{unlockedCount}/{MILESTONES.length}</span></div>
      <div className="or2-miles">
        {MILESTONES.map((m) => {
          const onIt = m.test(st.fasts, s)
          return (
            <div key={m.id} className={'card m' + (onIt ? ' on' : '')}>
              <span className="ic">{onIt ? '★' : '☆'}</span>
              <b>{t(m.name)}</b>
              <span>{t(m.desc)}</span>
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
      <div className="or2-eyebrow">{t('Every fast')}</div>
      <h2 className="or2-h1">{t('Log')}</h2>
      {st.fasts.length === 0 ? (
        <div className="card or2-empty">{t('No fasts yet — the first one starts on the Timer tab.')}</div>
      ) : (
        <div className="or2-log">
          {st.fasts.map((f) => {
            const p = protocolById(f.protocolId)
            const hrs = elapsedH(f.startTs, f.endTs)
            return (
              <button key={f.id} className="card or2-fast" onClick={() => setEditing(f)}>
                <span className="mid">
                  <b>{p.kind === 'custom' ? t('{h}h custom', { h: Math.round(f.targetH) }) : p.kind === 'window' ? t('Window') : p.name}</b>
                  <i>{dayAt(f.endTs)} · {timeAt(f.startTs)} → {timeAt(f.endTs)}</i>
                </span>
                <span className="side">
                  <b className="num">{fmtHM(hrs)}</b>
                  <span className={'chip' + (f.hit ? ' good' : '')}>{f.hit ? t('✓ goal') : t('early')}</span>
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
        <span className="k">{t('Stage notifications — a quiet note when you cross into a new phase')}</span>
        <Toggle
          on={st.phaseAlerts}
          label={t('Stage notifications')}
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
        <b>{t('Not medical advice.')}</b> {t("Don't fast if you're pregnant, under 18, or have a history of disordered eating — talk to a doctor first. Break any fast that makes you feel faint, dizzy or unwell.")}
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

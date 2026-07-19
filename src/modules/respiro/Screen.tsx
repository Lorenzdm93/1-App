import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { logEvent, eventsStore } from '../../core/events'
import { shiftDay, formatDuration, dayKey, todayKey, lastNDayKeys } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, Toggle, StatBox } from '../../app/ui'
import { Bars } from '../../app/charts'
import {
  PROTOCOLS,
  CATEGORIES,
  protocolById,
  phaseAt,
  cycleSeconds,
  buildCustomProtocol,
  type Protocol,
} from './protocols'
import {
  respiroStore,
  selectProtocol,
  consumeAutostart,
  setCustom,
  setSpotify,
  parseSpotify,
  spotifyEmbedUrl,
  recordHold,
  setSound,
} from './model'

const MIN_SESSION_MS = 30_000

/* ---------- tiny synth for cues (no audio files, ever) ---------- */

let audioCtx: AudioContext | null = null
function ctx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    
      if (!AC) return null
      audioCtx = new AC()
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, gain = 0.05, when = 0): void {
  const ac = ctx()
  if (!ac) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, ac.currentTime + when)
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + when + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(ac.currentTime + when)
  osc.stop(ac.currentTime + when + dur + 0.05)
}

const playCue = () => tone(760, 0.09)
const playBell = () => {
  tone(392, 0.9, 0.06)
  tone(523.25, 1.2, 0.05, 0.12)
}

/* ---------- protocol glyphs ---------- */

function Glyph({ kind }: { kind: Protocol['glyph'] }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round' as const }
  switch (kind) {
    case 'sigh':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M3 16c2-6 4-6 5-2 .8-3 2-4 3-2.5 1.5 2 4 4.5 10 4.5" strokeLinejoin="round" />
        </svg>
      )
    case 'ring':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
    case 'wave':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <circle cx="12" cy="12" r="8" opacity="0.45" />
          <path d="M12 4a8 8 0 0 1 8 8" strokeWidth="2.4" />
        </svg>
      )
    case 'tri':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M12 4.5 20 19H4z" strokeLinejoin="round" />
        </svg>
      )
    case 'box':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
        </svg>
      )
    case 'nadi':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M8 20C8 12 12 10 12 4c0 6 4 8 4 16" strokeLinejoin="round" />
        </svg>
      )
    case 'bellows':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M3 12l3-5 3 10 3-12 3 12 3-10 3 5" strokeLinejoin="round" />
        </svg>
      )
  }
}

/* ---------- geometric tracer (unchanged mechanics, kept premium) ---------- */

const SQUARE: readonly [number, number][] = [
  [40, 40],
  [160, 40],
  [160, 160],
  [40, 160],
]
const TRIANGLE: readonly [number, number][] = [
  [100, 34],
  [172, 166],
  [28, 166],
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function Figure({
  protocol,
  index,
  progress,
  running,
  scale,
  seconds,
  children,
}: {
  protocol: Protocol
  index: number
  progress: number
  running: boolean
  scale: number
  seconds: number
  children: ReactNode
}) {
  const n = protocol.phases.length
  const poly = n === 4 ? SQUARE : n === 3 ? TRIANGLE : null
  const acc = 'var(--rs-acc, var(--m-respiro))'

  let shape: ReactNode
  if (poly) {
    const pts = poly
    const from = pts[index % pts.length]
    const to = pts[(index + 1) % pts.length]
    const dot: [number, number] = [lerp(from[0], to[0], progress), lerp(from[1], to[1], progress)]
    shape = (
      <>
        <polygon
          points={pts.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke="var(--line)"
          strokeWidth="2"
        />
        {running &&
          pts.map((p, i) => {
            if (i >= index) return null
            const q = pts[(i + 1) % pts.length]
            return (
              <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={acc} strokeWidth="3" strokeLinecap="round" />
            )
          })}
        {running && (
          <line x1={from[0]} y1={from[1]} x2={dot[0]} y2={dot[1]} stroke={acc} strokeWidth="3" strokeLinecap="round" />
        )}
        {running && (
          <>
            <circle cx={dot[0]} cy={dot[1]} r="13" fill={acc} opacity="0.22" />
            <circle cx={dot[0]} cy={dot[1]} r="7" fill={acc} />
          </>
        )}
      </>
    )
  } else {
    const r = 78
    const C = 2 * Math.PI * r
    const total = cycleSeconds(protocol)
    let before = 0
    for (let i = 0; i < index; i++) before += protocol.phases[i].seconds
    const covered = ((before + protocol.phases[index].seconds * progress) / total) * C
    const angle = ((before + protocol.phases[index].seconds * progress) / total) * 2 * Math.PI - Math.PI / 2
    const dot: [number, number] = [100 + r * Math.cos(angle), 100 + r * Math.sin(angle)]
    let accMarks = 0
    shape = (
      <>
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--line)" strokeWidth="2" />
        {protocol.phases.map((ph, i) => {
          accMarks += ph.seconds
          const a = (accMarks / total) * 2 * Math.PI - Math.PI / 2
          return (
            <line
              key={i}
              x1={100 + (r - 6) * Math.cos(a)}
              y1={100 + (r - 6) * Math.sin(a)}
              x2={100 + (r + 6) * Math.cos(a)}
              y2={100 + (r + 6) * Math.sin(a)}
              stroke="var(--faint)"
              strokeWidth="1.5"
            />
          )
        })}
        {running && (
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={acc}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${covered} ${C - covered}`}
            transform="rotate(-90 100 100)"
          />
        )}
        {running && (
          <>
            <circle cx={dot[0]} cy={dot[1]} r="13" fill={acc} opacity="0.22" />
            <circle cx={dot[0]} cy={dot[1]} r="7" fill={acc} />
          </>
        )}
      </>
    )
  }

  const wrapStyle: CSSProperties = running
    ? { transform: `scale(${0.9 + scale * 0.12})`, transitionDuration: `${seconds}s` }
    : { transform: 'scale(0.96)', transitionDuration: '0.4s' }

  return (
    <div className="rs-fig-wrap">
      <div className="rs-fig-scale" style={wrapStyle}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          {shape}
        </svg>
      </div>
      <div className="rs-fig-center">{children}</div>
    </div>
  )
}

/* ---------- practice: library ---------- */

/** The pattern, drawn: one full cycle as a curve the dot travels. */
function BreathCurve({
  protocol,
  cycleFrac,
  running,
}: {
  protocol: Protocol
  cycleFrac: number
  running: boolean
}) {
  const baseRef = useRef<SVGPathElement | null>(null)
  const [dot, setDot] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const W = 300
  const H = 190
  const total = cycleSeconds(protocol)
  const yFor = (scale: number) => H - 24 - ((scale - 0.55) / 0.5) * (H - 60)
  let d = ''
  let x = 8
  let prevScale = protocol.phases[protocol.phases.length - 1].scale
  d = `M ${x} ${yFor(prevScale).toFixed(1)}`
  for (const ph of protocol.phases) {
    const w = (ph.seconds / total) * (W - 16)
    if (ph.scale === prevScale) {
      x += w
      d += ` L ${x.toFixed(1)} ${yFor(ph.scale).toFixed(1)}`
    } else {
      const x1 = x + w * 0.42
      const x2 = x + w * 0.58
      const y0 = yFor(prevScale)
      const y1 = yFor(ph.scale)
      x += w
      d += ` C ${x1.toFixed(1)} ${y0.toFixed(1)}, ${x2.toFixed(1)} ${y1.toFixed(1)}, ${x.toFixed(1)} ${y1.toFixed(1)}`
      prevScale = ph.scale
    }
  }
  useEffect(() => {
    const el = baseRef.current
    if (!el) return
    const len = el.getTotalLength()
    const p = el.getPointAtLength(Math.min(0.999, Math.max(0, cycleFrac)) * len)
    setDot({ x: p.x, y: p.y })
  }, [cycleFrac, protocol.id])
  return (
    <div className={'rs-curve-wrap' + (running ? ' live' : '')}>
      <div className="rs-curve-glow" aria-hidden="true" />
      <svg viewBox={`0 0 ${W} ${H}`} className="rs-curve" aria-hidden="true">
        <path ref={baseRef} d={d} fill="none" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
        <path
          d={d} fill="none" stroke="var(--rs-acc)" strokeWidth="3.5" strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${Math.max(0.001, cycleFrac)} 1`}
          style={{ filter: 'drop-shadow(0 0 5px color-mix(in srgb, var(--rs-acc) 60%, transparent))' }}
        />
        {running && (
          <>
            <circle cx={dot.x} cy={dot.y} r="7.5" fill="var(--surface)" stroke="var(--rs-acc)" strokeWidth="2.5" />
            <circle cx={dot.x} cy={dot.y} r="2.6" fill="var(--rs-acc)" />
          </>
        )}
      </svg>
    </div>
  )
}

function ProtocolCard({ p, onOpen }: { p: Protocol; onOpen: () => void }) {
  return (
    <button
      className="card card-tap rs-card"
      style={{ ['--rs-acc' as string]: p.accentVar } as CSSProperties}
      onClick={onOpen}
    >
      <span className="rs-card-glyph">
        <Glyph kind={p.glyph} />
      </span>
      <span className="rs-card-main">
        <span className="rs-card-name">
          {p.name}
          {p.warning && <span className="rs-warn-dot" aria-label="Carries a warning">!</span>}
        </span>
        <span className="rs-card-desc">{p.desc}</span>
      </span>
      <span className="rs-card-side">
        <span className="pat num">{p.sub}</span>
        <span className="tag">{p.tag}</span>
      </span>
    </button>
  )
}

function Library({ onOpen }: { onOpen: (id: string) => void }) {
  const st = useStore(respiroStore)
  const [browse, setBrowse] = useState(false)
  const last = st.protocolId === 'custom' ? buildCustomProtocol(st.custom) : protocolById(st.protocolId)
  return (
    <>
      <div
        className="card rs-hero"
        style={{ ['--rs-acc' as string]: last.accentVar } as CSSProperties}
      >
        <div className="rs-hero-kicker">Continue with</div>
        <div className="rs-hero-name">{last.name}</div>
        <div className="rs-hero-desc">{last.desc}</div>
        <button className="btn btn-primary rs-hero-btn" onClick={() => onOpen(last.id)}>
          ▷&nbsp; Begin · {last.suggestedMin} min
        </button>
      </div>
      <button className="rs-browse" onClick={() => setBrowse((b) => !b)}>
        {browse ? 'Hide the library ▴' : 'Choose a different protocol ▾'}
      </button>
      {browse && CATEGORIES.map((c) => (
        <div key={c.id}>
          <div className="section-label">{c.label}</div>
          {PROTOCOLS.filter((p) => p.category === c.id).map((p) => (
            <ProtocolCard key={p.id} p={p} onOpen={() => onOpen(p.id)} />
          ))}
          {c.id === 'steady' && (
            <ProtocolCard p={buildCustomProtocol(st.custom)} onOpen={() => onOpen('custom')} />
          )}
        </div>
      ))}
      <p className="rs-foot">
        Nasal, quiet, unforced — that's ninety percent of every technique. Patterns differ mainly in
        where they put the emphasis: long exhales calm, balanced sides steady, fast rounds arouse.
      </p>
    </>
  )
}

/* ---------- practice: stage ---------- */

function Stage({
  protocolId,
  plannedMin,
  onSaved,
  onBack,
}: {
  protocolId: string
  plannedMin: number | null
  onSaved: (s: { name: string; minutes: number; cycles: number; streak: number }) => void
  onBack: () => void
}) {
  const st = useStore(respiroStore)
  const protocol: Protocol =
    protocolId === 'custom' ? buildCustomProtocol(st.custom) : protocolById(protocolId)

  const [startTs, setStartTs] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const startedRef = useRef(false)
  const lastPhaseRef = useRef(-1)

  useEffect(() => {
    if (!startedRef.current && consumeAutostart()) {
      startedRef.current = true
      setStartTs(Date.now())
    }
  }, [])

  const running = startTs !== null
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [running])

  const elapsedSec = running ? (now - startTs) / 1000 : 0
  const pos = phaseAt(protocol, elapsedSec)
  const progress = pos.phase.seconds > 0 ? 1 - pos.remaining / pos.phase.seconds : 0
  const cycle = running ? Math.floor(elapsedSec / cycleSeconds(protocol)) + 1 : 0

  useEffect(() => {
    if (!running) {
      lastPhaseRef.current = -1
      return
    }
    if (pos.index !== lastPhaseRef.current) {
      if (lastPhaseRef.current !== -1 && respiroStore.get().cues) playCue()
      lastPhaseRef.current = pos.index
    }
  }, [running, pos.index])

  useEffect(() => {
    if (running) document.body.classList.add('rs-running')
    else document.body.classList.remove('rs-running')
    return () => document.body.classList.remove('rs-running')
  }, [running])

  function end() {
    if (startTs === null) return
    const ms = Date.now() - startTs
    setStartTs(null)
    if (ms >= MIN_SESSION_MS) {
      const minutes = Math.round((ms / 60000) * 10) / 10
      logEvent({
        module: 'respiro',
        kind: 'session',
        value: minutes,
        unit: 'min',
        meta: { protocol: protocol.id },
      })
      if (respiroStore.get().bell) playBell()
      const cycles = Math.max(1, Math.floor(ms / 1000 / cycleSeconds(protocol)))
      const days = new Set(
        eventsStore.get().filter((e) => e.module === 'respiro').map((e) => dayKey(e.ts)),
      )
      let streak = 0
      let cursor = todayKey()
      while (days.has(cursor)) {
        streak++
        cursor = shiftDay(cursor, -1)
      }
      onSaved({ name: protocol.name, minutes, cycles, streak })
    } else {
      toast('Under 30 s — not logged')
    }
  }

  useEffect(() => {
    if (running && plannedMin !== null && elapsedSec >= plannedMin * 60) end()
  }, [running, plannedMin, Math.floor(elapsedSec)])

  const custom = st.custom
  const customFields = [
    { key: 'inS', label: 'In' },
    { key: 'hold1', label: 'Hold' },
    { key: 'outS', label: 'Out' },
    { key: 'hold2', label: 'Hold' },
  ] as const

  return (
    <>
      {!running && (
        <button className="rs-back" onClick={onBack}>
          ‹ All patterns
        </button>
      )}
      <div
        className={'card rs-stage' + (running ? ' running' : '')}
        style={{ ['--rs-acc' as string]: protocol.accentVar } as CSSProperties}
      >
        <BreathCurve
          protocol={protocol}
          cycleFrac={running ? (elapsedSec % cycleSeconds(protocol)) / cycleSeconds(protocol) : 0}
          running={running}
        />
        <div className="rs-phaseblock">
          <span className="rs-phase">{running ? pos.phase.label : 'Ready'}</span>
          <span className="rs-count num">{running ? `${Math.ceil(pos.remaining)}s` : '—'}</span>
          {running && pos.phase.hint && <span className="rs-hint">{pos.phase.hint}</span>}
        </div>
        <div className="rs-dots" aria-hidden="true">
          {protocol.phases.map((_, i) => (
            <span key={i} className={'rs-dot' + (running && i === pos.index ? ' on' : '')} />
          ))}
        </div>
        {running && <div className="rs-cycle num">Cycle {cycle}</div>}
        <div className="rs-session num">
          {running
            ? plannedMin !== null
              ? `${formatDuration(now - startTs)} · cycle ${cycle} · −${formatDuration(Math.max(0, plannedMin * 60_000 - (now - startTs)))}`
              : `Session · ${formatDuration(now - startTs)} · cycle ${cycle}`
            : `${protocol.sub} — suggested ${protocol.suggestedMin} min`}
        </div>
      </div>

      {protocol.warning && !running && (
        <div className="rs-warning">
          <b>Safety first.</b> {protocol.warning}
        </div>
      )}

      {protocolId === 'custom' && !running && (
        <div className="rs-custom">
          {customFields.map((f) => (
            <label key={f.key} className="rs-custom-field">
              <span>{f.label}</span>
              <input
                className="tinput"
                inputMode="numeric"
                value={custom[f.key]}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  setCustom({ [f.key]: Number.isFinite(v) ? v : 0 })
                }}
              />
            </label>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {running ? (
          <button className="btn btn-ghost" onClick={end}>
            End session
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => {
              selectProtocol(protocolId)
              setStartTs(Date.now())
            }}
          >
            Begin
          </button>
        )}
      </div>

      {!running && (
        <div className="card guide" style={{ marginTop: 16 }}>
          <p>{protocol.detail}</p>
        </div>
      )}
    </>
  )
}

function PracticeTab() {
  const st = useStore(respiroStore)
  const [view, setView] = useState<'library' | 'stage'>(st.autostart ? 'stage' : 'library')
  const [stageId, setStageId] = useState(st.protocolId)
  const [planned, setPlanned] = useState<number | null>(null)
  const [pre, setPre] = useState<string | null>(null)
  const [preDur, setPreDur] = useState(3)
  const [saved, setSaved] = useState<{ name: string; minutes: number; cycles: number; streak: number } | null>(null)
  const preProto = pre === null ? null : pre === 'custom' ? buildCustomProtocol(st.custom) : protocolById(pre)
  return (
    <>
      {view === 'stage' ? (
        <Stage
          protocolId={stageId}
          plannedMin={planned}
          onSaved={(s) => {
            setSaved(s)
            setView('library')
          }}
          onBack={() => setView('library')}
        />
      ) : (
        <Library
          onOpen={(id) => {
            const p = id === 'custom' ? buildCustomProtocol(st.custom) : protocolById(id)
            setPre(id)
            setPreDur(p.suggestedMin)
          }}
        />
      )}

      <Sheet open={preProto !== null} title={preProto?.name ?? ''} onClose={() => setPre(null)}>
        {preProto && (
          <div style={{ ['--rs-acc' as string]: preProto.accentVar } as CSSProperties}>
            <p className="guide-p">{preProto.detail}</p>
            <div className="rs-durlabel">Duration</div>
            <div className="rs-durs num">
              {[1, 2, 3, 5, 10].map((m) => (
                <button
                  key={m}
                  className={'rs-dur' + (preDur === m ? ' on' : '')}
                  onClick={() => setPreDur(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary rs-begin"
              onClick={() => {
                const id = pre as string
                setStageId(id)
                selectProtocol(id)
                setPlanned(preDur)
                setPre(null)
                setView('stage')
              }}
            >
              ▷&nbsp; Begin
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={saved !== null} title="Session saved" onClose={() => setSaved(null)}>
        {saved && (
          <>
            <p className="guide-p">
              {saved.name} · {saved.minutes} min · {saved.cycles} cycle{saved.cycles === 1 ? '' : 's'}.
              Current streak: {saved.streak} day{saved.streak === 1 ? '' : 's'}.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={() => setSaved(null)}>
              Done
            </button>
          </>
        )}
      </Sheet>
    </>
  )
}

/* ---------- progress ---------- */

function ProgressTab() {
  const events = useStore(eventsStore)
  const st = useStore(respiroStore)
  const sessions = events.filter((e) => e.module === 'respiro' && e.kind === 'session')
  const totalMin = Math.round(sessions.reduce((s, e) => s + (e.value ?? 0), 0))
  const days = lastNDayKeys(14)
  const perDay = days.map((day) => ({
    label: day.slice(-2),
    value: Math.round(
      sessions.filter((e) => dayKey(e.ts) === day).reduce((s, e) => s + (e.value ?? 0), 0),
    ),
  }))
  const today = todayKey()
  const practicedDays = new Set(sessions.map((e) => dayKey(e.ts)))
  let streak = 0
  {
    let cursor = practicedDays.has(today) ? today : ''
    if (cursor === '') {
      // streak may still stand on yesterday
      const y = days[days.length - 2]
      cursor = practicedDays.has(y) ? y : ''
    }
    while (cursor && practicedDays.has(cursor)) {
      streak++
      const d = new Date(cursor + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      cursor = dayKey(d.getTime())
    }
  }
  return (
    <>
      <div className="ins-grid">
        <StatBox label="sessions" value={String(sessions.length)} />
        <StatBox label="total minutes" value={String(totalMin)} />
        <StatBox label="practice streak" value={`${streak}d`} />
        <StatBox label="best hold" value={st.bestHold > 0 ? `${st.bestHold}s` : '—'} />
      </div>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-respiro)' }}>Minutes · last 14 days</span>
        </div>
        <Bars data={perDay} accentVar="var(--m-respiro)" />
      </div>
      <div className="card guide">
        <p>
          <b>Consistency beats intensity.</b> Five daily minutes of coherent breathing moves resting
          heart-rate variability more than an occasional half-hour. The streak above counts any
          logged session — protect it with the smallest one you can do.
        </p>
      </div>
    </>
  )
}

/* ---------- sound ---------- */

function HoldTest({ now, onTick }: { now: number; onTick: (active: boolean) => void }) {
  const st = useStore(respiroStore)
  const [start, setStart] = useState<number | null>(null)
  useEffect(() => onTick(start !== null), [start, onTick])
  const elapsed = start !== null ? Math.floor((now - start) / 1000) : 0
  return (
    <div className="card">
      <div className="card-head">
        <span className="label" style={{ color: 'var(--m-respiro)' }}>Breath hold</span>
      </div>
      {start !== null ? (
        <div className="rs-hold-live num">{formatDuration(now - start)}</div>
      ) : (
        <div className="w-stat-row">
          <div className="w-stat">
            <div className="v num">{st.lastHold > 0 ? `${st.lastHold}s` : '—'}</div>
            <div className="k">last</div>
          </div>
          <div className="w-stat">
            <div className="v num">{st.bestHold > 0 ? `${st.bestHold}s` : '—'}</div>
            <div className="k">best</div>
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        {start !== null ? (
          <button
            className="btn btn-ghost"
            onClick={() => {
              const { isBest } = recordHold(elapsed)
              toast(isBest ? `New best hold — ${elapsed}s` : `${elapsed}s hold logged`)
              setStart(null)
            }}
          >
            Stop
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={() => setStart(Date.now())}>
            Exhale, then start
          </button>
        )}
      </div>
      <p className="rs-foot" style={{ marginTop: 10 }}>
        Time your Wim Hof retentions here, or track CO₂ tolerance on its own. Always seated.
      </p>
    </div>
  )
}

function ToolsTab() {
  const st = useStore(respiroStore)
  const [now, setNow] = useState(() => Date.now())
  const [holdActive, setHoldActive] = useState(false)
  const [localName, setLocalName] = useState<string | null>(null)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [url, setUrl] = useState(st.spotifyUrl)
  const [editing, setEditing] = useState(st.spotifyUrl === '')

  useEffect(() => {
    if (!holdActive) return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [holdActive])

  useEffect(() => () => {
    if (localUrl) URL.revokeObjectURL(localUrl)
  }, [localUrl])

  const ref = st.spotifyUrl ? parseSpotify(st.spotifyUrl) : null

  return (
    <>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-respiro)' }}>Cues</span>
        </div>
        <div className="kv">
          <span className="k">Phase ticks — a soft chime at each transition, eyes closed</span>
          <Toggle on={st.cues} onChange={() => setSound({ cues: !st.cues })} label="Phase cues" />
        </div>
        <div className="kv">
          <span className="k">Completion bell when a session is logged</span>
          <Toggle on={st.bell} onChange={() => setSound({ bell: !st.bell })} label="Completion bell" />
        </div>
        <p className="rs-foot" style={{ marginTop: 8 }}>
          All sounds are synthesised on-device — nothing to download, nothing leaves the phone.
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-respiro)' }}>Spotify</span>
        </div>
        {ref && !editing ? (
          <>
            <iframe
              className="rs-spotify"
              src={spotifyEmbedUrl(ref)}
              height={ref.type === 'track' ? 80 : 152}
              allow="encrypted-media"
              loading="lazy"
              title="Spotify"
            />
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                Change
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSpotify('')
                  setUrl('')
                  setEditing(true)
                }}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              className="tinput"
              placeholder="Paste a Spotify link — track, playlist, album…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div style={{ marginTop: 10 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (setSpotify(url)) {
                    setEditing(false)
                    if (url.trim()) toast('Sound linked')
                  } else {
                    toast("That doesn't look like a Spotify link")
                  }
                }}
              >
                Save
              </button>
            </div>
          </>
        )}
        <p className="rs-foot" style={{ marginTop: 10 }}>
          The link is saved on this device and survives restarts — your guided track is one tap away
          before every session.
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-respiro)' }}>Local file</span>
        </div>
        {localUrl ? (
          <>
            <div className="kv">
              <span className="k">{localName}</span>
            </div>
            <audio className="rs-audio" src={localUrl} controls loop />
          </>
        ) : (
          <label className="btn btn-ghost" style={{ display: 'inline-flex', cursor: 'pointer' }}>
            Choose an audio file
            <input
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (localUrl) URL.revokeObjectURL(localUrl)
                setLocalName(f.name)
                setLocalUrl(URL.createObjectURL(f))
              }}
            />
          </label>
        )}
        <p className="rs-foot" style={{ marginTop: 10 }}>
          Plays your own recording — a teacher's meditation, a favourite piece. Honest limitation: a
          browser app can't keep file access between visits, so re-pick it next session. The Spotify
          link above is the one that persists.
        </p>
      </div>

      <HoldTest now={now} onTick={setHoldActive} />
    </>
  )
}

/* ---------- screen ---------- */

export default function RespiroScreen({ tab = 'practice' }: { tab?: string }) {
  if (tab === 'progress') return <ProgressTab />
  if (tab === 'sound') return <ToolsTab />
  return <PracticeTab />
}

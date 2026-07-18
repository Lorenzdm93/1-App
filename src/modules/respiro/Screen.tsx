import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { logEvent } from '../../core/events'
import { formatDuration } from '../../core/dates'
import { toast } from '../../core/toast'
import { Seg } from '../../app/ui'
import {
  PROTOCOLS,
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
} from './model'

const MIN_SESSION_MS = 30_000

/* ---------- geometric tracer ---------- */

const SQUARE: readonly [number, number][] = [
  [40, 40],
  [160, 40],
  [160, 160],
  [40, 160],
]
const TRIANGLE: readonly [number, number][] = [
  [100, 36],
  [168, 158],
  [32, 158],
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
    // proportional ring: arcs sized by phase duration
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
    ? {
        transform: `scale(${0.9 + scale * 0.12})`,
        transitionDuration: `${seconds}s`,
      }
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

/* ---------- breath hold ---------- */

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
    </div>
  )
}

/* ---------- sound ---------- */

function SoundCard() {
  const st = useStore(respiroStore)
  const [editing, setEditing] = useState(st.spotifyUrl === '')
  const [url, setUrl] = useState(st.spotifyUrl)
  const ref = st.spotifyUrl ? parseSpotify(st.spotifyUrl) : null
  return (
    <div className="card">
      <div className="card-head">
        <span className="label" style={{ color: 'var(--m-respiro)' }}>Sound</span>
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
    </div>
  )
}

/* ---------- screen ---------- */

export default function RespiroScreen({ tab = 'breathe' }: { tab?: string }) {
  const st = useStore(respiroStore)
  const protocol: Protocol =
    st.protocolId === 'custom' ? buildCustomProtocol(st.custom) : protocolById(st.protocolId)

  const [startTs, setStartTs] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [holdActive, setHoldActive] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!startedRef.current && consumeAutostart()) {
      startedRef.current = true
      setStartTs(Date.now())
    }
  }, [])

  const ticking = startTs !== null || holdActive
  useEffect(() => {
    if (!ticking) return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [ticking])

  const running = startTs !== null
  const elapsedSec = running ? (now - startTs) / 1000 : 0
  const pos = phaseAt(protocol, elapsedSec)
  const progress = pos.phase.seconds > 0 ? 1 - pos.remaining / pos.phase.seconds : 0
  const cycle = running ? Math.floor(elapsedSec / cycleSeconds(protocol)) + 1 : 0

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
      toast(`${minutes} min logged`)
    } else {
      toast('Under 30 s — not logged')
    }
  }

  const custom = st.custom
  const customFields = [
    { key: 'inS', label: 'In' },
    { key: 'hold1', label: 'Hold' },
    { key: 'outS', label: 'Out' },
    { key: 'hold2', label: 'Hold' },
  ] as const

  if (tab === 'tools') {
    return (
      <>
        {running && (
          <button className="gh-running" onClick={() => navigate('/m/respiro/breathe')}>
            <span className="pulse" aria-hidden="true" />
            {protocol.name} running · {formatDuration(now - (startTs as number))} — return
          </button>
        )}
        <HoldTest now={now} onTick={setHoldActive} />
        <SoundCard />
      </>
    )
  }

  return (
    <>
      <div
        className={'card rs-stage' + (running ? ' running' : '')}
        style={{ ['--rs-acc' as string]: protocol.accentVar } as CSSProperties}
      >
        <Figure
          protocol={protocol}
          index={pos.index}
          progress={progress}
          running={running}
          scale={pos.phase.scale}
          seconds={pos.phase.seconds}
        >
          <span className="rs-phase">{running ? pos.phase.label : 'Ready'}</span>
          <span className="rs-count">{running ? Math.ceil(pos.remaining) : '—'}</span>
        </Figure>
        <div className="rs-dots" aria-hidden="true">
          {protocol.phases.map((_, i) => (
            <span key={i} className={'rs-dot' + (running && i === pos.index ? ' on' : '')} />
          ))}
        </div>
        {running && <div className="rs-cycle num">Cycle {cycle}</div>}
        <div className="rs-session">
          {running ? `Session · ${formatDuration(now - startTs)}` : `${protocol.name} — ${protocol.sub}`}
        </div>
      </div>

      <div className="section-label">Protocol</div>
      <div className="chips">
        {PROTOCOLS.map((p) => (
          <button
            key={p.id}
            className={'chip' + (p.id === st.protocolId ? ' on' : '')}
            style={{ ['--chip-accent' as string]: p.accentVar } as CSSProperties}
            disabled={running}
            onClick={() => selectProtocol(p.id)}
          >
            {p.name}
          </button>
        ))}
        <button
          className={'chip' + (st.protocolId === 'custom' ? ' on' : '')}
          style={{ ['--chip-accent' as string]: 'var(--m-respiro)' } as CSSProperties}
          disabled={running}
          onClick={() => selectProtocol('custom')}
        >
          Custom
        </button>
      </div>
      {st.protocolId === 'custom' && !running && (
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
      {!running && <div className="rs-proto-sub">{protocol.sub}</div>}

      <div style={{ marginTop: 18 }}>
        {running ? (
          <button className="btn btn-ghost" onClick={end}>
            End session
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setStartTs(Date.now())}>
            Begin
          </button>
        )}
      </div>

    </>
  )
}

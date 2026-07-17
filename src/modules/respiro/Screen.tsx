import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { logEvent } from '../../core/events'
import { formatDuration } from '../../core/dates'
import { toast } from '../../core/toast'
import { PROTOCOLS, protocolById, phaseAt, cycleSeconds } from './protocols'
import { respiroStore, selectProtocol, consumeAutostart } from './model'

const MIN_SESSION_MS = 30_000

export default function RespiroScreen() {
  const { protocolId } = useStore(respiroStore)
  const protocol = protocolById(protocolId)

  const [startTs, setStartTs] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const startedRef = useRef(false)

  // Quick action from Today: begin immediately, exactly once per request.
  useEffect(() => {
    if (!startedRef.current && consumeAutostart()) {
      startedRef.current = true
      setStartTs(Date.now())
    }
  }, [])

  // 100 ms tick, but all state derives from timestamps — throttling-proof.
  useEffect(() => {
    if (startTs === null) return
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [startTs])

  const running = startTs !== null
  const elapsedSec = running ? (now - startTs) / 1000 : 0
  const pos = phaseAt(protocol, elapsedSec)
  const cycle = running ? Math.floor(elapsedSec / cycleSeconds(protocol)) + 1 : 0

  // Dim the chrome while breathing — the orb owns the room.
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

  const orbStyle = running
    ? {
        transform: `scale(${pos.phase.scale})`,
        transitionDuration: `${pos.phase.seconds}s`,
      }
    : { transform: 'scale(0.62)', transitionDuration: '0.4s' }

  return (
    <>
      <div
        className={'card rs-stage' + (running ? ' running' : '')}
        style={{ ['--rs-acc' as string]: protocol.accentVar } as CSSProperties}
      >
        <div className="rs-orb-wrap">
          <div className="rs-orb-track" />
          <div className="rs-orb" style={orbStyle}>
            <span className="rs-phase">{running ? pos.phase.label : 'Ready'}</span>
            <span className="rs-count">{running ? Math.ceil(pos.remaining) : '—'}</span>
          </div>
        </div>
        <div className="rs-dots" aria-hidden="true">
          {protocol.phases.map((ph, i) => (
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
            className={'chip' + (p.id === protocol.id ? ' on' : '')}
            style={{ ['--chip-accent' as string]: p.accentVar } as CSSProperties}
            disabled={running}
            onClick={() => selectProtocol(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
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

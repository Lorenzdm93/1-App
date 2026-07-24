import { useEffect, useRef, useState, useMemo } from 'react'
import { useStore } from '../../core/hooks'
import { logEvent, eventsStore } from '../../core/events'
import { formatDuration, dayKey, todayKey, lastNDayKeys } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Toggle, StatBox } from '../../app/ui'
import { Bars } from '../../app/charts'
import {
  TECHNIQUES,
  techniqueById,
  geoFor,
  ACCENT_VAR,
  PHASE_LABEL,
  PHASE_COLOR,
  breathLevel,
  buildSegs,
  segAt,
  easeInOut,
  VB,
  C,
  type Technique,
  type Seg,
  type CustomPhases,
} from './stage'
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
  addSoundItem,
  removeSoundItem,
  parseYouTube,
  youtubeEmbedUrl,
  type SoundItem,
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

/* ============================================================
   THE INSTRUMENT — prototype-faithful stage, engine, and cards.
   Side lengths equal phase seconds; the comet never lies.
   ============================================================ */

const fmtSec = (s: number): string => {
  const v = Math.max(0, Math.floor(s))
  return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0')
}

function buzz(pattern: number[]): void {
  try { navigator.vibrate?.(pattern) } catch { /* no haptics */ }
}

/** Synth cues + the breath-following ambient drone, gated by settings. */
const AudioEngineR = {
  ctx: null as AudioContext | null,
  ambient: null as { g: GainNode; o1: OscillatorNode; o2: OscillatorNode; o3: OscillatorNode } | null,
  ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      } catch { return null }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined)
    return this.ctx
  },
  chime(kind: PhaseKey | 'done'): void {
    const st = respiroStore.get()
    if (kind === 'done' ? !st.bell : !st.cues) return
    const ctx = this.ensure()
    if (!ctx) return
    const freqs: Record<string, number> = { in: 523.25, in2: 587.33, hold: 659.25, out: 392.0, hold2: 440.0, done: 783.99 }
    const f = freqs[kind] ?? 523.25
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o.frequency.setValueAtTime(f, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'done' ? 1.4 : 0.9))
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + 1.5)
    if (kind === 'done') {
      const o2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      o2.type = 'triangle'
      o2.frequency.setValueAtTime(f * 1.25, t + 0.18)
      g2.gain.setValueAtTime(0.0001, t + 0.18)
      g2.gain.exponentialRampToValueAtTime(0.13, t + 0.22)
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.6)
      o2.connect(g2).connect(ctx.destination)
      o2.start(t + 0.18)
      o2.stop(t + 1.7)
    }
  },
  startAmbient(): void {
    if (!respiroStore.get().ambient || this.ambient) return
    const ctx = this.ensure()
    if (!ctx) return
    const g = ctx.createGain()
    g.gain.value = 0
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    lp.Q.value = 0.6
    const o1 = ctx.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = 110
    const o2 = ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = 110 * 1.0045
    const o3 = ctx.createOscillator()
    o3.type = 'sine'
    o3.frequency.value = 220.6
    const g3 = ctx.createGain()
    g3.gain.value = 0.28
    o1.connect(lp)
    o2.connect(lp)
    o3.connect(g3)
    g3.connect(lp)
    lp.connect(g)
    g.connect(ctx.destination)
    o1.start(); o2.start(); o3.start()
    this.ambient = { g, o1, o2, o3 }
  },
  setAmbientLevel(level: number): void {
    if (!this.ambient || !this.ctx) return
    this.ambient.g.gain.setTargetAtTime(0.02 + level * 0.05, this.ctx.currentTime, 0.35)
  },
  stopAmbient(): void {
    if (!this.ambient || !this.ctx) return
    const { g, o1, o2, o3 } = this.ambient
    g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2)
    setTimeout(() => { try { o1.stop(); o2.stop(); o3.stop() } catch { /* gone */ } }, 700)
    this.ambient = null
  },
}

/** Legacy stored ids from the old engine land on their nearest technique. */
function resolveTech(id: string, custom: CustomPhases): Technique {
  const direct = techniqueById(id, custom)
  if (direct) return direct
  const legacy: Record<string, string> = { extend: 'marea', extended: 'marea', wave: 'sigh', fourseveneight: '478' }
  return techniqueById(legacy[id] ?? 'box', custom) ?? TECHNIQUES[0]
}

/** A technique's geometry in miniature — the card glyph, drawn to scale. */
function MiniGeo({ tech, size = 46 }: { tech: Technique; size?: number }) {
  const g = geoFor(tech)
  const accent = ACCENT_VAR[tech.accent]
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} aria-hidden="true" className="rp2-minigeo">
      {tech.geo === 'hof' ? (
        <>
          <circle cx={C} cy={C} r={96} fill="none" stroke={accent} strokeWidth={10} opacity={0.35} />
          <circle cx={C} cy={C} r={52} fill={accent} opacity={0.55} />
        </>
      ) : g.twin ? (
        <>
          <path d={g.twin.dL} fill="none" stroke={accent} strokeWidth={14} strokeLinecap="round" />
          <path d={g.twin.dR} fill="none" stroke={accent} strokeWidth={14} strokeLinecap="round" opacity={0.5} />
        </>
      ) : (
        <path d={g.d} fill="none" stroke={accent} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function TechCard({ tech, onOpen }: { tech: Technique; onOpen: () => void }) {
  return (
    <button className="rp2-card" onClick={onOpen}>
      <span className="glyph"><MiniGeo tech={tech} /></span>
      <span className="mid">
        <b>{tech.name}</b>
        <i>{tech.sub}</i>
      </span>
      <span className="side">
        <span className="pat">{tech.patternStr}</span>
        <span className="goal">{tech.goal}</span>
      </span>
    </button>
  )
}

const PRACTICE_SECTIONS: readonly [string, string[]][] = [
  ['Down-shift', ['sigh', 'coherent', 'marea', '478']],
  ['Steady & focus', ['box', 'nadi']],
  ['Energise', ['hof']],
  ['Yours', ['custom']],
]

function PracticeTab({ onConfig }: { onConfig: (techId: string) => void }) {
  const st = useStore(respiroStore)
  const last = resolveTech(st.protocolId, st.custom)
  return (
    <div className="rp2">
      <button className="rp2-hero" onClick={() => onConfig(last.id)}>
        <span className="t1">Continue with<br />{last.name}</span>
        <span className="t2">{last.sub}</span>
        <span className="begin">▶ Begin · {last.defDur ?? 2} min</span>
        <span className="heroglyph"><MiniGeo tech={last} size={120} /></span>
      </button>
      {PRACTICE_SECTIONS.map(([title, ids]) => (
        <div key={title}>
          <div className="rp2-seclabel">{title}</div>
          <div className="rp2-cards">
            {ids.map((id) => {
              const t = resolveTech(id, st.custom)
              return <TechCard key={id} tech={t} onOpen={() => onConfig(t.id)} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------------- config sheet (the custom studio lives here) ---------------------- */

export interface SessionCfg { mins: number; rounds: number; breaths: number }

function ConfigSheet({ techId, onStart, onClose }: {
  techId: string | null
  onStart: (tech: Technique, cfg: SessionCfg) => void
  onClose: () => void
}) {
  const st = useStore(respiroStore)
  const tech = techId ? resolveTech(techId, st.custom) : null
  const [mins, setMins] = useState(3)
  const [rounds, setRounds] = useState(3)
  const [breaths, setBreaths] = useState(30)
  useEffect(() => {
    if (tech) {
      setMins(tech.defDur ?? 3)
      setRounds(tech.defRounds ?? 3)
      setBreaths(tech.defBreaths ?? 30)
    }
  }, [techId])

  const CUSTOM_FIELDS: readonly { k: keyof CustomPhases; label: string }[] = [
    { k: 'inS', label: 'Inhale' }, { k: 'hold1', label: 'Hold' }, { k: 'outS', label: 'Exhale' }, { k: 'hold2', label: 'Hold empty' },
  ]

  return (
    <Sheet open={tech !== null} title={tech?.name ?? ''} onClose={onClose}>
      {tech && (
        <div className="rp2">
          <div className="rp2-cfgeo"><MiniGeo tech={tech} size={132} /><span className="pat">{tech.patternStr}{tech.pattern ? ' s' : ''}</span></div>
          <p className="guide-p">{tech.desc}</p>
          {tech.custom && (
            <div className="rp2-studio">
              {CUSTOM_FIELDS.map((f) => (
                <label key={f.k} className="ph">
                  <span>{f.label}</span>
                  <span className="step">
                    <button onClick={() => setCustom({ [f.k]: Math.max(0, st.custom[f.k] - 1) })} aria-label={`Less ${f.label}`}>−</button>
                    <b className="num">{st.custom[f.k]}s</b>
                    <button onClick={() => setCustom({ [f.k]: Math.min(20, st.custom[f.k] + 1) })} aria-label={`More ${f.label}`}>+</button>
                  </span>
                </label>
              ))}
              <p className="rs-foot">The shape redraws to scale as you tune it — every side is as long as its phase.</p>
            </div>
          )}
          {tech.pattern ? (
            <>
              <div className="rp2-cflabel">Length</div>
              <div className="rp2-chips">
                {(tech.durations ?? [2, 3, 5]).map((m) => (
                  <button key={m} className={'chip' + (m === mins ? ' on' : '')} onClick={() => setMins(m)}>{m} min</button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="rp2-cflabel">Rounds</div>
              <div className="rp2-chips">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} className={'chip' + (r === rounds ? ' on' : '')} onClick={() => setRounds(r)}>{r}</button>
                ))}
              </div>
              <div className="rp2-cflabel">Breaths per round</div>
              <div className="rp2-chips">
                {[20, 25, 30, 35, 40].map((b) => (
                  <button key={b} className={'chip' + (b === breaths ? ' on' : '')} onClick={() => setBreaths(b)}>{b}</button>
                ))}
              </div>
            </>
          )}
          {tech.caution && <div className="rs-warning" style={{ marginTop: 12 }}><b>Read first.</b> {tech.caution}</div>}
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }}
            onClick={() => onStart(tech, { mins, rounds, breaths })}>
            ▶ Begin
          </button>
        </div>
      )}
    </Sheet>
  )
}

/* ---------------------- the session ---------------------- */

export interface SessionRec {
  techId: string
  name: string
  mins: number
  cycles: number
  holds?: number[]
}

interface HofState {
  round: number
  stage: 'breathe' | 'retain' | 'recover'
  repIx: number
  stageStart: number
  lastRetain: number
  best: number[]
}

function SessionOverlay({ tech, cfg, onDone }: {
  tech: Technique
  cfg: SessionCfg
  onDone: (rec: SessionRec | null) => void
}) {
  const geo = useMemo(() => geoFor(tech), [tech])
  const accent = ACCENT_VAR[tech.accent]
  const isHof = tech.geo === 'hof'
  const [paused, setPaused] = useState(false)
  const [retaining, setRetaining] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const litRef = useRef<SVGPathElement>(null)
  const chanL = useRef<SVGPathElement>(null)
  const chanR = useRef<SVGPathElement>(null)
  const nosL = useRef<SVGTextElement>(null)
  const nosR = useRef<SVGTextElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const haloRef = useRef<SVGCircleElement>(null)
  const coreRef = useRef<SVGCircleElement>(null)
  const glowRef = useRef<SVGCircleElement>(null)
  const numRef = useRef<SVGTextElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const elRef = useRef<HTMLSpanElement>(null)
  const cyRef = useRef<HTMLSpanElement>(null)
  const leftRef = useRef<HTMLSpanElement>(null)

  const eng = useRef({
    startTs: 0, pausedTotal: 0, pauseTs: 0, raf: 0,
    preRoll: 3.5, pathLen: 1000, twinLen: { L: 300, R: 300 },
    segs: [] as Seg[], cycleDur: 0, totalDur: 0,
    lastPhaseIx: -1, lastCycle: -1,
    hof: null as HofState | null,
    wake: null as { release: () => Promise<void> } | null,
    done: false,
  })

  useEffect(() => {
    const E = eng.current
    if (tech.pattern) {
      const b = buildSegs(tech.pattern)
      E.segs = b.segs
      E.cycleDur = b.cycleDur
      E.totalDur = cfg.mins * 60
    } else {
      E.hof = { round: 1, stage: 'breathe', repIx: -1, stageStart: 0, lastRetain: 0, best: [] }
    }
    try { E.pathLen = litRef.current?.getTotalLength() ?? 1000 } catch { E.pathLen = 1000 }
    try {
      E.twinLen = { L: chanL.current?.getTotalLength() ?? 300, R: chanR.current?.getTotalLength() ?? 300 }
    } catch { /* keep defaults */ }
    if (litRef.current && !geo.twin) {
      litRef.current.style.strokeDasharray = String(E.pathLen)
      litRef.current.style.strokeDashoffset = String(E.pathLen)
    }
    AudioEngineR.ensure()
    AudioEngineR.startAmbient()
    try {
      const nl = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }
      nl.wakeLock?.request('screen').then((wl) => { E.wake = wl }).catch(() => undefined)
    } catch { /* no wake lock */ }
    document.body.style.overflow = 'hidden'
    E.startTs = performance.now()
    E.raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(E.raf)
      AudioEngineR.stopAmbient()
      E.wake?.release().catch(() => undefined)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function now(): number {
    const E = eng.current
    return (performance.now() - E.startTs - E.pausedTotal) / 1000
  }
  const set = (el: { current: SVGElement | null }, attr: string, v: string | number) => el.current?.setAttribute(attr, String(v))
  const txt = (el: { current: { textContent: string | null } | null }, v: string) => { if (el.current) el.current.textContent = v }

  function tick(): void {
    const E = eng.current
    if (E.done) return
    if (E.pauseTs) { E.raf = requestAnimationFrame(tick); return }
    const t = now()
    if (t < E.preRoll) {
      const left = Math.ceil(E.preRoll - t)
      txt(labelRef, 'Settle in')
      txt(countRef, String(left))
      set(numRef, 'opacity', 1)
      txt(numRef, String(left))
      E.raf = requestAnimationFrame(tick)
      return
    }
    set(numRef, 'opacity', 0)
    const e = t - E.preRoll
    if (tech.pattern) tickPattern(e)
    else tickHof(e)
    if (!E.done) E.raf = requestAnimationFrame(tick)
  }

  function tickPattern(e: number): void {
    const E = eng.current
    if (e >= E.totalDur) { finish(false); return }
    const cycle = Math.floor(e / E.cycleDur)
    const cp = (e % E.cycleDur) / E.cycleDur
    const { seg, ix, pp } = segAt(E.segs, cp)
    if (ix !== E.lastPhaseIx || cycle !== E.lastCycle) {
      E.lastPhaseIx = ix
      E.lastCycle = cycle
      AudioEngineR.chime(seg.k)
      buzz(seg.k === 'in' || seg.k === 'in2' ? [35] : seg.k === 'out' ? [70] : [15, 50, 15])
      let label = PHASE_LABEL[seg.k]
      if (tech.nostril && seg.k !== 'hold') label += ' — ' + (tech.nostril[ix] === 'L' ? 'left' : 'right')
      txt(labelRef, label)
      if (labelRef.current) labelRef.current.style.color = PHASE_COLOR[seg.k]
      if (tech.nostril) {
        const side = tech.nostril[ix]
        set(chanL, 'stroke', side === 'L' ? 'var(--rp-brass)' : 'var(--rp-line2)')
        set(chanR, 'stroke', side === 'R' ? 'var(--rp-brass)' : 'var(--rp-line2)')
        set(nosL, 'fill', side === 'L' ? 'var(--rp-brass)' : 'var(--rp-faint)')
        set(nosR, 'fill', side === 'R' ? 'var(--rp-brass)' : 'var(--rp-faint)')
      }
    }
    txt(countRef, Math.ceil(seg.d - pp * seg.d) + 's')
    let pt: { x: number; y: number } = { x: C, y: C }
    if (geo.twin && tech.nostril) {
      const side = tech.nostril[ix]
      const going = seg.k === 'in' || seg.k === 'in2'
      try {
        if (seg.k === 'hold' || seg.k === 'hold2') pt = { x: C, y: 74 }
        else if (side === 'L') pt = chanL.current!.getPointAtLength(E.twinLen.L * (going ? easeInOut(pp) : 1 - easeInOut(pp)))
        else pt = chanR.current!.getPointAtLength(E.twinLen.R * (going ? 1 - easeInOut(pp) : easeInOut(pp)))
      } catch { pt = { x: C, y: C } }
    } else {
      try { pt = litRef.current!.getPointAtLength(E.pathLen * cp) } catch { pt = { x: C, y: C } }
      if (litRef.current) litRef.current.style.strokeDashoffset = String(E.pathLen * (1 - cp))
    }
    set(dotRef, 'cx', pt.x); set(dotRef, 'cy', pt.y)
    set(haloRef, 'cx', pt.x); set(haloRef, 'cy', pt.y)
    const hasIn2 = E.segs.some((s) => s.k === 'in2')
    const lvl = seg.k === 'in' && hasIn2 ? 0.55 * easeInOut(pp) : breathLevel(seg.k, pp)
    set(coreRef, 'r', Math.max(8, (26 + lvl * 78) * 0.14))
    set(glowRef, 'r', 40 + lvl * 95)
    set(glowRef, 'opacity', 0.25 + lvl * 0.55)
    AudioEngineR.setAmbientLevel(lvl)
    if (barRef.current) barRef.current.style.width = Math.min(100, (e / E.totalDur) * 100) + '%'
    txt(elRef, fmtSec(e))
    txt(leftRef, '-' + fmtSec(E.totalDur - e))
    txt(cyRef, 'cycle ' + (cycle + 1))
  }

  function hofSetStage(stage: HofState['stage'], e: number): void {
    const E = eng.current
    const h = E.hof!
    if (h.stage === 'retain') h.lastRetain = e - h.stageStart
    h.stage = stage
    h.stageStart = e
    h.repIx = -1
    setRetaining(stage === 'retain')
    AudioEngineR.chime(stage === 'breathe' ? 'in' : stage === 'retain' ? 'hold2' : 'in')
    buzz([50, 60, 50])
  }

  function tickHof(e: number): void {
    const E = eng.current
    const h = E.hof!
    const stageT = e - h.stageStart
    if (h.stage === 'breathe') {
      const per = 3.0
      const rep = Math.floor(stageT / per)
      if (rep >= cfg.breaths) { hofSetStage('retain', e); return }
      const p = (stageT % per) / per
      const inhale = p < 0.5667
      const pp = inhale ? p / 0.5667 : (p - 0.5667) / 0.4333
      if (rep !== h.repIx) { h.repIx = rep; buzz([20]) }
      const lvl = inhale ? easeInOut(pp) : 1 - easeInOut(pp)
      set(glowRef, 'r', 40 + lvl * 95)
      set(glowRef, 'opacity', 0.25 + lvl * 0.55)
      set(coreRef, 'r', 8 + lvl * 10)
      txt(labelRef, inhale ? 'Breathe in' : 'Let go')
      if (labelRef.current) labelRef.current.style.color = inhale ? 'var(--rp-coral)' : 'var(--rp-dim)'
      txt(countRef, `round ${h.round} · breath ${rep + 1} / ${cfg.breaths}`)
      set(numRef, 'opacity', 1)
      txt(numRef, String(rep + 1))
      AudioEngineR.setAmbientLevel(lvl)
    } else if (h.stage === 'retain') {
      txt(labelRef, 'Hold — empty lungs')
      if (labelRef.current) labelRef.current.style.color = 'var(--rp-moon)'
      txt(countRef, 'tap the button when you need air')
      set(numRef, 'opacity', 1)
      txt(numRef, fmtSec(stageT))
      const pulse = 0.5 + 0.5 * Math.sin(stageT * 1.6)
      set(glowRef, 'r', 46 + pulse * 14)
      set(glowRef, 'opacity', 0.22 + pulse * 0.15)
    } else {
      const left = 15 - stageT
      if (left <= 0) {
        h.best.push(h.lastRetain || 0)
        if (h.round >= cfg.rounds) { finish(false); return }
        h.round++
        hofSetStage('breathe', e)
        return
      }
      txt(labelRef, 'Deep inhale — hold')
      if (labelRef.current) labelRef.current.style.color = 'var(--rp-jade)'
      txt(countRef, 'recovery breath')
      set(numRef, 'opacity', 1)
      txt(numRef, String(Math.ceil(left)))
      set(glowRef, 'r', 135)
      set(glowRef, 'opacity', 0.75)
    }
    txt(elRef, fmtSec(e))
    txt(cyRef, `round ${h.round} / ${cfg.rounds}`)
    txt(leftRef, '')
    const roundFrac = (h.round - 1 + (h.stage === 'breathe' ? Math.min(1, stageT / (cfg.breaths * 3)) * 0.6 : h.stage === 'retain' ? 0.75 : 0.9)) / cfg.rounds
    if (barRef.current) barRef.current.style.width = Math.min(100, roundFrac * 100) + '%'
  }

  function hofTap(): void {
    const E = eng.current
    if (E.hof && E.hof.stage === 'retain') hofSetStage('recover', now() - E.preRoll)
  }
  function togglePause(): void {
    const E = eng.current
    if (E.pauseTs) {
      E.pausedTotal += performance.now() - E.pauseTs
      E.pauseTs = 0
      setPaused(false)
    } else {
      E.pauseTs = performance.now()
      setPaused(true)
      AudioEngineR.setAmbientLevel(0)
    }
  }
  function finish(early: boolean): void {
    const E = eng.current
    if (E.done) return
    E.done = true
    const e = Math.max(0, now() - E.preRoll)
    const mins = e / 60
    if (mins >= 0.5) {
      const holds = isHof && E.hof ? E.hof.best.map((v) => Math.round(v)) : undefined
      const rec: SessionRec = {
        techId: tech.id, name: tech.name,
        mins: Math.round(mins * 10) / 10,
        cycles: tech.pattern ? E.lastCycle + 1 : (E.hof?.round ?? 0),
        holds,
      }
      logEvent({ module: 'respiro', kind: 'session', ts: Date.now(), value: rec.mins, unit: 'min', meta: { techId: rec.techId, name: rec.name, cycles: rec.cycles } })
      if (holds && holds.length > 0) recordHold(Math.max(...holds))
      AudioEngineR.chime('done')
      buzz([60, 80, 60, 80, 120])
      onDone(rec)
    } else {
      toast(early ? 'Session ended' : 'Done')
      onDone(null)
    }
  }

  return (
    <div className="rp2 rp2-sess">
      <div className="top">
        <button className="icon" onClick={() => setConfirmEnd(true)} aria-label="Close">✕</button>
        <div className="title">
          <div className="t1">{tech.name}</div>
          <div className="t2">{tech.pattern ? tech.patternStr + ' s' : `${cfg.rounds} rounds · ${cfg.breaths} breaths`}</div>
        </div>
        <span className="icon ghost" aria-hidden="true" />
      </div>
      <div className="stagewrap">
        <svg viewBox={`0 0 ${VB} ${VB}`} aria-hidden="true">
          <defs>
            <radialGradient id="rpCore" cx="50%" cy="46%" r="60%">
              <stop offset="0%" stopColor={tech.accent === 'coral' ? '#E8A38F' : '#9FE3CC'} stopOpacity="0.9" />
              <stop offset="55%" stopColor={tech.accent === 'coral' ? '#C77862' : '#54B99A'} stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--rp-ink)" stopOpacity="0" />
            </radialGradient>
            <filter id="rpSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <circle ref={glowRef} cx={C} cy={C} r={120} fill="url(#rpCore)" opacity={0} />
          <circle ref={coreRef} cx={C} cy={C} r={8} fill={accent} opacity={0.9} />
          {!geo.twin && !isHof && (
            <path d={geo.d} fill="none" stroke="var(--rp-line2)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {geo.ticks?.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="var(--rp-line2)" strokeWidth={3} strokeLinecap="round" />
          ))}
          {geo.verts?.map((v, i) => (
            <circle key={i} cx={v.x} cy={v.y} r={4.5} fill="var(--rp-ink2)" stroke="var(--rp-line2)" strokeWidth={2} />
          ))}
          {geo.twin && (
            <>
              <path ref={chanL} d={geo.twin.dL} fill="none" stroke="var(--rp-line2)" strokeWidth={3} strokeLinecap="round" />
              <path ref={chanR} d={geo.twin.dR} fill="none" stroke="var(--rp-line2)" strokeWidth={3} strokeLinecap="round" />
              <text ref={nosL} x={C - 108} y={290} fill="var(--rp-faint)" fontSize={13} className="mono" textAnchor="middle">L</text>
              <text ref={nosR} x={C + 108} y={290} fill="var(--rp-faint)" fontSize={13} className="mono" textAnchor="middle">R</text>
            </>
          )}
          {!isHof && (
            <path ref={litRef} d={geo.d} fill="none" stroke={accent} strokeWidth={3.5}
              strokeLinecap="round" strokeLinejoin="round" opacity={0.95}
              style={geo.twin ? { display: 'none' } : undefined} />
          )}
          {!isHof && !geo.twin && <circle ref={haloRef} r={14} fill={accent} opacity={0.25} filter="url(#rpSoft)" />}
          {!isHof && <circle ref={dotRef} r={7} fill="#F2FBF6" stroke={accent} strokeWidth={3} style={geo.twin ? undefined : undefined} />}
          <text ref={numRef} x={C} y={C + 16} textAnchor="middle" className="mono num" fontSize={46} fontWeight={600} fill="var(--rp-text)" opacity={0} />
        </svg>
        <div className="phaselabel" ref={labelRef}>Settle in</div>
        <div className="phasecount" ref={countRef}>&nbsp;</div>
      </div>
      <div className="bottom">
        <div className="stats"><span ref={elRef}>0:00</span><span ref={cyRef} /><span ref={leftRef} /></div>
        <div className="bar"><i ref={barRef} /></div>
        <div className="ctrl">
          <button className="pill" onClick={togglePause}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
          {retaining && <button className="pill primary" onClick={hofTap}>I need to breathe</button>}
          <button className="pill danger" onClick={() => setConfirmEnd(true)}>■ End</button>
        </div>
        {isHof && <div className="hoftap">Sit or lie down. Tap End any time.</div>}
      </div>
      <ConfirmSheet
        open={confirmEnd}
        title="End session?"
        body="Anything over 30 seconds is saved to your history."
        actionLabel="End session"
        danger
        onConfirm={() => finish(true)}
        onClose={() => setConfirmEnd(false)}
      />
    </div>
  )
}

function SummarySheet({ rec, onClose }: { rec: SessionRec | null; onClose: () => void }) {
  return (
    <Sheet open={rec !== null} title="Session complete" onClose={onClose}>
      {rec && (
        <div className="rp2 rp2-sum">
          <div className="big">{rec.mins}<small> min</small></div>
          <div className="line">{rec.name} · {rec.holds ? `${rec.cycles} round${rec.cycles === 1 ? '' : 's'}` : `${rec.cycles} cycle${rec.cycles === 1 ? '' : 's'}`}</div>
          {rec.holds && rec.holds.length > 0 && (
            <div className="holds">Holds: {rec.holds.map((h) => fmtSec(h)).join(' · ')}</div>
          )}
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>Done</button>
        </div>
      )}
    </Sheet>
  )
}

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

function ToolsTab({ onDock }: { onDock: (i: SoundItem) => void }) {
  const st = useStore(respiroStore)
  const [libUrl, setLibUrl] = useState('')
  const [libName, setLibName] = useState('')
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
          <span className="label" style={{ color: 'var(--m-respiro)' }}>Sound library</span>
        </div>
        <p className="rs-foot" style={{ marginBottom: 10 }}>
          Save Spotify or YouTube links — guided meditations, drones, whatever carries you.
          Tap ▶ to dock the player above the tab bar; it keeps playing while you practise.
          YouTube plays full-length; Spotify plays full tracks only with a Spotify login in this browser.
        </p>
        <input
          className="tinput"
          placeholder="Paste a Spotify or YouTube link…"
          value={libUrl}
          onChange={(e) => setLibUrl(e.target.value)}
        />
        <input
          className="tinput"
          style={{ marginTop: 8 }}
          placeholder="Name (optional)"
          value={libName}
          onChange={(e) => setLibName(e.target.value)}
        />
        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: 10 }}
          onClick={() => {
            const item = addSoundItem(libUrl, libName)
            if (!item) {
              toast('That link is neither Spotify nor YouTube')
              return
            }
            setLibUrl('')
            setLibName('')
            toast('Saved to library')
          }}
        >
          + Save to library
        </button>
        {st.soundLibrary.length > 0 && (
          <div className="rp2-liblist">
            {st.soundLibrary.map((item) => (
              <div key={item.id} className="rp2-libitem">
                <span className={'kind ' + item.kind}>{item.kind === 'youtube' ? 'YT' : 'SP'}</span>
                <span className="nm">{item.name}</span>
                <button className="play" onClick={() => onDock(item)} aria-label={`Play ${item.name}`}>▶</button>
                <button className="rm" onClick={() => removeSoundItem(item.id)} aria-label={`Remove ${item.name}`}>✕</button>
              </div>
            ))}
          </div>
        )}
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
  const st = useStore(respiroStore)
  const [config, setConfig] = useState<string | null>(null)
  const [session, setSession] = useState<{ tech: Technique; cfg: SessionCfg } | null>(null)
  const [summary, setSummary] = useState<SessionRec | null>(null)
  const [dock, setDock] = useState<SoundItem | null>(null)

  /* A quick action on Today can request an immediate session. */
  useEffect(() => {
    if (consumeAutostart()) setConfig(respiroStore.get().protocolId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dockRef = dock
    ? dock.kind === 'youtube'
      ? { kind: 'youtube' as const, ref: parseYouTube(dock.url) }
      : { kind: 'spotify' as const, ref: parseSpotify(dock.url) }
    : null

  return (
    <>
      {tab === 'practice' && (
        <PracticeTab
          onConfig={(techId) => {
            selectProtocol(techId)
            setConfig(techId)
          }}
        />
      )}
      {tab === 'progress' && <ProgressTab />}
      {tab === 'sound' && <ToolsTab onDock={setDock} />}

      <ConfigSheet
        techId={config}
        onClose={() => setConfig(null)}
        onStart={(tech, cfg) => {
          setConfig(null)
          setSession({ tech, cfg })
        }}
      />
      {session && (
        <SessionOverlay
          tech={session.tech}
          cfg={session.cfg}
          onDone={(rec) => {
            setSession(null)
            if (rec) setSummary(rec)
          }}
        />
      )}
      <SummarySheet rec={summary} onClose={() => setSummary(null)} />

      {dockRef && dockRef.ref && (
        <div className="rp2 rp2-dock">
          {dockRef.kind === 'youtube' ? (
            <iframe
              className="yt"
              src={youtubeEmbedUrl(dockRef.ref)}
              allow="autoplay; encrypted-media; picture-in-picture"
              title="YouTube player"
            />
          ) : (
            <iframe
              className="sp"
              src={spotifyEmbedUrl(dockRef.ref)}
              height={80}
              allow="encrypted-media"
              title="Spotify player"
            />
          )}
          <button className="close" onClick={() => setDock(null)} aria-label="Close player">✕</button>
        </div>
      )}
    </>
  )
}

/**
 * GROVE — prototype-faithful rebuild inside the 1% shell.
 * Brass focus / eucalyptus breaks, machined bezel dial, one-off round
 * lengths, cycle dots, keyboard control, a grove that grows in real time,
 * and an isometric forest with drag, swap, shuffle and roaming companions.
 * Kept from the app: 4-tab structure, breaks-grow-nothing, continuous
 * placement. All classes gv2-*.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, CSSProperties, PointerEvent as RPointerEvent } from 'react'
import { useStore } from '../../core/hooks'
import { toast } from '../../core/toast'
import { dayKey, todayKey } from '../../core/dates'
import {
  groveStore,
  minutesFor,
  setMode,
  setRoundMinutes,
  setModeDefault,
  updateFlow,
  start,
  pause,
  resume,
  reset,
  giveUp,
  maybeComplete,
  skipPhase,
  progress,
  remainingMs,
  addTask,
  setActiveTask,
  toggleFinished,
  removeTask,
  reshuffle,
  plantUV,
  swapPlants,
  movePlant,
  kindForFocus,
  todayStats,
  focusDayStreak,
  totalFocusMinutes,
  unlockedAnimals,
  nextAnimal,
  seedDemo,
  removeDemo,
  hasDemo,
  resetAll,
  migrateGrove,
  ANIMALS,
  MODES,
  MODE_PRESETS,
  type GroveState,
  type Mode,
  type CompletionEvent,
} from './model'
import { ArtDefs, PlantInner, PlantSprite, AnimalInner, AnimalSprite, type AnimalId } from './Art'

const MODE_LABEL: Record<Mode, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' }

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

function useNow(active: boolean, everyMs = 250): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [active, everyMs])
  return now
}

/* ------------------------- signals (chime, notify) ------------------------- */

let AC: AudioContext | null = null
export function primeAudio(): void {
  const st = groveStore.get()
  if (!AC && st.settings.sound) {
    try {
      AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch { /* no audio available */ }
  }
  if (AC && AC.state === 'suspended') void AC.resume()
}
function chime(kind: 'focus' | 'break'): void {
  if (!groveStore.get().settings.sound || !AC) return
  const notes = kind === 'focus' ? [660, 880, 1108] : [523, 659]
  const t0 = AC.currentTime
  notes.forEach((f, i) => {
    const o = AC!.createOscillator()
    const g = AC!.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(0, t0 + i * 0.16)
    g.gain.linearRampToValueAtTime(0.22, t0 + i * 0.16 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.16 + 0.9)
    o.connect(g).connect(AC!.destination)
    o.start(t0 + i * 0.16)
    o.stop(t0 + i * 0.16 + 1)
  })
}
function browserNotify(title: string, body: string): void {
  if (!groveStore.get().settings.notify) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try { new Notification(title, { body, silent: true }) } catch { /* blocked */ }
}

/** One place reacts to a finished phase — chime, notification, toast. */
export function handleCompletion(ev: CompletionEvent): void {
  if (ev.finished === 'focus' && ev.plant) {
    chime('focus')
    browserNotify('Session complete', 'A tree joined your forest. Time for a break.')
    toast(ev.autoStarted ? 'Tree planted — break started' : 'Tree planted — time for a break')
  } else if (ev.finished !== 'focus') {
    chime('break')
    browserNotify('Break over', 'Ready for the next session.')
    toast(ev.autoStarted ? 'Next session started' : 'Ready for the next session')
  }
}

/* ------------------------------ dial ------------------------------ */

const R = 136
const CIRC = 2 * Math.PI * R

function DialTicks() {
  const lines: ReactNode[] = []
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180
    const major = i % 5 === 0
    const r1 = major ? 146 : 150
    const r2 = 156
    lines.push(
      <line key={i}
        x1={(170 + r1 * Math.sin(a)).toFixed(1)} y1={(170 - r1 * Math.cos(a)).toFixed(1)}
        x2={(170 + r2 * Math.sin(a)).toFixed(1)} y2={(170 - r2 * Math.cos(a)).toFixed(1)}
        stroke={major ? 'var(--gv-faint)' : 'var(--gv-line2)'} strokeWidth={major ? 2 : 1} strokeLinecap="round" />,
    )
  }
  return <g>{lines}</g>
}

/* ------------------------------ focus tab ------------------------------ */

function FocusTab({ st, now, flashTs }: { st: GroveState; now: number; flashTs: number }) {
  const run = st.running
  const paused = run !== null && run.pausedAt !== null
  const flashing = now - flashTs < 1600

  const mainLabel = run ? (paused ? 'Resume' : 'Pause') : 'Start'
  function onMain() {
    primeAudio()
    if (!run) start()
    else if (paused) resume()
    else pause()
  }
  function onSkip() {
    if (!run) return
    if (run.mode === 'focus') {
      const ev = skipPhase()
      if (ev) toast('Session skipped — nothing planted')
    } else {
      const ev = skipPhase()
      if (ev) handleCompletion(ev)
    }
  }

  /* keyboard — prototype bindings, scoped to this screen */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); onMainRef.current() }
      else if (e.key === 'r' || e.key === 'R') reset()
      else if (e.key === 's' || e.key === 'S') onSkipRef.current()
      else if (e.key === '1') setMode('focus')
      else if (e.key === '2') setMode('short')
      else if (e.key === '3') setMode('long')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  const onMainRef = useRef(onMain)
  const onSkipRef = useRef(onSkip)
  onMainRef.current = onMain
  onSkipRef.current = onSkip

  /* duration chips */
  const curMin = run ? run.minutes : minutesFor(st, st.mode)
  const presets = MODE_PRESETS[st.mode]
  const isPreset = presets.includes(curMin)
  const [editViaChip, setEditViaChip] = useState(0)

  /* today's grove strip */
  const today = todayKey()
  const todaysPlants = useMemo(
    () => st.plants.filter((p) => dayKey(p.ts) === today).slice(0, 12).reverse(),
    [st.plants, today],
  )
  const growing = run !== null && run.mode === 'focus'
  const growP = run && growing ? progress(run, now) : 0

  return (
    <div className={'gv2 gv2-focus' + (st.mode !== 'focus' ? ' gv2-break' : '')}>
      <div className={'gv2-card gv2-timercard' + (flashing ? ' flash' : '')}>
        <div className="gv2-modes" role="tablist" aria-label="Timer mode">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-pressed={st.mode === m.id}
              onClick={() => { if (!run) setMode(m.id) }}>{m.label}</button>
          ))}
        </div>

        <div className={'gv2-chips' + (run ? ' locked' : '')} aria-label="Length presets">
          {presets.map((m) => (
            <button key={m} className={'chip' + (m === curMin ? ' on' : '')}
              onClick={() => setRoundMinutes(st.mode, m)} title={`${m} minutes`}>{m}m</button>
          ))}
          <button className={'chip custom' + (isPreset ? '' : ' on')}
            onClick={() => setEditViaChip((n) => n + 1)} title="Type any length">
            ✎ {isPreset ? 'custom' : curMin + 'm'}
          </button>
        </div>

        <DialWithChipEdit st={st} now={now} editSignal={editViaChip} />

        <div className="gv2-cycle" aria-label="Cycle progress"
          title={`${st.cyclePos} of ${st.settings.longEvery} sessions toward a long break`}>
          {Array.from({ length: st.settings.longEvery }).map((_, i) => (
            <span key={i} className={
              'dot' + (i < st.cyclePos ? ' done' : i === st.cyclePos && st.mode === 'focus' ? ' now' : '')
            } />
          ))}
        </div>

        <div className="gv2-controls">
          <button className="gv2-iconbtn" onClick={() => { if (run) reset(); }} title="Reset (R)" aria-label="Reset timer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
          </button>
          <button className="gv2-mainbtn" onClick={onMain}>{mainLabel}</button>
          <button className="gv2-iconbtn" onClick={onSkip} title="Skip (S)" aria-label="Skip to next phase">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4l10 8-10 8V4z" /><path d="M19 5v14" /></svg>
          </button>
        </div>
        {run && run.mode === 'focus' && (
          <button className="gv2-giveup" onClick={() => { giveUp(); toast('Session abandoned — the tree withered') }}>
            Give up — the tree withers
          </button>
        )}
        <p className="gv2-kbd"><kbd>space</kbd> start · pause &nbsp; <kbd>R</kbd> reset &nbsp; <kbd>S</kbd> skip &nbsp; <kbd>1·2·3</kbd> mode</p>

        <div className="gv2-grove">
          <div className="g-label">Today's grove</div>
          <div className="gv2-groverow">
            {todaysPlants.map((p, i) => (
              <PlantSprite key={p.id} kind={p.kind} p={1} h={46} prefix={'gr' + i}
                title={`${p.minutes} min session · ${new Date(p.ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`} />
            ))}
            {growing && run && (
              <PlantSprite kind={kindForFocus(run.minutes)} p={growP} h={46} prefix="grow"
                title={`Growing… ${Math.round(growP * 100)}%`} />
            )}
            {todaysPlants.length === 0 && !growing && (
              <span className="placeholder">Finish a focus session to grow your first tree of the day</span>
            )}
          </div>
        </div>
      </div>

      <StatsCard st={st} />
    </div>
  )
}

/** Bridges the ✎ custom chip to the dial's inline editor. */
function DialWithChipEdit({ st, now, editSignal }: { st: GroveState; now: number; editSignal: number }) {
  const seen = useRef(0)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (editSignal > seen.current && !st.running) {
      seen.current = editSignal
      setEditing(true)
    }
  }, [editSignal, st.running])
  return (
    <DialView st={st} now={now} editing={editing} setEditing={setEditing}
      onCommit={(m) => setRoundMinutes(st.mode, m)} />
  )
}

function DialView({ st, now, editing, setEditing, onCommit }: {
  st: GroveState; now: number; editing: boolean; setEditing: (b: boolean) => void; onCommit: (m: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const run = st.running
  const totalMs = (run ? run.minutes : minutesFor(st, st.mode)) * 60_000
  const leftMs = run ? remainingMs(run, now) : totalMs
  const frac = totalMs > 0 ? Math.min(1, Math.max(0, leftMs / totalMs)) : 0
  const activeTask = st.tasks.find((t) => t.id === st.activeTaskId && !t.finished)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    const v = parseInt(inputRef.current?.value ?? '', 10)
    setEditing(false)
    if (Number.isFinite(v)) onCommit(v)
  }

  return (
    <div className="gv2-dialwrap">
      <div className="gv2-bezel" aria-hidden="true" />
      <svg viewBox="0 0 340 340" aria-hidden="true">
        <DialTicks />
        <circle cx="170" cy="170" r={R} fill="none" stroke="var(--gv-line)" strokeWidth="5" />
        <circle cx="170" cy="170" r={R} fill="none" stroke="var(--gv-mode)" strokeWidth="5"
          strokeLinecap="round" transform="rotate(-90 170 170)"
          strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)}
          style={{ filter: 'drop-shadow(0 0 6px var(--gv-mode-glow))', transition: 'stroke-dashoffset 0.25s linear' }} />
      </svg>
      <div className="gv2-digits">
        {editing && !run ? (
          <div className="time">
            <input ref={inputRef} type="number" min={1} max={180}
              defaultValue={Math.round(totalMs / 60_000)} aria-label="Custom minutes"
              onBlur={commit}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') setEditing(false)
              }} />
          </div>
        ) : (
          <div className={'time' + (run ? '' : ' editable')} role="timer"
            onClick={() => { if (!run) setEditing(true) }}
            title={run ? undefined : 'Click to type any length'}>
            {fmtClock(leftMs)}
          </div>
        )}
        <div className="phase">
          {st.mode === 'focus'
            ? `Focus · session ${Math.min(st.cyclePos + 1, st.settings.longEvery)} of ${st.settings.longEvery}`
            : MODE_LABEL[st.mode]}
        </div>
        {!run && <div className="edit-hint">pick a preset above, or click the time to type</div>}
        {activeTask && st.mode === 'focus' && (
          <div className="task-tag">on <em>{activeTask.name}</em></div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------ stats card ------------------------------ */

function StatsCard({ st }: { st: GroveState }) {
  const today = todayStats(st.plants)
  const streak = focusDayStreak(st.plants)
  const days = useMemo(() => {
    const out: { key: string; label: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = dayKey(d.getTime())
      out.push({
        key,
        label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        count: st.plants.filter((p) => p.kind !== 'flower' && p.kind !== 'fern' && dayKey(p.ts) === key).length,
      })
    }
    return out
  }, [st.plants])
  const max = Math.max(4, ...days.map((d) => d.count))
  const W = 280, H = 86, bw = W / 14

  return (
    <div className="gv2-card gv2-stats">
      <h2>Today &amp; trends</h2>
      <div className="body">
        <div className="gv2-statrow">
          <div className="stat"><div className="v">{today.count}</div><div className="l">Sessions today</div></div>
          <div className="stat"><div className="v">{today.minutes}<span>m</span></div><div className="l">Minutes today</div></div>
          <div className="stat"><div className="v">{streak}<span>d</span></div><div className="l">Day streak</div></div>
        </div>
        <div className="gv2-chartwrap">
          <div className="title">Sessions · last 14 days</div>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sessions per day, last 14 days">
            {days.map((d, i) => {
              const h = d.count ? Math.max(3, (d.count / max) * (H - 26)) : 2
              const x = i * bw + 5
              const y = H - 20 - h
              const isToday = i === 13
              return (
                <g key={d.key}>
                  <rect x={x} y={y} width={bw - 8} height={h} rx={2.5}
                    fill={d.count ? (isToday ? 'var(--gv-brass)' : 'var(--gv-brass-mid)') : 'var(--gv-line)'}>
                    <title>{d.count} session{d.count === 1 ? '' : 's'}</title>
                  </rect>
                  {d.count > 0 && (
                    <text x={x + (bw - 8) / 2} y={y - 4} textAnchor="middle" className="cnt">{d.count}</text>
                  )}
                  <text x={x + (bw - 8) / 2} y={H - 7} textAnchor="middle" className="lbl">{d.label}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ tasks tab ------------------------------ */

function TasksTab({ st }: { st: GroveState }) {
  const [name, setName] = useState('')
  const [est, setEst] = useState(1)
  const open = st.tasks.filter((t) => !t.finished).length

  function submit() {
    const n = name.trim()
    if (!n) return
    addTask(n, est)
    setName('')
    setEst(1)
  }

  return (
    <div className="gv2 gv2-page">
      <div className="gv2-card gv2-tasks">
        <h2>Tasks {st.tasks.length > 0 && <span className="count">{open} open</span>}</h2>
        <div className="body">
          <div className="gv2-taskadd">
            <input type="text" value={name} maxLength={80} placeholder="What are you working on?"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
            <div className="est" title="How many focus sessions you plan for this task">
              <button onClick={() => setEst((v) => Math.max(1, v - 1))} aria-label="Fewer planned sessions">−</button>
              <span>{est}</span>
              <button onClick={() => setEst((v) => Math.min(20, v + 1))} aria-label="More planned sessions">+</button>
            </div>
            <button className="add" onClick={submit} aria-label="Add task">+</button>
          </div>
          <p className="gv2-taskhelp">
            Tap a task to make it <b>active</b> — every focus session you finish counts toward it
            (done / planned). The checkbox just marks the task finished.
          </p>
          <div className="gv2-tasklist">
            {st.tasks.map((t) => (
              <div key={t.id}
                className={'gv2-task' + (t.finished ? ' done' : '') + (t.id === st.activeTaskId ? ' active' : '')}
                onClick={() => setActiveTask(st.activeTaskId === t.id ? null : t.id)}
                title={t.id === st.activeTaskId ? 'Active — finished sessions count toward this task' : 'Tap to make this the active task'}>
                <button className="check" aria-label="Mark task finished"
                  onClick={(e) => { e.stopPropagation(); toggleFinished(t.id) }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </button>
                <span className="name">{t.name}</span>
                <span className="sessions" title="Focus sessions finished on this task / planned">
                  <b>{t.done}</b>/{t.planned} sessions
                </span>
                <button className="del" aria-label="Delete task"
                  onClick={(e) => { e.stopPropagation(); removeTask(t.id) }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14" /></svg>
                </button>
              </div>
            ))}
            {st.tasks.length === 0 && <div className="gv2-empty">No tasks yet — add one above.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ forest tab ------------------------------ */

type Span = 'week' | 'month' | 'year' | 'all'
const SPANS: readonly { id: Span; label: string; days: number | null }[] = [
  { id: 'week', label: 'Week', days: 7 },
  { id: 'month', label: 'Month', days: 30 },
  { id: 'year', label: 'Year', days: 365 },
  { id: 'all', label: 'All', days: null },
]

/* iso geometry — prototype constants */
const GRID = 12
const TW = 22
const TH = 11
const ISO_X0 = 310
const ISO_Y0 = 58

function uvToIso(u: number, v: number): [number, number] {
  const gx = u * (GRID - 1)
  const gy = v * (GRID - 1)
  return [ISO_X0 + (gx - gy) * TW, ISO_Y0 + (gx + gy) * TH]
}
function pointToUV(svg: SVGSVGElement, clientX: number, clientY: number): [number, number] | null {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const p = pt.matrixTransform(ctm.inverse())
  const rx = p.x - ISO_X0
  const ry = p.y - ISO_Y0
  const gx = (rx / TW + ry / TH) / 2
  const gy = (ry / TH - rx / TW) / 2
  if (gx < -0.6 || gy < -0.6 || gx > GRID - 0.4 || gy > GRID - 0.4) return null
  return [Math.min(1, Math.max(0, gx / (GRID - 1))), Math.min(1, Math.max(0, gy / (GRID - 1)))]
}

const ANIMAL_IDS: Partial<Record<string, AnimalId>> = { Rabbit: 'rabbit', Fox: 'fox', Deer: 'deer', Bear: 'bear', Owl: 'owl' }

function ForestTab({ st }: { st: GroveState }) {
  const [span, setSpan] = useState<Span>('week')
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ id: string; u: number; v: number } | null>(null)

  const inRange = useMemo(() => {
    const def = SPANS.find((s) => s.id === span)!
    if (def.days === null) return st.plants
    const cutoff = Date.now() - def.days * 86400000
    return st.plants.filter((p) => p.ts >= cutoff)
  }, [st.plants, span])

  const focusIn = inRange.filter((p) => p.kind !== 'flower' && p.kind !== 'fern')
  const mins = focusIn.reduce((a, p) => a + p.minutes, 0)
  const shown = useMemo(() => {
    const withUV = inRange.slice(0, 140).map((p) => {
      const uv = drag && drag.id === p.id ? { u: drag.u, v: drag.v } : plantUV(st, p.id)
      return { p, ...uv }
    })
    return withUV.sort((a, b) => (a.u + a.v) - (b.u + b.v) || a.u - b.u)
  }, [inRange, st, drag])

  /* companions */
  const unlocked = unlockedAnimals(st.plants)
  const next = nextAnimal(st.plants)
  const totalH = totalFocusMinutes(st.plants) / 60
  const [roam, setRoam] = useState<Record<string, { u: number; v: number }>>({})
  useEffect(() => {
    if (unlocked.length === 0) return
    setRoam((r) => {
      const nr = { ...r }
      for (const a of unlocked) if (!nr[a.name]) nr[a.name] = { u: Math.random(), v: Math.random() }
      return nr
    })
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const t = setInterval(() => {
      if (document.hidden) return
      setRoam((r) => {
        const nr: typeof r = {}
        for (const a of unlocked) {
          const cur = r[a.name] ?? { u: Math.random(), v: Math.random() }
          nr[a.name] = {
            u: Math.min(0.95, Math.max(0.05, cur.u + (Math.random() - 0.5) * 0.34)),
            v: Math.min(0.95, Math.max(0.05, cur.v + (Math.random() - 0.5) * 0.34)),
          }
        }
        return nr
      })
    }, 5200)
    return () => clearInterval(t)
  }, [unlocked.length])

  /* drag to rearrange / swap */
  function onPointerDown(e: RPointerEvent<SVGSVGElement>) {
    const g = (e.target as Element).closest('g[data-pid]')
    if (!g || !svgRef.current) return
    const id = g.getAttribute('data-pid')!
    const uv = pointToUV(svgRef.current, e.clientX, e.clientY)
    if (!uv) return
    e.preventDefault()
    svgRef.current.setPointerCapture?.(e.pointerId)
    setDrag({ id, u: uv[0], v: uv[1] })
  }
  function onPointerMove(e: RPointerEvent<SVGSVGElement>) {
    if (!drag || !svgRef.current) return
    const uv = pointToUV(svgRef.current, e.clientX, e.clientY)
    if (!uv) return
    setDrag({ ...drag, u: uv[0], v: uv[1] })
  }
  function onPointerUp() {
    if (!drag) return
    const cellU = 1 / (GRID - 1)
    const other = inRange.find((p) => {
      if (p.id === drag.id) return false
      const uv = plantUV(st, p.id)
      return Math.abs(uv.u - drag.u) < cellU * 0.7 && Math.abs(uv.v - drag.v) < cellU * 0.7
    })
    if (other) swapPlants(drag.id, other.id)
    else movePlant(drag.id, drag.u, drag.v)
    setDrag(null)
  }

  const groundPts = (() => {
    const [tx, ty] = uvToIso(0, 0)
    const [rx, ry] = uvToIso(1, 0)
    const [bx, by] = uvToIso(1, 1)
    const [lx, ly] = uvToIso(0, 1)
    return `${tx},${ty - TH} ${rx + TW},${ry} ${bx},${by + TH} ${lx - TW},${ly}`
  })()

  const emptyCopy = span === 'all'
    ? <>Your forest is empty —<br />every session you finish plants something here.</>
    : <>Nothing planted in the last {span === 'week' ? '7 days' : span === 'month' ? '30 days' : 'year'} yet.<br />Finish a session to start this {span}'s growth.</>

  return (
    <div className="gv2 gv2-page">
      <div className="gv2-card gv2-forest">
        <div className="gv2-foresthead">
          <div className="title">Your forest
            {inRange.length > 0 && (
              <span className="count">
                {focusIn.length} tree{focusIn.length === 1 ? '' : 's'}
                {inRange.length - focusIn.length > 0 ? ` · ${inRange.length - focusIn.length} flora` : ''}
                {' · '}{Math.floor(mins / 60)}h {mins % 60}m focused
              </span>
            )}
          </div>
          <div className="gv2-ranges" role="tablist" aria-label="Forest time range">
            {SPANS.map((s) => (
              <button key={s.id} aria-pressed={span === s.id} onClick={() => setSpan(s.id)}>{s.label}</button>
            ))}
          </div>
          <div className="tools">
            <span className="hint">drag plants to rearrange · drop on another to swap</span>
            <button className="gv2-toolbtn" onClick={() => { reshuffle(); toast('Forest reshuffled') }} title="Randomise the layout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" /></svg>
              Shuffle
            </button>
          </div>
        </div>

        <div className="gv2-stage">
          <svg ref={svgRef} viewBox="0 0 620 392" aria-label="Isometric forest"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            <defs>
              <radialGradient id="gvGround" cx="50%" cy="38%" r="75%">
                <stop offset="0%" stopColor="var(--gv-ground1)" />
                <stop offset="55%" stopColor="var(--gv-ground2)" />
                <stop offset="100%" stopColor="var(--gv-ground3)" />
              </radialGradient>
            </defs>
            <ArtDefs prefix="iso" />
            <polygon points={groundPts} fill="url(#gvGround)" stroke="var(--gv-line2)" strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 14px 22px rgba(0,0,0,.45))' }} />
            {shown.map(({ p, u, v }) => {
              const [cx, cy] = uvToIso(u, v)
              if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
              const dragging = drag !== null && drag.id === p.id
              const when = new Date(p.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              return (
                <g key={p.id} data-pid={p.id}
                  className={'gv2-plant' + (dragging ? ' dragging' : '')}
                  transform={`translate(${cx},${cy})`}>
                  <title>{`${p.minutes} min focus · ${when} — drag to move`}</title>
                  <ellipse cx="0" cy={TH} rx="12" ry="4.6" fill="#000" opacity="0.28" />
                  <g className="lift" transform={`translate(-15,${TH - 46})`}>
                    <PlantInner kind={p.kind} p={1} prefix="iso" />
                  </g>
                </g>
              )
            })}
            {inRange.length > 0 && unlocked.map((a) => {
              const pos = roam[a.name]
              if (!pos) return null
              const [cx, cy] = uvToIso(pos.u, pos.v)
              if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
              return (
                <g key={a.name} className="gv2-animal"
                  style={{ transform: `translate(${cx}px, ${cy}px)`, transition: 'transform 3.2s ease-in-out' }}>
                  <title>{a.name}</title>
                  <ellipse cx="0" cy={TH} rx="10" ry="3.6" fill="#000" opacity="0.22" />
                  <g transform={`translate(-11,${TH - 17})`}>
                    <AnimalInner id={ANIMAL_IDS[a.name] ?? 'owl'} prefix="iso" />
                  </g>
                </g>
              )
            })}
          </svg>
          {inRange.length === 0 && <div className="gv2-forestempty">{emptyCopy}</div>}
        </div>

        <div className="gv2-forestfoot">
          <div className="legend">
            Focus grows the forest — <b>&lt;10m</b> shrub · <b>10–19m</b> birch · <b>20–39m</b> pine · <b>40m+</b> oak.
            Breaks grow nothing — they're for you, not the grove.
          </div>
          <div className="gv2-companions">
            {ANIMALS.map((a) => (
              <span key={a.name} className={'comp' + (totalH >= a.hours ? '' : ' locked')}
                title={`${a.name} — unlocks at ${a.hours}h of focus`}>
                <AnimalSprite id={ANIMAL_IDS[a.name] ?? 'owl'} prefix={'bad-' + a.name} />
                {a.name}
              </span>
            ))}
            {next ? (
              <span className="next">
                next: <b>{next.animal.name}</b> at {next.animal.hours}h — {Math.floor(next.soFarMin / 60)}h {next.soFarMin % 60}m so far
              </span>
            ) : (
              <span className="next"><b>All companions found</b></span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------- settings (shell slot) -------------------------- */

function Stepper({ value, onDelta, small }: { value: ReactNode; onDelta: (d: number) => void; small?: boolean }) {
  return (
    <div className={'gv2-stepper' + (small ? ' sm' : '')}>
      <button onClick={() => onDelta(-1)} aria-label="Decrease">−</button>
      <span>{value}</span>
      <button onClick={() => onDelta(1)} aria-label="Increase">+</button>
    </div>
  )
}

function Toggle({ on, onFlip }: { on: boolean; onFlip: () => void }) {
  return <button className="gv2-toggle" role="switch" aria-checked={on} onClick={onFlip} />
}

export function GroveSettingsExtra() {
  const st = useStore(groveStore)
  const [confirmErase, setConfirmErase] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function exportData() {
    const blob = new Blob(
      [JSON.stringify({ app: 'grove', version: 3, exported: new Date().toISOString(), data: groveStore.get() }, null, 2)],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `grove-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Backup downloaded')
  }
  function importData(file: File) {
    const r = new FileReader()
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result)) as { data?: unknown }
        /* The migration path doubles as the universal normalizer for imports. */
        groveStore.set(() => migrateGrove(parsed.data ?? parsed, 2))
        toast('Backup restored')
      } catch {
        toast("That file couldn't be read as a Grove backup")
      }
    }
    r.readAsText(file)
  }
  async function flipNotify() {
    if (!('Notification' in window)) { toast("Notifications aren't supported in this browser"); return }
    if (st.settings.notify) { updateFlow({ notify: false }); return }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') { toast('Permission was declined'); updateFlow({ notify: false }); return }
    updateFlow({ notify: true })
  }

  return (
    <div className="gv2 gv2-setx">
      <div className="g-label">Default durations</div>
      <div className="gv2-setrow"><span className="sl">Focus</span><Stepper value={st.focusMin + 'm'} onDelta={(d) => setModeDefault('focus', st.focusMin + d * 5)} /></div>
      <div className="gv2-setrow"><span className="sl">Short break</span><Stepper value={st.shortMin + 'm'} onDelta={(d) => setModeDefault('short', st.shortMin + d)} /></div>
      <div className="gv2-setrow"><span className="sl">Long break</span><Stepper value={st.longMin + 'm'} onDelta={(d) => setModeDefault('long', st.longMin + d)} /></div>
      <div className="gv2-setrow"><span className="sl">Long break after<small>focus sessions per cycle</small></span><Stepper value={st.settings.longEvery} onDelta={(d) => updateFlow({ longEvery: st.settings.longEvery + d })} /></div>

      <div className="g-label">Flow</div>
      <div className="gv2-setrow"><span className="sl">Auto-start breaks<small>break begins when a session ends</small></span><Toggle on={st.settings.autoBreak} onFlip={() => updateFlow({ autoBreak: !st.settings.autoBreak })} /></div>
      <div className="gv2-setrow"><span className="sl">Auto-start focus<small>next session begins when a break ends</small></span><Toggle on={st.settings.autoFocus} onFlip={() => updateFlow({ autoFocus: !st.settings.autoFocus })} /></div>

      <div className="g-label">Signals</div>
      <div className="gv2-setrow"><span className="sl">Chime on completion</span><Toggle on={st.settings.sound} onFlip={() => updateFlow({ sound: !st.settings.sound })} /></div>
      <div className="gv2-setrow"><span className="sl">Browser notification<small>needs permission, works in background tabs</small></span><Toggle on={st.settings.notify} onFlip={() => { void flipNotify() }} /></div>

      <div className="g-label">Data</div>
      <div className="gv2-setbtns">
        {!hasDemo(st) ? (
          <button className="gv2-ghostbtn" onClick={() => { seedDemo(); toast('Sample forest planted') }}>Load sample data</button>
        ) : (
          <button className="gv2-ghostbtn" onClick={() => { removeDemo(); toast('Sample data removed — your real sessions are untouched') }}>Remove sample data</button>
        )}
        <button className="gv2-ghostbtn" onClick={exportData}>Export backup</button>
        <button className="gv2-ghostbtn" onClick={() => fileRef.current?.click()}>Import backup</button>
        <button className={'gv2-ghostbtn danger' + (confirmErase ? ' armed' : '')}
          onClick={() => {
            if (!confirmErase) {
              setConfirmErase(true)
              setTimeout(() => setConfirmErase(false), 3500)
              return
            }
            resetAll()
            setConfirmErase(false)
            toast('All Grove data erased')
          }}>
          {confirmErase ? 'Really erase everything?' : 'Erase all data'}
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".json" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importData(f) }} />
    </div>
  )
}

/* ------------------------------ root ------------------------------ */

export default function GroveScreen({ tab = 'focus' }: { tab?: string }) {
  const st = useStore(groveStore)
  const [flashTs, setFlashTs] = useState(0)
  const now = useNow(true, st.running ? 250 : 1000)

  /* the completion watcher lives at the root so timers finish on any tab */
  useEffect(() => {
    const ev = maybeComplete()
    if (ev) {
      handleCompletion(ev)
      if (ev.finished === 'focus' && ev.plant) setFlashTs(Date.now())
    }
  }, [now])

  return (
    <>
      {tab === 'focus' && <FocusTab st={st} now={now} flashTs={flashTs} />}
      {tab === 'tasks' && <TasksTab st={st} />}
      {tab === 'forest' && <ForestTab st={st} />}
    </>
  )
}

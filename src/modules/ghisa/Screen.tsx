/**
 * GHISA — 1:1 port of the standalone prototype (forged-iron dark UI,
 * chalk text, ember accent). No Tailwind, no lucide, no recharts:
 * gh2-* classes, local stroke icons, hand-rolled SVG charts.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import {
  ghisaStore,
  exerciseById,
  startWorkout,
  updateSet,
  cycleType,
  addSet,
  removeLastSet,
  removeEntry,
  addEntryFor,
  supersetWithNext,
  clearSuperset,
  finishWorkout,
  cancelWorkout,
  deleteWorkout,
  saveTemplate,
  deleteTemplate,
  addCustomExercise,
  setRestSec,
  seedDemo,
  resetAll,
  epley,
  round1,
  fmtVol,
  fmtDur,
  fmtDate,
  fmtDateShort,
  fmtClock,
  mondayOf,
  weekStreak,
  periodStart,
  workoutTotals,
  suggestName,
  historyMaxes,
  detectPRs,
  uid,
  DAY,
  MUSCLES,
  type GhisaState,
  type Exercise,
  type Template,
  type TemplateItem,
  type ActiveEntry,
  type ActiveSet,
  type ActiveWorkout,
  type Workout,
  type SetType,
  type Period,
  type FinishResult,
} from './model'

const pf = (v: string): number => parseFloat(v.replace(',', '.')) || 0
const pi = (v: string): number => parseInt(v, 10) || 0

/* ------------------------------- icons ------------------------------- */

interface IcProps { size?: number; style?: CSSProperties; fill?: boolean; sw?: number }
function ic(d: string) {
  return function Icon({ size = 18, style, fill = false, sw = 2 }: IcProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
        style={style} aria-hidden="true">
        <path d={d} />
      </svg>
    )
  }
}
const IX = ic('M18 6 6 18M6 6l12 12')
const ISearch = ic('M21 21l-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z')
const IPlus = ic('M12 5v14M5 12h14')
const ICheck = ic('M20 6 9 17l-5-5')
const IMore = ic('M5 12h.01M12 12h.01M19 12h.01')
const ITrash = ic('M3 6h18M8 6V4h8v2m1 0-1 14H8L7 6M10 11v6M14 11v6')
const IPlay = ic('M7 4.5 19 12 7 19.5v-15Z')
const ISkip = ic('M5 5l9 7-9 7V5ZM17 5v14')
const ILink = ic('M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7')
const ICalc = ic('M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01')
const IGear = ic('M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.36.62.94 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.97Z')
const IZap = ic('M13 2 3 14h8l-1 8 11-13h-8l0-7Z')
const ITrophy = ic('M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3')
const IPencil = ic('M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z')
const IArrowLeft = ic('M19 12H5M12 19l-7-7 7-7')
const IMinus = ic('M5 12h14')
const IChevronR = ic('m9 18 6-6-6-6')
const ISparkles = ic('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z')
const ITimer = ic('M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z')
const IClock = ic('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2')
const IDumbbell = ic('M6.5 6.5 4 4M17.5 17.5 20 20M4 10 10 4M14 20l6-6M9 6.5 17.5 15M6.5 9 15 17.5M2.5 8.5l3-3M18.5 21.5l3-3')
const ITrend = ic('m22 7-8.5 8.5-5-5L2 17M16 7h6v6')
const IHistoryI = ic('M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l4 2')

/* --------------------------- set type meta --------------------------- */

const TYPE_META: Record<SetType, { label?: string; cls: string; name?: string }> = {
  N: { cls: 'n' },
  W: { label: 'W', cls: 'w', name: 'Warm-up' },
  D: { label: 'D', cls: 'd', name: 'Drop set' },
  F: { label: 'F', cls: 'f', name: 'Failure' },
}
const SS_COLORS = ['#F97316', '#38BDF8', '#A78BFA', '#34D399', '#F472B6']

/* ---------------------------- primitives ---------------------------- */

function IconBtn({ children, onClick, label, small, tone }: {
  children: ReactNode; onClick: () => void; label: string; small?: boolean; tone?: 'ember' | 'danger'
}) {
  return (
    <button onClick={onClick} aria-label={label}
      className={'gh2-iconbtn' + (small ? ' sm' : '') + (tone ? ' ' + tone : '')}>
      {children}
    </button>
  )
}

function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="gh2-seg">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** The prototype's sheet: bottom card, or full-screen page with title bar + right slot. */
function GSheet({ open, onClose, children, full, title, right }: {
  open: boolean; onClose: () => void; children: ReactNode; full?: boolean; title?: string; right?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="gh2 gh2-scrim" onClick={onClose}>
      <div className={'gh2-sheet' + (full ? ' full' : '')} onClick={(e) => e.stopPropagation()}>
        {title !== undefined && (
          <div className="gh2-sheethead">
            <button className="gh2-close" onClick={onClose} aria-label="Close"><IX size={18} /></button>
            <div className="gh2-display gh2-sheettitle">{title}</div>
            <div className="gh2-sheetright">{right ?? null}</div>
          </div>
        )}
        <div className="gh2-sheetbody">{children}</div>
      </div>
    </div>
  )
}

function ActionSheet({ open, onClose, title, actions }: {
  open: boolean; onClose: () => void; title?: string
  actions: { label: string; icon: ReactNode; danger?: boolean; onClick?: () => void }[]
}) {
  if (!open) return null
  return (
    <div className="gh2 gh2-scrim" onClick={onClose}>
      <div className="gh2-actions" onClick={(e) => e.stopPropagation()}>
        <div className="gh2-actioncard">
          {title && <div className="gh2-actiontitle">{title}</div>}
          {actions.map((a, i) => (
            <button key={i} className={'gh2-action' + (a.danger ? ' danger' : '')}
              onClick={() => { onClose(); a.onClick?.() }}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
        <button className="gh2-actioncancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

function BigButton({ children, onClick, tone = 'ember', style, className }: {
  children: ReactNode; onClick: () => void; tone?: 'ember' | 'ghost'; style?: CSSProperties; className?: string
}) {
  return (
    <button onClick={onClick} style={style}
      className={'gh2-big ' + (tone === 'ember' ? 'ember' : 'ghost') + (className ? ' ' + className : '')}>
      {children}
    </button>
  )
}

function StatCard({ label, value, sub, delay }: { label: string; value: ReactNode; sub?: string; delay?: number }) {
  return (
    <div className="gh2-stat gh2-rise" style={{ animationDelay: (delay ?? 0) + 'ms' }}>
      <div className="k">{label}</div>
      <div className="v gh2-display tnum">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  )
}

function PRBadge({ label }: { label: string }) {
  return <span className="gh2-pr gh2-pop"><ITrophy size={11} /> {label}</span>
}

/* ------------------------- hand-rolled charts ------------------------- */

function GBarChart({ data }: { data: { label: string; vol: number }[] }) {
  const W = 320
  const H = 150
  const pad = { t: 6, b: 18, l: 4, r: 4 }
  const max = Math.max(1, ...data.map((d) => d.vol))
  const iw = (W - pad.l - pad.r) / data.length
  const bw = Math.min(26, iw * 0.62)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" className="gh2-chart" role="img" aria-label="Weekly volume">
      {data.map((d, i) => {
        const h = Math.max(d.vol > 0 ? 3 : 0, ((H - pad.t - pad.b) * d.vol) / max)
        const x = pad.l + i * iw + (iw - bw) / 2
        const y = H - pad.b - h
        return <rect key={i} x={x} y={y} width={bw} height={h} rx={5} className="bar" />
      })}
      {data.map((d, i) =>
        i % 2 === 1 ? (
          <text key={'t' + i} x={pad.l + i * iw + iw / 2} y={H - 5} textAnchor="middle" className="lbl">{d.label}</text>
        ) : null,
      )}
    </svg>
  )
}

function GAreaChart({ data, fmt }: { data: { label: string; value: number }[]; fmt?: (v: number) => string }) {
  const W = 320
  const H = 160
  const pad = { t: 10, b: 18, l: 8, r: 8 }
  const gid = useRef('g' + Math.random().toString(36).slice(2, 8)).current
  const vals = data.map((d) => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1)
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / span)
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`
  const step = Math.max(1, Math.ceil(data.length / 5))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" className="gh2-chart" role="img" aria-label="Progression">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} className="line" fill="none" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].value)} r="3.4" className="dot" />
      {data.map((d, i) =>
        i % step === 0 ? (
          <text key={i} x={x(i)} y={H - 5} textAnchor="middle" className="lbl">{d.label}</text>
        ) : null,
      )}
      <text x={W - pad.r} y={pad.t + 6} textAnchor="end" className="lbl hi tnum">
        {fmt ? fmt(max) : String(round1(max))}
      </text>
    </svg>
  )
}

/* ----------------------------- rest bar ----------------------------- */

export interface RestState { total: number; endsAt: number }

function RestBar({ rest, onAdjust, onSkip }: {
  rest: RestState | null; onAdjust: (d: number) => void; onSkip: () => void
}) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  if (!rest) return null
  const remaining = (rest.endsAt - now) / 1000
  if (remaining <= 0) return null
  const pct = Math.max(0, Math.min(1, remaining / rest.total))
  return (
    <div className="gh2-restwrap">
      <div className="gh2-rest gh2-rise">
        <div className="track"><i style={{ width: pct * 100 + '%' }} /></div>
        <div className="row">
          <span className="left">
            <ITimer size={18} style={{ color: 'var(--g-ember)' }} />
            <b className="gh2-display tnum">{fmtClock(remaining)}</b>
            <i>rest</i>
          </span>
          <span className="right">
            <button className="adj" onClick={() => onAdjust(-15)}>−15</button>
            <button className="adj" onClick={() => onAdjust(15)}>+15</button>
            <button className="skip" onClick={onSkip}><ISkip size={14} /> Skip</button>
          </span>
        </div>
      </div>
    </div>
  )
}

/* -------------------------- 1RM calculator -------------------------- */

function RMCalcSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [w, setW] = useState('100')
  const [r, setR] = useState('5')
  const oneRM = epley(pf(w), pi(r))
  const rows = [1, 2, 3, 5, 8, 10, 12].map((reps) => ({
    reps,
    weight: oneRM > 0 ? round1(oneRM / (1 + reps / 30)) : 0,
    pct: oneRM > 0 ? Math.round((1 / (1 + reps / 30)) * 100) : 0,
  }))
  return (
    <GSheet open={open} onClose={onClose} title="1RM Calculator">
      <div className="gh2-pad">
        <div className="gh2-grid2">
          <div>
            <div className="gh2-k">Weight (kg)</div>
            <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className="gh2-bignum tnum gh2-display" />
          </div>
          <div>
            <div className="gh2-k">Reps</div>
            <input inputMode="numeric" value={r} onChange={(e) => setR(e.target.value)} className="gh2-bignum tnum gh2-display" />
          </div>
        </div>
        <div className="gh2-1rm">
          <div className="k">Estimated 1RM · Epley</div>
          <div className="v gh2-display tnum">{oneRM > 0 ? round1(oneRM) : '—'}<small> kg</small></div>
        </div>
        <div className="gh2-listcard" style={{ marginTop: 16 }}>
          {rows.map((row) => (
            <div key={row.reps} className="gh2-calcrow">
              <b>{row.reps} {row.reps === 1 ? 'rep' : 'reps'}</b>
              <i>{row.pct}%</i>
              <span className="tnum">{row.weight > 0 ? row.weight + ' kg' : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </GSheet>
  )
}

/* --------------------------- exercise picker --------------------------- */

function ExercisePicker({ open, onClose, onPick }: {
  open: boolean; onClose: () => void; onPick: (ex: Exercise) => void
}) {
  const st = useStore(ghisaStore)
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState<string>('Chest')

  useEffect(() => {
    if (open) { setQ(''); setMuscle(null); setCreating(false); setNewName('') }
  }, [open])

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return st.exercises
      .filter((e) => (!muscle || e.muscle === muscle) && (!ql || e.name.toLowerCase().includes(ql)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [st.exercises, q, muscle])

  function create() {
    const name = newName.trim()
    if (!name) return
    const ex: Exercise = { id: 'custom-' + uid(), name, muscle: newMuscle, equipment: 'Custom', custom: true }
    addCustomExercise(ex)
    setCreating(false)
    onPick(ex)
  }

  return (
    <GSheet open={open} onClose={onClose} title="Add exercise" full
      right={<button className="gh2-close ember" onClick={() => setCreating(!creating)} aria-label="New custom exercise"><IPlus size={18} /></button>}>
      <div className="gh2-pad">
        {creating && (
          <div className="gh2-card gh2-rise" style={{ marginBottom: 16 }}>
            <div className="gh2-k ember">New custom exercise</div>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Exercise name" className="gh2-input" style={{ marginBottom: 12 }} />
            <div className="gh2-chips" style={{ marginBottom: 12 }}>
              {MUSCLES.map((m) => (
                <button key={m} className={'gh2-chip fill' + (newMuscle === m ? ' on' : '')} onClick={() => setNewMuscle(m)}>{m}</button>
              ))}
            </div>
            <BigButton onClick={create} style={{ height: 46 }}>Create &amp; add</BigButton>
          </div>
        )}
        <div className="gh2-search">
          <ISearch size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><IX size={16} /></button>}
        </div>
        <div className="gh2-chips">
          <button className={'gh2-chip' + (!muscle ? ' on' : '')} onClick={() => setMuscle(null)}>All</button>
          {MUSCLES.map((m) => (
            <button key={m} className={'gh2-chip' + (muscle === m ? ' on' : '')} onClick={() => setMuscle(muscle === m ? null : m)}>{m}</button>
          ))}
        </div>
        <div className="gh2-listcard">
          {list.map((e) => (
            <button key={e.id} className="gh2-exrow" onClick={() => onPick(e)}>
              <span className="nm">
                <b>{e.name} {e.custom && <em>custom</em>}</b>
                <i>{e.muscle} · {e.equipment}</i>
              </span>
              <IPlus size={18} style={{ color: 'var(--g-ember)' }} />
            </button>
          ))}
          {list.length === 0 && (
            <div className="gh2-emptycell">No matches. Tap + to create "{q.trim() || 'a custom exercise'}".</div>
          )}
        </div>
      </div>
    </GSheet>
  )
}

/* --------------------------- live workout --------------------------- */

function SetRow({ set, index, prev, onChange, onToggle, onCycleType }: {
  set: ActiveSet
  index: number
  prev: { weight: number; reps: number } | null
  onChange: (patch: Partial<ActiveSet>) => void
  onToggle: () => void
  onCycleType: () => void
}) {
  const meta = TYPE_META[set.type]
  return (
    <>
      <div className={'gh2-setrow' + (set.done ? ' done' : '')}>
        <button className={'type ' + meta.cls} onClick={onCycleType} aria-label="Set type">
          {set.type === 'N' ? index + 1 : meta.label}
        </button>
        <button className="prev tnum" onClick={() => prev && onChange({ weight: String(prev.weight), reps: String(prev.reps) })} aria-label="Use previous">
          {prev ? `${prev.weight} × ${prev.reps}` : '—'}
        </button>
        <input inputMode="decimal" value={set.weight} placeholder={prev ? String(prev.weight) : 'kg'}
          onChange={(e) => onChange({ weight: e.target.value })} className="in tnum" aria-label="Weight" />
        <input inputMode="numeric" value={set.reps} placeholder={prev ? String(prev.reps) : 'reps'}
          onChange={(e) => onChange({ reps: e.target.value })} className="in reps tnum" aria-label="Reps" />
        <button className={'check' + (set.done ? ' on gh2-ring' : '')} onClick={onToggle} aria-pressed={set.done} aria-label="Complete set">
          <ICheck size={20} sw={3} />
        </button>
      </div>
      {set.prs.length > 0 && (
        <div className="gh2-prline">
          {set.prs.map((p) => <PRBadge key={p} label={p + ' PR'} />)}
        </div>
      )}
    </>
  )
}

function LiveExerciseCard({ entry, exercise, prevSets, ssLabel, ssColor, onToggleSet, onMenu }: {
  entry: ActiveEntry
  exercise: Exercise | undefined
  prevSets: { weight: number; reps: number }[] | undefined
  ssLabel: string | null
  ssColor: string | null
  onToggleSet: (setId: string) => void
  onMenu: () => void
}) {
  return (
    <div className="gh2-card gh2-rise" style={ssColor ? { borderLeft: `3px solid ${ssColor}` } : undefined}>
      <div className="gh2-cardhead">
        <div>
          <div className="gh2-display gh2-cardtitle">{exercise ? exercise.name : 'Exercise'}</div>
          {ssLabel && <div className="gh2-sslabel" style={{ color: ssColor ?? undefined }}><ILink size={11} /> {ssLabel}</div>}
        </div>
        <IconBtn small onClick={onMenu} label="Exercise options"><IMore size={18} /></IconBtn>
      </div>
      <div className="gh2-cols">
        <span>Set</span><span>Prev</span><span>kg</span><span>Reps</span><span>✓</span>
      </div>
      {entry.sets.map((s, i) => (
        <SetRow key={s.id} set={s} index={i} prev={prevSets ? prevSets[i] ?? null : null}
          onChange={(patch) => updateSet(entry.id, s.id, patch)}
          onToggle={() => onToggleSet(s.id)}
          onCycleType={() => cycleType(entry.id, s.id)} />
      ))}
      <button className="gh2-addset" onClick={() => addSet(entry.id)}><IPlus size={16} /> Add set</button>
    </div>
  )
}

function ElapsedTimer({ start }: { start: number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="gh2-display tnum gh2-elapsed">{fmtClock((Date.now() - start) / 1000)}</span>
}

function LiveWorkout({ active, workouts, onMinimize, onFinished, onStartRest }: {
  active: ActiveWorkout
  workouts: Workout[]
  onMinimize: () => void
  onFinished: (r: FinishResult) => void
  onStartRest: () => void
}) {
  const st = useStore(ghisaStore)
  const [picker, setPicker] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [name, setName] = useState(active.name || suggestName())

  const prevByExercise = useMemo(() => {
    const map: Record<string, { weight: number; reps: number }[]> = {}
    const sorted = [...workouts].sort((a, b) => b.startedAt - a.startedAt)
    active.entries.forEach((en) => {
      if (map[en.exerciseId]) return
      for (const w of sorted) {
        const match = w.entries.find((e) => e.exerciseId === en.exerciseId)
        if (match) {
          map[en.exerciseId] = match.sets.map((s) => ({ weight: s.weight, reps: s.reps }))
          break
        }
      }
    })
    return map
  }, [workouts, active])

  const totals = workoutTotals(active.entries)

  function toggleSet(entryId: string, setId: string) {
    const entry = active.entries.find((e) => e.id === entryId)
    const set = entry?.sets.find((s) => s.id === setId)
    if (!entry || !set) return
    if (set.done) {
      updateSet(entryId, setId, { done: false, prs: [] })
      return
    }
    const prev = (prevByExercise[entry.exerciseId] ?? [])[entry.sets.indexOf(set)]
    const weight = set.weight !== '' ? pf(set.weight) : prev ? prev.weight : 0
    const reps = set.reps !== '' ? pi(set.reps) : prev ? prev.reps : 0
    const prs = detectPRs(workouts, entry.exerciseId, weight, reps, set.type)
    updateSet(entryId, setId, { done: true, weight: String(weight), reps: String(reps), prs })
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(prs.length ? [15, 40, 25] : 12)
    onStartRest()
  }

  const ssGroups: string[] = []
  active.entries.forEach((e) => {
    if (e.supersetGroup && !ssGroups.includes(e.supersetGroup)) ssGroups.push(e.supersetGroup)
  })
  const menuEntry = active.entries.find((e) => e.id === menuFor)
  const menuEx = menuEntry ? exerciseById(st, menuEntry.exerciseId) : undefined

  return (
    <div className="gh2 gh2-live gh2-fade">
      <div className="gh2-livehead">
        <IconBtn onClick={onMinimize} label="Minimize"><IArrowLeft size={20} /></IconBtn>
        <div className="mid">
          <ElapsedTimer start={active.startedAt} />
          <div className="sub tnum">{totals.sets} sets · {fmtVol(totals.volume)} kg</div>
        </div>
        <button className="gh2-finishbtn" onClick={() => { setName(active.name || suggestName()); setFinishing(true) }}>
          Finish
        </button>
      </div>

      <div className="gh2-livebody">
        <div className="gh2-stack">
          {active.entries.map((en) => {
            const gi = en.supersetGroup ? ssGroups.indexOf(en.supersetGroup) : -1
            return (
              <LiveExerciseCard key={en.id} entry={en} exercise={exerciseById(st, en.exerciseId)}
                prevSets={prevByExercise[en.exerciseId]}
                ssLabel={gi >= 0 ? 'Superset ' + String.fromCharCode(65 + gi) : null}
                ssColor={gi >= 0 ? SS_COLORS[gi % SS_COLORS.length] : null}
                onToggleSet={(setId) => toggleSet(en.id, setId)}
                onMenu={() => setMenuFor(en.id)} />
            )
          })}
          <BigButton tone="ghost" onClick={() => setPicker(true)}><IPlus size={18} /> Add exercise</BigButton>
          <button className="gh2-discard" onClick={() => setConfirmCancel(true)}>Discard workout</button>
        </div>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)}
        onPick={(ex) => { addEntryFor(ex.id); setPicker(false) }} />

      <ActionSheet open={menuFor !== null} onClose={() => setMenuFor(null)}
        title={menuEx ? menuEx.name : 'Exercise'}
        actions={menuEntry ? [
          { label: 'Add drop set', icon: <IZap size={18} style={{ color: '#A78BFA' }} />, onClick: () => addSet(menuEntry.id, 'D') },
          menuEntry.supersetGroup
            ? { label: 'Remove from superset', icon: <ILink size={18} style={{ color: 'var(--g-muted)' }} />, onClick: () => clearSuperset(menuEntry.id) }
            : { label: 'Superset with next exercise', icon: <ILink size={18} style={{ color: 'var(--g-ember)' }} />, onClick: () => supersetWithNext(menuEntry.id) },
          { label: 'Remove last set', icon: <IMinus size={18} style={{ color: 'var(--g-muted)' }} />, onClick: () => removeLastSet(menuEntry.id) },
          { label: 'Remove exercise', icon: <ITrash size={18} />, danger: true, onClick: () => removeEntry(menuEntry.id) },
        ] : []} />

      <ActionSheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Discard this workout?"
        actions={[{ label: 'Discard workout', icon: <ITrash size={18} />, danger: true, onClick: cancelWorkout }]} />

      <GSheet open={finishing} onClose={() => setFinishing(false)} title="Finish workout">
        <div className="gh2-pad">
          <div className="gh2-k">Workout name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} className="gh2-input" style={{ marginBottom: 16 }} />
          <div className="gh2-grid3" style={{ marginBottom: 16 }}>
            <StatCard label="Sets" value={totals.sets} />
            <StatCard label="Reps" value={totals.reps} />
            <StatCard label="Volume" value={fmtVol(totals.volume)} sub="kg" />
          </div>
          {totals.sets === 0 && <div className="gh2-note">No completed sets yet — tap ✓ on a set first.</div>}
          <BigButton onClick={() => {
            setFinishing(false)
            const r = finishWorkout(name.trim() || suggestName())
            if (r) onFinished(r)
          }}>
            <ICheck size={18} sw={3} /> Save workout
          </BigButton>
        </div>
      </GSheet>
    </div>
  )
}

/* --------------------------- summary sheet --------------------------- */

function SummarySheet({ summary, onClose }: { summary: FinishResult | null; onClose: () => void }) {
  if (!summary) return null
  const w = summary.workout
  return (
    <GSheet open onClose={onClose} title="Workout saved">
      <div className="gh2-pad gh2-center">
        <div className="gh2-trophy gh2-pop"><ITrophy size={34} /></div>
        <div className="gh2-display gh2-sumname">{w.name}</div>
        <div className="gh2-sumsub">{fmtDate(w.startedAt)} · {fmtDur(w.duration)}</div>
        <div className="gh2-grid3" style={{ marginTop: 20, textAlign: 'left' }}>
          <StatCard label="Sets" value={w.sets} />
          <StatCard label="Reps" value={w.reps} />
          <StatCard label="Volume" value={fmtVol(w.volume)} sub="kg" />
        </div>
        {(w.prCount > 0 || summary.volumePR) && (
          <div className="gh2-goldnote">
            <ISparkles size={16} />
            <b>
              {w.prCount > 0 ? w.prCount + ' personal record' + (w.prCount > 1 ? 's' : '') : ''}
              {w.prCount > 0 && summary.volumePR ? ' · ' : ''}
              {summary.volumePR ? 'All-time volume PR' : ''}
            </b>
          </div>
        )}
        <div style={{ marginTop: 20 }}><BigButton onClick={onClose}>Done</BigButton></div>
      </div>
    </GSheet>
  )
}

/* --------------------------- home / dashboard --------------------------- */

function WorkoutRow({ w, onClick }: { w: Workout; onClick: () => void }) {
  return (
    <button onClick={onClick} className="gh2-wrow">
      <div className="top">
        <b>{w.name}</b>
        <i>{fmtDateShort(w.startedAt)}</i>
      </div>
      <div className="meta tnum">
        <span><IClock size={12} /> {fmtDur(w.duration)}</span>
        <span><IDumbbell size={12} /> {w.sets} sets</span>
        <span><ITrend size={12} /> {fmtVol(w.volume)} kg</span>
        {w.prCount > 0 && <span className="gold"><ITrophy size={12} /> {w.prCount} PR</span>}
      </div>
    </button>
  )
}

function HomeScreen({ st, hasActive, onOpenSettings, onOpenCalc, onResume }: {
  st: GhisaState
  hasActive: boolean
  onOpenSettings: () => void
  onOpenCalc: () => void
  onResume: () => void
}) {
  const [period, setPeriod] = useState<Period>('week')

  const filtered = useMemo(() => {
    const start = periodStart(period)
    return st.workouts.filter((w) => w.startedAt >= start)
  }, [st.workouts, period])

  const stats = useMemo(() => {
    const totalSets = filtered.reduce((a, w) => a + w.sets, 0)
    const totalReps = filtered.reduce((a, w) => a + w.reps, 0)
    const totalVol = filtered.reduce((a, w) => a + w.volume, 0)
    const avgDur = filtered.length ? filtered.reduce((a, w) => a + w.duration, 0) / filtered.length : 0
    return { workouts: filtered.length, totalSets, totalReps, totalVol, avgDur, streak: weekStreak(st.workouts) }
  }, [filtered, st.workouts])

  const volSeries = useMemo(() => {
    const weeks: { label: string; vol: number }[] = []
    const thisMon = mondayOf(Date.now())
    for (let i = 7; i >= 0; i--) {
      const start = thisMon - i * 7 * DAY
      const vol = st.workouts
        .filter((w) => w.startedAt >= start && w.startedAt < start + 7 * DAY)
        .reduce((a, w) => a + w.volume, 0)
      weeks.push({ label: fmtDateShort(start), vol: Math.round(vol) })
    }
    return weeks
  }, [st.workouts])

  const recent = useMemo(
    () => [...st.workouts].sort((a, b) => b.startedAt - a.startedAt).slice(0, 3),
    [st.workouts],
  )

  return (
    <div className="gh2 gh2-page">
      <div className="gh2-pagehead">
        <div className="gh2-datehead">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div className="btns">
          <IconBtn onClick={onOpenCalc} label="1RM calculator"><ICalc size={19} /></IconBtn>
          <IconBtn onClick={onOpenSettings} label="Settings"><IGear size={19} /></IconBtn>
        </div>
      </div>

      {hasActive && (
        <button onClick={onResume} className="gh2-resumecard gh2-rise">
          <span className="left">
            <span className="playdot"><IPlay size={18} fill /></span>
            <span className="txt">
              <b>Workout in progress</b>
              <i>Tap to resume tracking</i>
            </span>
          </span>
          <IChevronR size={20} style={{ color: 'var(--g-ember)' }} />
        </button>
      )}

      <Segmented value={period} onChange={setPeriod}
        options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }, { value: 'all', label: 'All' }]} />

      {st.workouts.length === 0 ? (
        <div className="gh2-empty gh2-rise">
          <IDumbbell size={32} style={{ color: 'var(--g-ember)' }} />
          <div className="gh2-display t">No workouts yet</div>
          <div className="s">Start your first session from the Train tab, or explore the app with sample data.</div>
          <BigButton tone="ghost" onClick={seedDemo}><ISparkles size={17} style={{ color: 'var(--g-ember)' }} /> Generate sample data</BigButton>
        </div>
      ) : (
        <>
          <div className="gh2-grid2" style={{ marginTop: 16 }}>
            <StatCard label="Workouts" value={stats.workouts} delay={0} />
            <StatCard label="Volume" value={fmtVol(stats.totalVol)} sub="kg lifted" delay={40} />
            <StatCard label="Sets" value={stats.totalSets} delay={80} />
            <StatCard label="Reps" value={stats.totalReps} delay={120} />
            <StatCard label="Streak" value={stats.streak} sub={stats.streak === 1 ? 'week' : 'weeks'} delay={160} />
            <StatCard label="Avg duration" value={stats.avgDur ? fmtDur(stats.avgDur) : '—'} delay={200} />
          </div>

          <div className="gh2-card gh2-rise" style={{ marginTop: 16, animationDelay: '240ms' }}>
            <div className="gh2-k">Weekly volume · last 8 weeks</div>
            <div style={{ height: 150 }}><GBarChart data={volSeries} /></div>
          </div>

          <div className="gh2-secrow">
            <div className="gh2-k" style={{ margin: 0 }}>Recent workouts</div>
            <button className="gh2-linkbtn" onClick={() => navigate('/m/ghisa/history')}>See all</button>
          </div>
          <div className="gh2-stack sm">
            {recent.map((w) => <WorkoutRow key={w.id} w={w} onClick={() => navigate('/m/ghisa/history')} />)}
          </div>
        </>
      )}
    </div>
  )
}

/* --------------------------- train (templates) --------------------------- */

function TrainScreen({ st, onStart }: { st: GhisaState; onStart: (tpl: Template | null) => void }) {
  const [editing, setEditing] = useState<Template | 'new' | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const menuTpl = st.templates.find((t) => t.id === menuFor)

  return (
    <div className="gh2 gh2-page">
      <div className="gh2-display gh2-h1">Train</div>
      <BigButton onClick={() => onStart(null)}><IPlay size={18} fill /> Start empty workout</BigButton>

      <div className="gh2-secrow" style={{ marginTop: 24 }}>
        <div className="gh2-k" style={{ margin: 0 }}>Templates</div>
        <button className="gh2-linkbtn" onClick={() => setEditing('new')}><IPlus size={14} /> New template</button>
      </div>

      <div className="gh2-stack">
        {st.templates.map((t, i) => (
          <div key={t.id} className="gh2-card gh2-rise" style={{ animationDelay: i * 40 + 'ms' }}>
            <div className="gh2-cardhead">
              <div className="gh2-display gh2-cardtitle">{t.name}</div>
              <IconBtn small onClick={() => setMenuFor(t.id)} label="Template options"><IMore size={18} /></IconBtn>
            </div>
            <div className="gh2-tpllist">
              {t.items.map((it) => exerciseById(st, it.exerciseId)?.name ?? '?').join(' · ')}
            </div>
            <div className="gh2-tplbtns">
              <button className="start" onClick={() => onStart(t)}><IPlay size={15} fill /> Start</button>
              <button className="edit" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}><IPencil size={15} /></button>
            </div>
          </div>
        ))}
        {st.templates.length === 0 && (
          <div className="gh2-empty"><div className="s">No templates yet. Create one to start workouts in a single tap.</div></div>
        )}
      </div>

      <ActionSheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuTpl ? menuTpl.name : ''}
        actions={[
          { label: 'Edit template', icon: <IPencil size={18} style={{ color: 'var(--g-muted)' }} />, onClick: () => setEditing(menuTpl ?? null) },
          { label: 'Delete template', icon: <ITrash size={18} />, danger: true, onClick: () => { if (menuFor) deleteTemplate(menuFor) } },
        ]} />

      <TemplateEditor open={editing !== null} tpl={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function TemplateEditor({ open, tpl, onClose }: { open: boolean; tpl: Template | null; onClose: () => void }) {
  const st = useStore(ghisaStore)
  const [name, setName] = useState('')
  const [items, setItems] = useState<TemplateItem[]>([])
  const [picker, setPicker] = useState(false)

  useEffect(() => {
    if (open) {
      setName(tpl ? tpl.name : '')
      setItems(tpl ? tpl.items.map((it) => ({ ...it })) : [])
    }
  }, [open, tpl])

  const valid = name.trim().length > 0 && items.length > 0

  function save() {
    if (!valid) return
    saveTemplate({ id: tpl ? tpl.id : 'tpl-' + uid(), name: name.trim(), items })
    onClose()
  }

  return (
    <GSheet open={open} onClose={onClose} full title={tpl ? 'Edit template' : 'New template'}
      right={<button className={'gh2-savebtn' + (valid ? ' on' : '')} onClick={save}>Save</button>}>
      <div className="gh2-pad">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name (e.g. Upper A)"
          className="gh2-input" style={{ marginBottom: 16 }} />
        <div className="gh2-stack sm" style={{ marginBottom: 16 }}>
          {items.map((it, i) => (
            <div key={i} className="gh2-tplrow">
              <div className="nm">
                <b>{exerciseById(st, it.exerciseId)?.name ?? '?'}</b>
                <i>{it.sets} sets</i>
              </div>
              <div className="ctl">
                <button onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, sets: Math.max(1, x.sets - 1) } : x)))} aria-label="Fewer sets"><IMinus size={15} /></button>
                <span className="tnum">{it.sets}</span>
                <button onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, sets: Math.min(10, x.sets + 1) } : x)))} aria-label="More sets"><IPlus size={15} /></button>
                <button className="del" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove"><ITrash size={15} /></button>
              </div>
            </div>
          ))}
        </div>
        <BigButton tone="ghost" onClick={() => setPicker(true)}><IPlus size={18} /> Add exercise</BigButton>
      </div>
      <ExercisePicker open={picker} onClose={() => setPicker(false)}
        onPick={(ex) => { setItems((arr) => [...arr, { exerciseId: ex.id, sets: 3 }]); setPicker(false) }} />
    </GSheet>
  )
}

/* --------------------------- history --------------------------- */

function HistoryScreen({ st }: { st: GhisaState }) {
  const [detail, setDetail] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const sorted = useMemo(() => [...st.workouts].sort((a, b) => b.startedAt - a.startedAt), [st.workouts])
  const w = sorted.find((x) => x.id === detail)

  return (
    <div className="gh2 gh2-page">
      <div className="gh2-display gh2-h1">History</div>
      <div className="gh2-stack sm">
        {sorted.map((x) => <WorkoutRow key={x.id} w={x} onClick={() => setDetail(x.id)} />)}
        {sorted.length === 0 && (
          <div className="gh2-empty">
            <IHistoryI size={28} style={{ color: 'var(--g-muted)' }} />
            <div className="s">Finished workouts will appear here.</div>
          </div>
        )}
      </div>

      <GSheet open={w !== undefined} onClose={() => setDetail(null)} full title={w ? w.name : ''}
        right={w && <IconBtn small tone="danger" onClick={() => setConfirmDel(true)} label="Delete workout"><ITrash size={17} /></IconBtn>}>
        {w && (
          <div className="gh2-pad">
            <div className="gh2-sumsub" style={{ textAlign: 'left', marginBottom: 16 }}>{fmtDate(w.startedAt)} · {fmtDur(w.duration)}</div>
            <div className="gh2-grid3" style={{ marginBottom: 16 }}>
              <StatCard label="Sets" value={w.sets} />
              <StatCard label="Reps" value={w.reps} />
              <StatCard label="Volume" value={fmtVol(w.volume)} sub="kg" />
            </div>
            <div className="gh2-stack">
              {w.entries.map((e) => (
                <div key={e.id} className="gh2-card">
                  <div className="gh2-display gh2-cardtitle" style={{ marginBottom: 8 }}>
                    {exerciseById(st, e.exerciseId)?.name ?? 'Exercise'}
                  </div>
                  {e.sets.map((s, i) => {
                    const meta = TYPE_META[s.type]
                    return (
                      <div key={s.id} className="gh2-histset">
                        <span className={'tag ' + meta.cls}>{s.type === 'N' ? i + 1 : meta.label}</span>
                        <b className="tnum">{s.weight} kg × {s.reps}</b>
                        <i className="tnum">e1RM {round1(epley(s.weight, s.reps))}</i>
                        {s.prs.map((p) => <PRBadge key={p} label={p} />)}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </GSheet>

      <ActionSheet open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete this workout?"
        actions={[{ label: 'Delete workout', icon: <ITrash size={18} />, danger: true, onClick: () => { if (detail) deleteWorkout(detail); setDetail(null) } }]} />
    </div>
  )
}

/* --------------------------- library --------------------------- */

function LibraryScreen({ st }: { st: GhisaState }) {
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState<string>('Chest')

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return st.exercises
      .filter((e) => (!muscle || e.muscle === muscle) && (!ql || e.name.toLowerCase().includes(ql)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [st.exercises, q, muscle])

  return (
    <div className="gh2 gh2-page">
      <div className="gh2-pagehead">
        <div className="gh2-display gh2-h1" style={{ margin: 0 }}>Exercises</div>
        <IconBtn tone="ember" onClick={() => setCreating(true)} label="New custom exercise"><IPlus size={20} /></IconBtn>
      </div>
      <div className="gh2-search">
        <ISearch size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" />
        {q && <button onClick={() => setQ('')} aria-label="Clear search"><IX size={16} /></button>}
      </div>
      <div className="gh2-chips">
        <button className={'gh2-chip' + (!muscle ? ' on' : '')} onClick={() => setMuscle(null)}>All</button>
        {MUSCLES.map((m) => (
          <button key={m} className={'gh2-chip' + (muscle === m ? ' on' : '')} onClick={() => setMuscle(muscle === m ? null : m)}>{m}</button>
        ))}
      </div>
      <div className="gh2-listcard">
        {list.map((e) => (
          <button key={e.id} className="gh2-exrow" onClick={() => setDetail(e.id)}>
            <span className="nm">
              <b>{e.name} {e.custom && <em>custom</em>}</b>
              <i>{e.muscle} · {e.equipment}</i>
            </span>
            <IChevronR size={18} style={{ color: 'var(--g-muted)' }} />
          </button>
        ))}
      </div>

      <GSheet open={creating} onClose={() => setCreating(false)} title="New custom exercise">
        <div className="gh2-pad">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Exercise name" className="gh2-input" style={{ marginBottom: 12 }} />
          <div className="gh2-chips" style={{ marginBottom: 16 }}>
            {MUSCLES.map((m) => (
              <button key={m} className={'gh2-chip fill' + (newMuscle === m ? ' on' : '')} onClick={() => setNewMuscle(m)}>{m}</button>
            ))}
          </div>
          <BigButton onClick={() => {
            const name = newName.trim()
            if (!name) return
            addCustomExercise({ id: 'custom-' + uid(), name, muscle: newMuscle, equipment: 'Custom', custom: true })
            setNewName('')
            setCreating(false)
          }}>Create exercise</BigButton>
        </div>
      </GSheet>

      <ExerciseDetail st={st} exerciseId={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function ExerciseDetail({ st, exerciseId, onClose }: { st: GhisaState; exerciseId: string | null; onClose: () => void }) {
  const [metric, setMetric] = useState<'e1rm' | 'vol'>('e1rm')
  const ex = exerciseId ? exerciseById(st, exerciseId) : undefined

  const sessions = useMemo(() => {
    if (!exerciseId) return []
    const rows: { date: number; label: string; e1rm: number; vol: number; sets: { weight: number; reps: number }[] }[] = []
    ;[...st.workouts].sort((a, b) => a.startedAt - b.startedAt).forEach((w) => {
      let best = 0
      let vol = 0
      const sets: { weight: number; reps: number }[] = []
      w.entries.forEach((e) => {
        if (e.exerciseId !== exerciseId) return
        e.sets.forEach((s) => {
          sets.push({ weight: s.weight, reps: s.reps })
          if (s.type === 'W') return
          const e1 = epley(s.weight, s.reps)
          vol += s.weight * s.reps
          if (e1 > best) best = e1
        })
      })
      if (sets.length) rows.push({ date: w.startedAt, label: fmtDateShort(w.startedAt), e1rm: round1(best), vol: Math.round(vol), sets })
    })
    return rows
  }, [st.workouts, exerciseId])

  const maxes = useMemo(() => (exerciseId ? historyMaxes(st.workouts, exerciseId) : null), [st.workouts, exerciseId])

  return (
    <GSheet open={exerciseId !== null} onClose={onClose} full title={ex ? ex.name : ''}>
      {ex && maxes && (
        <div className="gh2-pad">
          <div className="gh2-sumsub" style={{ textAlign: 'left', marginBottom: 16 }}>{ex.muscle} · {ex.equipment}</div>
          <div className="gh2-grid2" style={{ marginBottom: 16 }}>
            <StatCard label="Heaviest" value={maxes.maxW > 0 ? maxes.maxW + ' kg' : '—'} />
            <StatCard label="Best est. 1RM" value={maxes.maxE > 0 ? round1(maxes.maxE) + ' kg' : '—'} />
            <StatCard label="Most reps" value={maxes.maxR > 0 ? maxes.maxR : '—'} />
            <StatCard label="Sessions" value={maxes.sessions} />
          </div>

          {sessions.length > 1 && (
            <div className="gh2-card" style={{ marginBottom: 16 }}>
              <div className="gh2-secrow" style={{ margin: '0 0 12px' }}>
                <div className="gh2-k" style={{ margin: 0 }}>Progression</div>
                <div style={{ width: 160 }}>
                  <Segmented value={metric} onChange={setMetric}
                    options={[{ value: 'e1rm', label: '1RM' }, { value: 'vol', label: 'Volume' }]} />
                </div>
              </div>
              <div style={{ height: 160 }}>
                <GAreaChart
                  data={sessions.map((s) => ({ label: s.label, value: metric === 'vol' ? s.vol : s.e1rm }))}
                  fmt={metric === 'vol' ? fmtVol : undefined} />
              </div>
            </div>
          )}

          <div className="gh2-k">History</div>
          <div className="gh2-stack sm">
            {[...sessions].reverse().map((s) => (
              <div key={s.date} className="gh2-card slim">
                <div className="gh2-secrow" style={{ margin: '0 0 4px' }}>
                  <b className="gh2-histdate">{fmtDate(s.date)}</b>
                  <span className="gh2-histe1 tnum">e1RM {s.e1rm} kg</span>
                </div>
                <div className="gh2-histsets tnum">{s.sets.map((x) => `${x.weight}×${x.reps}`).join('  ·  ')}</div>
              </div>
            ))}
            {sessions.length === 0 && <div className="gh2-emptycell">No sets logged for this exercise yet.</div>}
          </div>
        </div>
      )}
    </GSheet>
  )
}

/* --------------------------- settings --------------------------- */

function SettingsSheet({ st, open, onClose }: { st: GhisaState; open: boolean; onClose: () => void }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const restOptions = [0, 60, 90, 120, 150, 180]
  return (
    <GSheet open={open} onClose={onClose} title="Settings">
      <div className="gh2-pad">
        <div className="gh2-k">Auto rest timer</div>
        <div className="gh2-restgrid">
          {restOptions.map((sec) => (
            <button key={sec} className={st.settings.restSec === sec ? 'on' : ''} onClick={() => setRestSec(sec)}>
              {sec === 0 ? 'Off' : sec % 60 === 0 ? sec / 60 + ' min' : '2.5 min'}
            </button>
          ))}
        </div>
        <div className="gh2-k" style={{ marginTop: 24 }}>Data</div>
        <div className="gh2-stack sm">
          <BigButton tone="ghost" onClick={() => { seedDemo(); onClose() }}>
            <ISparkles size={17} style={{ color: 'var(--g-ember)' }} /> Generate sample data
          </BigButton>
          <BigButton tone="ghost" onClick={() => setConfirmReset(true)} style={{ color: '#F87171' }}>
            <ITrash size={17} /> Reset all data
          </BigButton>
        </div>
        <div className="gh2-footnote">GHISA · local-first — your data lives on this device.</div>
      </div>
      <ActionSheet open={confirmReset} onClose={() => setConfirmReset(false)}
        title="Delete all workouts, templates and custom exercises?"
        actions={[{ label: 'Reset everything', icon: <ITrash size={18} />, danger: true, onClick: () => { resetAll(); onClose() } }]} />
    </GSheet>
  )
}

/* ----------------------------- app root ----------------------------- */

function ElapsedResume({ start }: { start: number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="tnum">{fmtClock((Date.now() - start) / 1000)}</span>
}

export default function GhisaScreen({ tab = 'home' }: { tab?: string }) {
  const st = useStore(ghisaStore)
  const [liveOpen, setLiveOpen] = useState(false)
  const [rest, setRest] = useState<RestState | null>(null)
  const [summary, setSummary] = useState<FinishResult | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)

  function startRest() {
    const sec = ghisaStore.get().settings.restSec
    if (!sec) return
    setRest({ total: sec, endsAt: Date.now() + sec * 1000 })
  }

  function handleStart(tpl: Template | null) {
    if (!st.active) startWorkout(tpl)
    setLiveOpen(true)
  }

  function handleFinished(r: FinishResult) {
    setLiveOpen(false)
    setRest(null)
    setSummary(r)
    navigate('/m/ghisa/home')
  }

  return (
    <>
      {tab === 'home' && (
        <HomeScreen st={st} hasActive={st.active !== null}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenCalc={() => setCalcOpen(true)}
          onResume={() => setLiveOpen(true)} />
      )}
      {tab === 'train' && <TrainScreen st={st} onStart={handleStart} />}
      {tab === 'history' && <HistoryScreen st={st} />}
      {tab === 'library' && <LibraryScreen st={st} />}

      {st.active && !liveOpen && (
        <button className="gh2 gh2-resumebar gh2-rise" onClick={() => setLiveOpen(true)}>
          <span><IPlay size={17} fill /> Resume workout</span>
          <ElapsedResume start={st.active.startedAt} />
        </button>
      )}

      {liveOpen && st.active && (
        <>
          <LiveWorkout active={st.active} workouts={st.workouts}
            onMinimize={() => setLiveOpen(false)}
            onFinished={handleFinished}
            onStartRest={startRest} />
          <RestBar rest={rest}
            onAdjust={(d) => setRest((r) => (r ? { ...r, endsAt: r.endsAt + d * 1000, total: Math.max(1, r.total + d) } : r))}
            onSkip={() => setRest(null)} />
        </>
      )}

      <SummarySheet summary={summary} onClose={() => setSummary(null)} />
      <SettingsSheet st={st} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <RMCalcSheet open={calcOpen} onClose={() => setCalcOpen(false)} />
    </>
  )
}

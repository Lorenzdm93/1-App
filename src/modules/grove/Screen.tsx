import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { eventsStore } from '../../core/events'
import { dayKey, todayKey, lastNDayKeys } from '../../core/dates'
import { toast } from '../../core/toast'
import { ConfirmSheet, Seg, StatBox } from '../../app/ui'
import { Bars } from '../../app/charts'
import PlantSVG from './PlantSVG'

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [active])
  return now
}
import {
  groveStore, MODES, PRESETS, ANIMALS,
  minutesFor, setMode, setFocusMinutes, start, pause, resume, reset, giveUp, skipBreak,
  maybeComplete, progress, remainingMs,
  addTask, setActiveTask, toggleFinished, removeTask,
  todayStats, focusDayStreak, totalFocusMinutes, unlockedAnimals, nextAnimal,
  reshuffle, jitter,
  type Plant, type Mode,
} from './model'

const MODE_LABEL: Record<Mode, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' }

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/* ---------- the dial ---------- */

function Dial({
  minutes,
  fraction,
  running,
  paused,
  clock,
  sub,
  hint,
  onEditMinutes,
}: {
  minutes: number
  fraction: number // 0..1 remaining
  running: boolean
  paused: boolean
  clock: string
  sub: string
  hint: string | null
  onEditMinutes: ((m: number) => void) | null
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(minutes))
  const R = 88
  const C = 2 * Math.PI * R
  const ticks = Array.from({ length: 60 })
  return (
    <div className={'gv-dial-wrap' + (paused ? ' paused' : '')}>
      <svg viewBox="0 0 220 220" className="gv-dial" aria-hidden="true">
        <circle cx="110" cy="110" r="104" fill="var(--gv-dial-face, var(--raised))" />
        <circle cx="110" cy="110" r="104" fill="none" stroke="var(--line)" strokeWidth="1.5" />
        {ticks.map((_, i) => {
          const a = (i / 60) * 2 * Math.PI - Math.PI / 2
          const major = i % 5 === 0
          const r1 = major ? 92 : 95
          return (
            <line
              key={i}
              x1={110 + r1 * Math.cos(a)} y1={110 + r1 * Math.sin(a)}
              x2={110 + 99 * Math.cos(a)} y2={110 + 99 * Math.sin(a)}
              stroke={major ? 'var(--dim)' : 'var(--line)'}
              strokeWidth={major ? 2 : 1.2}
            />
          )
        })}
        <circle cx="110" cy="110" r={R} fill="none" stroke="var(--line)" strokeWidth="6" opacity="0.4" />
        <defs>
          <linearGradient id="gv-arc-g" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--m-grove-warm, var(--m-caliber))" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--m-grove-warm, var(--m-caliber)) 50%, #ffffff)" />
          </linearGradient>
        </defs>
        <circle
          cx="110" cy="110" r={R} fill="none"
          stroke="url(#gv-arc-g)" strokeWidth="6.5" strokeLinecap="round"
          strokeDasharray={`${C * fraction} ${C}`}
          transform="rotate(-90 110 110)"
          style={{ transition: 'stroke-dasharray 0.5s linear', filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--m-grove-warm) 45%, transparent))' }}
        />
      </svg>
      <div className="gv-dial-center">
        {editing && onEditMinutes ? (
          <input
            className="gv-dial-input num"
            autoFocus
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const n = parseInt(draft, 10)
              if (Number.isFinite(n)) onEditMinutes(n)
              setEditing(false)
            }}
            onKeyDown={(e: { key: string; target: EventTarget }) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <button
            className="gv-dial-time num"
            onClick={() => {
              if (!running && onEditMinutes) {
                setDraft(String(minutes))
                setEditing(true)
              }
            }}
          >
            {clock}
          </button>
        )}
        <div className="gv-dial-sub">{sub}</div>
        {hint && <div className="gv-dial-hint">{hint}</div>}
      </div>
    </div>
  )
}

/* ---------- focus tab ---------- */

function FocusTab() {
  const st = useStore(groveStore)
  const events = useStore(eventsStore)
  const now = useNow(st.running !== null && st.running.pausedAt === null)
  const [confirmGiveUp, setConfirmGiveUp] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const celebrated = useRef<string | null>(null)

  useEffect(() => {
    const plant = maybeComplete(now)
    if (plant && celebrated.current !== plant.id) {
      celebrated.current = plant.id
      toast(
        plant.kind === 'flower' || plant.kind === 'fern'
          ? 'Break done — back to it'
          : `${plant.minutes} min focused — a ${plant.kind} joins your grove`,
      )
    }
  }, [now])

  const run = st.running
  const running = run !== null
  const paused = run?.pausedAt != null
  const remaining = run ? remainingMs(run, now) : minutesFor(st, st.mode) * 60_000
  const fraction = run ? 1 - progress(run, now) : 1
  const sessionN = Math.min(4, st.cyclePos + (running && run.mode === 'focus' ? 1 : st.mode === 'focus' ? 1 : 0))
  const sub =
    (run ? MODE_LABEL[run.mode] : MODE_LABEL[st.mode]).toUpperCase() +
    ' · SESSION ' + Math.max(1, sessionN) + ' OF 4'

  const activeTask = st.tasks.find((t) => t.id === st.activeTaskId && !t.finished)
  const stats = todayStats(st.plants)
  const streak = focusDayStreak(st.plants)
  const days = lastNDayKeys(14)
  const perDay = days.map((d) => ({
    label: new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' }),
    value: events
      .filter((e) => e.module === 'grove' && e.kind === 'focus' && dayKey(e.ts) === d)
      .length,
  }))
  const todaysPlants = st.plants.filter((p) => dayKey(p.ts) === todayKey()).slice(0, 12).reverse()

  return (
    <>
      <div className="gv-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={'gv-mode' + (st.mode === m.id && !running ? ' on' : running && run.mode === m.id ? ' on' : '')}
            disabled={running}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {st.mode === 'focus' && !running && (
        <div className="gv-presets">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={'gv-preset num' + (st.focusMin === p ? ' on' : '')}
              onClick={() => setFocusMinutes(p)}
            >
              {p}m
            </button>
          ))}
        </div>
      )}

      <Dial
        minutes={minutesFor(st, st.mode)}
        fraction={fraction}
        running={running}
        paused={paused === true}
        clock={fmtClock(remaining)}
        sub={sub}
        hint={running ? (activeTask ? `→ ${activeTask.name}` : null) : 'pick a preset, or tap the time to type'}
        onEditMinutes={!running && st.mode === 'focus' ? setFocusMinutes : null}
      />

      <div className="gv-dots" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={'gv-dot' + (i <= st.cyclePos ? ' done' : '') + (i === Math.max(1, sessionN) && (running ? run.mode === 'focus' : st.mode === 'focus') ? ' cur' : '')} />
        ))}
      </div>

      <div className="gv-controls">
        <button
          className="gv-round"
          aria-label="Reset timer"
          disabled={!running}
          onClick={() => {
            if (!run) return
            const elapsedMin = (run.pausedAt ?? now) - run.startTs
            if (run.mode === 'focus' && elapsedMin > 2 * 60_000) setConfirmReset(true)
            else reset()
          }}
        >
          ↺
        </button>
        {!running ? (
          <button className="btn btn-primary gv-start" onClick={() => start()}>
            Start
          </button>
        ) : paused ? (
          <button className="btn btn-primary gv-start" onClick={() => resume()}>
            Resume
          </button>
        ) : (
          <button className="btn btn-ghost gv-start" onClick={() => pause()}>
            Pause
          </button>
        )}
        <button
          className="gv-round"
          aria-label={running && run.mode === 'focus' ? 'Give up session' : 'Skip break'}
          disabled={!running}
          onClick={() => {
            if (!run) return
            if (run.mode === 'focus') setConfirmGiveUp(true)
            else {
              const p = skipBreak(now)
              toast(p ? 'Break banked early' : 'Break skipped')
            }
          }}
        >
          ⏭
        </button>
      </div>

      <div className="section-label">Today's grove</div>
      <div className="gv-strip">
        {todaysPlants.length === 0 ? (
          <span className="gv-strip-empty">Finish a focus session to grow your first tree of the day.</span>
        ) : (
          todaysPlants.map((p) => <PlantSVG key={p.id} kind={p.kind} size={34} sway={jitter(p.id) * 2} />)
        )}
      </div>

      <div className="ins-grid three" style={{ marginTop: 16 }}>
        <StatBox label="sessions today" value={String(stats.count)} />
        <StatBox label="minutes today" value={String(stats.minutes)} />
        <StatBox label="day streak" value={`${streak}d`} />
      </div>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-grove)' }}>Sessions · last 14 days</span>
        </div>
        <Bars data={perDay} accentVar="var(--m-grove)" />
      </div>

      <ConfirmSheet
        open={confirmGiveUp}
        title="Give up this session?"
        body="The tree withers — nothing is logged. Sometimes that's the honest call."
        actionLabel="Give up"
        danger
        onConfirm={() => giveUp()}
        onClose={() => setConfirmGiveUp(false)}
      />
      <ConfirmSheet
        open={confirmReset}
        title="Restart the timer?"
        body="Progress on this session resets to zero. The clock forgives; the forest forgets."
        actionLabel="Restart"
        onConfirm={() => reset()}
        onClose={() => setConfirmReset(false)}
      />
    </>
  )
}

/* ---------- tasks tab ---------- */

function TasksTab() {
  const st = useStore(groveStore)
  const [name, setName] = useState('')
  const [planned, setPlanned] = useState(1)
  return (
    <>
      <div className="card">
        <div className="gv-task-add">
          <input
            className="tinput"
            placeholder="What are you working on?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="gv-stepper num">
            <button onClick={() => setPlanned((p) => Math.max(1, p - 1))}>−</button>
            <span>{planned}</span>
            <button onClick={() => setPlanned((p) => Math.min(20, p + 1))}>+</button>
          </div>
          <button
            className="btn btn-primary gv-task-plus"
            onClick={() => {
              if (name.trim() === '') {
                toast('Name the task first')
                return
              }
              addTask(name, planned)
              setName('')
              setPlanned(1)
            }}
          >
            +
          </button>
        </div>
        <p className="rs-foot" style={{ marginTop: 10 }}>
          Tap a task to make it <b>active</b> — every focus session you finish counts toward it
          (done / planned). The checkbox just marks the task finished.
        </p>
      </div>
      {st.tasks.length === 0 ? (
        <p className="gv-tasks-empty">No tasks yet — add one above.</p>
      ) : (
        st.tasks.map((t) => (
          <div
            key={t.id}
            className={'card gv-task' + (t.id === st.activeTaskId && !t.finished ? ' active' : '') + (t.finished ? ' finished' : '')}
          >
            <button
              className={'gv-task-check' + (t.finished ? ' on' : '')}
              aria-label={t.finished ? 'Reopen task' : 'Finish task'}
              onClick={() => toggleFinished(t.id)}
            >
              ✓
            </button>
            <button className="gv-task-main" onClick={() => !t.finished && setActiveTask(t.id === st.activeTaskId ? null : t.id)}>
              <span className="gv-task-name">{t.name}</span>
              <span className="gv-task-sub num">
                {t.done} / {t.planned} sessions
                {t.id === st.activeTaskId && !t.finished && <em> · active</em>}
              </span>
            </button>
            <button className="sn-trash sm" onClick={() => removeTask(t.id)} aria-label={`Delete ${t.name}`}>
              🗑
            </button>
          </div>
        ))
      )}
    </>
  )
}

/* ---------- forest tab ---------- */

type Span = 'week' | 'month' | 'year' | 'all'
const SPANS: readonly { id: Span; label: string; days: number | null }[] = [
  { id: 'week', label: 'Week', days: 7 },
  { id: 'month', label: 'Month', days: 30 },
  { id: 'year', label: 'Year', days: 365 },
  { id: 'all', label: 'All', days: null },
]

function ForestTab() {
  const st = useStore(groveStore)
  const [span, setSpan] = useState<Span>('week')
  const cutoffDays = SPANS.find((s) => s.id === span)!.days
  const cutoff = cutoffDays === null ? 0 : Date.now() - cutoffDays * 86400_000
  const plants = st.plants.filter((p) => p.ts >= cutoff)
  const unlocked = unlockedAnimals(st.plants)
  const next = nextAnimal(st.plants)
  const totalH = Math.floor(totalFocusMinutes(st.plants) / 60)
  const totalM = totalFocusMinutes(st.plants) % 60

  const W = 340
  const H = 260
  const placed = plants
    .map((p) => {
      const u = 0.08 + 0.84 * jitter(p.id, st.shuffleSeed)
      const v = 0.08 + 0.84 * jitter(p.id + 'v', st.shuffleSeed)
      const cx = W / 2 + ((u - v) * W * 0.46)
      const cy = H * 0.14 + ((u + v) / 2) * H * 0.66
      const depth = (u + v) / 2
      const base = p.kind === 'flower' ? 22 : p.kind === 'fern' ? 26 : p.kind === 'shrub' ? 26 : p.kind === 'birch' ? 34 : p.kind === 'pine' ? 40 : 46
      return { p, cx, cy, size: base * (0.75 + depth * 0.5) }
    })
    .sort((a, b) => a.cy - b.cy)

  const critters = unlocked.map((a, i) => {
    const u = 0.2 + 0.6 * jitter(a.name, st.shuffleSeed + i)
    const v = 0.2 + 0.6 * jitter(a.name + 'v', st.shuffleSeed + i)
    return { a, cx: W / 2 + (u - v) * W * 0.46, cy: H * 0.14 + ((u + v) / 2) * H * 0.66 }
  })

  return (
    <>
      <div className="gv-forest-head">
        <Seg<Span>
          options={SPANS.map((s) => ({ id: s.id, label: s.label }))}
          value={span}
          onChange={setSpan}
        />
        <button className="chip" onClick={reshuffle}>⤨ Shuffle</button>
      </div>
      <div className="card gv-forest-card">
        <div className="gv-forest" style={{ ['--fw' as string]: `${W}px` } as CSSProperties}>
          <svg viewBox={`0 0 ${W} ${H}`} className="gv-ground" aria-hidden="true">
            <polygon
              points={`${W / 2},${H * 0.06} ${W * 0.97},${H * 0.5} ${W / 2},${H * 0.94} ${W * 0.03},${H * 0.5}`}
              fill="var(--gv-ground, #22301f)"
              stroke="var(--line)"
              strokeWidth="1"
            />
            <polygon
              points={`${W / 2},${H * 0.12} ${W * 0.9},${H * 0.5} ${W / 2},${H * 0.88} ${W * 0.1},${H * 0.5}`}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          </svg>
          {placed.length === 0 && (
            <div className="gv-forest-empty">
              Nothing planted in this window yet.
              <br />
              Finish a session to start the growth.
            </div>
          )}
          {placed.map(({ p, cx, cy, size }) => (
            <span key={p.id} className="gv-spot" style={{ left: cx, top: cy }}>
              <PlantSVG kind={p.kind} size={size} sway={jitter(p.id) * 3} />
            </span>
          ))}
          {critters.map(({ a, cx, cy }) => (
            <span key={a.name} className="gv-spot gv-critter" style={{ left: cx, top: cy }} title={a.name}>
              {a.emoji}
            </span>
          ))}
        </div>
        <p className="gv-legend">
          Focus grows trees — <b>&lt;10m</b> shrub · <b>10–19m</b> birch · <b>20–39m</b> pine ·{' '}
          <b>40m+</b> oak. Finished breaks plant <b>flowers</b> (short) and <b>ferns</b> (long).
        </p>
        <div className="gv-animals">
          {ANIMALS.map((a) => {
            const has = unlocked.some((u) => u.name === a.name)
            return (
              <span key={a.name} className={'gv-animal' + (has ? ' on' : '')}>
                {a.emoji} {a.name}
              </span>
            )
          })}
        </div>
        {next && (
          <p className="gv-next num">
            next: <b>{next.animal.name}</b> at {next.animal.hours}h — {totalH}h {totalM}m so far
          </p>
        )}
      </div>
    </>
  )
}

/* ---------- screen ---------- */

export default function GroveScreen({ tab = 'focus' }: { tab?: string }) {
  if (tab === 'tasks') return <TasksTab />
  if (tab === 'forest') return <ForestTab />
  return <FocusTab />
}

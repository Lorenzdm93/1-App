import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { lastNDayKeys, todayKey, shiftDay } from '../../core/dates'
import { StatBox } from '../../app/ui'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty, Seg } from '../../app/ui'
import {
  cadenceStore,
  activeHabits,
  isChecked,
  addHabit,
  editHabit,
  archiveHabit,
  toggleCheck,
  setCheck,
  habitStreak,
  logSlip,
  undoTodaySlip,
  slipDays,
  daysClean,
  monthGrid,
  monthDayKey,
  dayCompletion,
  weekStartKey,
  weekDayKeys,
  countInWeek,
  weekStreak,
  monthInsights,
  yearInsights,
  EMOJI_PRESETS,
  PALETTE,
  type Habit,
  type HabitType,
} from './model'

function accent(h: Habit): CSSProperties {
  return { ['--h-acc' as string]: h.color } as CSSProperties
}

/* ---------- weekly ring ---------- */

function WeekRing({ count, target }: { count: number; target: number }) {
  const r = 14
  const C = 2 * Math.PI * r
  const frac = Math.min(1, count / target)
  return (
    <span className="cdh-ring" aria-label={`${count} of ${target} this week`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--h-acc, var(--m-cadence))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${frac * C} ${C - frac * C}`}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="n num">{count}</span>
    </span>
  )
}

/* ---------- today rows ---------- */

function WeekDots({ habitId }: { habitId: string }) {
  const st = useStore(cadenceStore)
  const today = todayKey()
  const days = weekDayKeys(weekStartKey(today))
  return (
    <span className="cdh-week" aria-hidden="true">
      {days.map((day) => (
        <span
          key={day}
          className={
            'cdh-wdot' +
            (isChecked(st, habitId, day) ? ' on' : '') +
            (day === today ? ' today' : '') +
            (day > today ? ' future' : '')
          }
        />
      ))}
    </span>
  )
}

function BuildRow({ habit, day, onManage }: { habit: Habit; day: string; onManage: () => void }) {
  const st = useStore(cadenceStore)
  const done = isChecked(st, habit.id, day)
  const daily = habit.targetPerWeek === 7
  const count = countInWeek(st, habit.id, weekStartKey(todayKey()))
  const streakLabel = daily
    ? `${habitStreak(st, habit.id)}d`
    : `${weekStreak(st, habit.id)}w`
  return (
    <div className="cdh-row" style={accent(habit)}>
      <button
        className={'cdh-tile' + (done ? ' done' : '')}
        onClick={() => setCheck(habit.id, day, !done)}
        aria-label={(done ? 'Uncheck ' : 'Check ') + habit.name}
        aria-pressed={done}
      >
        <span className="em" aria-hidden="true">{habit.emoji}</span>
        <span className="tick" aria-hidden="true">✓</span>
      </button>
      <button className="cdh-info" onClick={onManage}>
        <span className="cdh-name">{habit.name}</span>
        <span className="cdh-sub">
          {streakLabel} streak
          {!daily && ` · ${count}/${habit.targetPerWeek} this week`}
          {habit.cue ? ` · ${habit.cue}` : ''}
        </span>
        <WeekDots habitId={habit.id} />
      </button>
      <WeekRing count={count} target={habit.targetPerWeek} />
    </div>
  )
}

function QuitRow({
  habit,
  onManage,
  onSlip,
}: {
  habit: Habit
  onManage: () => void
  onSlip: () => void
}) {
  const st = useStore(cadenceStore)
  const clean = daysClean(st, habit.id)
  const slippedToday = slipDays(st, habit.id).includes(todayKey())
  return (
    <div className="cdh-row" style={accent(habit)}>
      <span className="cdh-tile quit" aria-hidden="true">
        <span className="em">{habit.emoji}</span>
      </span>
      <button className="cdh-info" onClick={onManage}>
        <span className="cdh-name">{habit.name}</span>
        <span className="cdh-sub">{habit.cue ?? 'clean days'}</span>
        <span className="cdh-clean num">
          {clean} <i>{clean === 1 ? 'day clean' : 'days clean'}</i>
        </span>
      </button>
      {slippedToday ? (
        <button className="cd-slip undone" onClick={() => undoTodaySlip(habit.id)}>
          Undo
        </button>
      ) : (
        <button className="cd-slip" onClick={onSlip}>
          Slip
        </button>
      )}
    </div>
  )
}

/* ---------- month ---------- */

function MonthView() {
  const st = useStore(cadenceStore)
  const now = new Date()
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() })
  const [backfill, setBackfill] = useState<string | null>(null)
  const grid = monthGrid(ym.y, ym.m)
  const today = todayKey()
  const builds = activeHabits(st).filter((h) => h.type === 'build')
  const label = new Date(ym.y, ym.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  function move(delta: number) {
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const ins = monthInsights(st, grid)
  return (
    <>
      <div className="ins-grid">
        <StatBox label="avg completion" value={`${ins.avgCompletion}%`} />
        <StatBox label="check-ins" value={String(ins.checkIns)} />
        <StatBox label="active habits" value={String(ins.activeBuilds)} />
        <StatBox
          label="most consistent"
          value={ins.mostConsistent ? `${ins.mostConsistent.pct}%` : '—'}
          sub={ins.mostConsistent ? ins.mostConsistent.name : undefined}
        />
      </div>
      <div className="card">
        <div className="cd-month-head">
          <button onClick={() => move(-1)} aria-label="Previous month">‹</button>
          <span>{label}</span>
          <button onClick={() => move(1)} aria-label="Next month">›</button>
        </div>
        <div className="cd-month-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span className="cd-dow" key={i}>{d}</span>
          ))}
          {Array.from({ length: grid.leadingBlanks }).map((_, i) => (
            <span key={'b' + i} />
          ))}
          {Array.from({ length: grid.days }).map((_, i) => {
            const day = monthDayKey(grid, i + 1)
            const ratio = dayCompletion(st, day)
            const future = day > today
            const level = ratio === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : ratio < 1 ? 3 : 4
            return (
              <button
                key={day}
                className={
                  'cd-day l' + level + (day === today ? ' today' : '') + (future ? ' future' : '')
                }
                disabled={future}
                onClick={() => setBackfill(day)}
                aria-label={`Edit ${day}`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
        <div className="cd-heat-label">Tap any past day to fill in what you did.</div>
      </div>

      <Sheet
        open={backfill !== null}
        title={
          backfill
            ? new Date(backfill + 'T12:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : ''
        }
        onClose={() => setBackfill(null)}
      >
        {backfill && builds.length === 0 && (
          <Empty title="No build habits" sub="Backfilling applies to build habits." />
        )}
        {backfill &&
          builds.map((h) => {
            const done = isChecked(st, h.id, backfill)
            return (
              <div className="cd-row" key={h.id} style={accent(h)}>
                <button
                  className={'cd-check' + (done ? ' done' : '')}
                  onClick={() => setCheck(h.id, backfill, !done)}
                >
                  {h.emoji}
                </button>
                <span className="cd-info">
                  <span className="cd-name">{h.name}</span>
                </span>
              </div>
            )
          })}
      </Sheet>
    </>
  )
}

/* ---------- year ---------- */

const YEAR_DAYS = 371 // 53 weeks

function YearGrid({ habit }: { habit: Habit }) {
  const st = useStore(cadenceStore)
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [])
  const today = todayKey()
  const days = lastNDayKeys(YEAR_DAYS)
  const pad = (7 - (YEAR_DAYS % 7)) % 7
  const cells: (string | null)[] = [...Array.from({ length: pad }, () => null), ...days]
  const slips = new Set(slipDays(st, habit.id))
  return (
    <div className="card" style={accent(habit)}>
      <div className="cd-year-head">
        <span className="cd-name">
          {habit.emoji} {habit.name}
        </span>
        <span className="cd-streak num">
          {habit.type === 'build'
            ? habit.targetPerWeek === 7
              ? `${habitStreak(st, habit.id)}d streak`
              : `${weekStreak(st, habit.id)}w streak`
            : `${daysClean(st, habit.id)}d clean`}
        </span>
      </div>
      <div className="cd-year-scroll" ref={scroller}>
        <div className="cd-year-grid">
          {cells.map((day, i) => {
            if (day === null) return <span key={'p' + i} className="cd-ycell blank" />
            const cls =
              habit.type === 'build'
                ? isChecked(st, habit.id, day)
                  ? ' on'
                  : ''
                : slips.has(day)
                  ? ' slip'
                  : ''
            return <span key={day} className={'cd-ycell' + cls + (day === today ? ' today' : '')} />
          })}
        </div>
      </div>
    </div>
  )
}

/* ---------- habit form (add + edit) ---------- */

function HabitForm({
  mode,
  habit,
  open,
  onClose,
}: {
  mode: 'add' | 'edit'
  habit?: Habit
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState<string>(habit?.emoji ?? EMOJI_PRESETS[0])
  const [color, setColor] = useState<string>(habit?.color ?? PALETTE[0])
  const [type, setType] = useState<HabitType>(habit?.type ?? 'build')
  const [cue, setCue] = useState(habit?.cue ?? '')
  const [target, setTarget] = useState<number>(habit?.targetPerWeek ?? 7)

  function commit() {
    if (!name.trim()) {
      toast('Give the habit a name')
      return
    }
    if (mode === 'add') {
      addHabit({ name, emoji, color, type, cue, targetPerWeek: target })
      toast('Habit added')
    } else if (habit) {
      editHabit(habit.id, { name, emoji, color, cue, targetPerWeek: target })
      toast('Habit updated')
    }
    onClose()
  }

  return (
    <Sheet open={open} title={mode === 'add' ? 'New habit' : 'Edit habit'} onClose={onClose}>
      {mode === 'add' && (
        <div className="cd-quick">
          <div className="cd-quick-label">Quick start <span>— tap to prefill</span></div>
          <div className="cd-quick-k">Build</div>
          <div className="cd-quick-row">
            {([['💪','Workout'],['🏃','Run'],['📚','Read'],['🧘','Meditate'],['💧','Drink water'],['✍️','Journal'],['🥦','Eat vegetables'],['🌱','Stretch'],['😴','Sleep by 11pm'],['💊','Vitamins']] as const).map(([em, nm]) => (
              <button key={nm} className="cd-quick-chip" onClick={() => { setName(nm); setEmoji(em); setType('build') }}>
                {em} {nm}
              </button>
            ))}
          </div>
          <div className="cd-quick-k">Quit</div>
          <div className="cd-quick-row">
            {([['🚬','No smoking'],['🍺','No alcohol'],['📵','No doomscrolling'],['🍬','No sugar'],['🎮','No gaming'],['☕','No caffeine'],['🍔','No junk food'],['💸','No impulse buys']] as const).map(([em, nm]) => (
              <button key={nm} className="cd-quick-chip" onClick={() => { setName(nm); setEmoji(em); setType('quit') }}>
                {em} {nm}
              </button>
            ))}
          </div>
        </div>
      )}
      {mode === 'add' ? (
        <Seg<HabitType>
          options={[
            { id: 'build', label: 'Build' },
            { id: 'quit', label: 'Quit' },
          ]}
          value={type}
          onChange={setType}
        />
      ) : null}
      <input
        className="tinput"
        placeholder={type === 'build' ? 'e.g. Read 10 pages' : 'e.g. No cigarettes'}
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginTop: 12 }}
      />
      <input
        className="tinput"
        placeholder="Cue (optional) — e.g. after morning coffee"
        value={cue}
        onChange={(e) => setCue(e.target.value)}
        style={{ marginTop: 10 }}
      />
      {type === 'build' && (
        <>
          <div className="section-label" style={{ marginTop: 14 }}>
            Days per week
          </div>
          <div className="cd-target-row">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                className={'cd-target' + (n === target ? ' on' : '')}
                onClick={() => setTarget(n)}
                aria-pressed={n === target}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="cd-emoji-grid">
        {EMOJI_PRESETS.map((em) => (
          <button key={em} className={'cd-emoji' + (em === emoji ? ' on' : '')} onClick={() => setEmoji(em)}>
            {em}
          </button>
        ))}
      </div>
      <div className="cd-colors">
        {PALETTE.map((c) => (
          <button
            key={c}
            className={'cd-color' + (c === color ? ' on' : '')}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <button className="btn btn-primary" onClick={commit}>
        {mode === 'add' ? 'Add habit' : 'Save changes'}
      </button>
    </Sheet>
  )
}

/* ---------- manage ---------- */

function ManageSheet({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const st = useStore(cadenceStore)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [editing, setEditing] = useState(false)
  if (habit === null) return null
  const isBuild = habit.type === 'build'
  const live = st.habits.find((h) => h.id === habit.id) ?? habit
  return (
    <>
      <Sheet open={!editing} title={`${live.emoji} ${live.name}`} onClose={onClose}>
        <div style={accent(live)}>
          <div className="cd-heat" aria-label="Last eight weeks">
            {lastNDayKeys(56).map((day) => {
              const on = isBuild ? isChecked(st, live.id, day) : false
              const slip = !isBuild && slipDays(st, live.id).includes(day)
              return (
                <span
                  key={day}
                  className={
                    'cd-heat-cell' + (on ? ' on' : '') + (slip ? ' slip' : '') + (day === todayKey() ? ' today' : '')
                  }
                />
              )
            })}
          </div>
          <div className="cd-heat-label">
            Last 8 weeks — {isBuild ? 'checked days' : 'slips'} · today outlined
          </div>
          <div className="kv">
            <span className="k">{isBuild ? (live.targetPerWeek === 7 ? 'Current streak' : 'Week streak') : 'Days clean'}</span>
            <span className="num">
              {isBuild
                ? live.targetPerWeek === 7
                  ? `${habitStreak(st, live.id)} days`
                  : `${weekStreak(st, live.id)} weeks`
                : `${daysClean(st, live.id)} days`}
            </span>
          </div>
          {isBuild && (
            <div className="kv">
              <span className="k">Weekly target</span>
              <span className="num">
                {countInWeek(st, live.id, weekStartKey(todayKey()))}/{live.targetPerWeek}
              </span>
            </div>
          )}
          {live.cue && (
            <div className="kv">
              <span className="k">Cue</span>
              <span>{live.cue}</span>
            </div>
          )}
          <div className="kv">
            <span className="k">Started</span>
            <span>
              {new Date(live.createdTs).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn btn-danger" onClick={() => setConfirmArchive(true)}>
              Archive
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        </div>
      </Sheet>
      {editing && (
        <HabitForm
          mode="edit"
          habit={live}
          open
          onClose={() => {
            setEditing(false)
            onClose()
          }}
        />
      )}
      <ConfirmSheet
        open={confirmArchive}
        title="Archive this habit?"
        body="It disappears from your list but its history stays in your data."
        actionLabel="Archive"
        danger
        onConfirm={() => {
          archiveHabit(habit.id)
          onClose()
          toast('Habit archived')
        }}
        onClose={() => setConfirmArchive(false)}
      />
    </>
  )
}

/* ---------- screen ---------- */

export default function CadenceScreen({ tab = 'today' }: { tab?: string }) {
  const st = useStore(cadenceStore)
  const habits = activeHabits(st)
  const [adding, setAdding] = useState(false)
  const [dayOffset, setDayOffset] = useState(0)
  const viewDay = shiftDay(todayKey(), dayOffset)
  const pagerLabel =
    dayOffset === 0
      ? 'Today'
      : dayOffset === -1
        ? 'Yesterday'
        : new Date(viewDay + 'T12:00:00').toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })
  const [managing, setManaging] = useState<Habit | null>(null)
  const [slipping, setSlipping] = useState<Habit | null>(null)

  return (
    <>
      {tab === 'today' && (
        <>
          <div className="cd-pager">
            <button onClick={() => setDayOffset((o) => o - 1)} aria-label="Previous day">‹</button>
            <span className="cd-pager-label">{pagerLabel}</span>
            <button
              onClick={() => setDayOffset((o) => Math.min(0, o + 1))}
              disabled={dayOffset === 0}
              aria-label="Next day"
            >
              ›
            </button>
          </div>
          {habits.length === 0 ? (
            <Empty title="No habits yet" sub="Small, daily, repeatable — that's where the 1% lives." />
          ) : (
            habits.map((h) =>
              h.type === 'build' ? (
                <BuildRow key={h.id} habit={h} day={viewDay} onManage={() => setManaging(h)} />
              ) : dayOffset === 0 ? (
                <QuitRow
                  key={h.id}
                  habit={h}
                  onManage={() => setManaging(h)}
                  onSlip={() => {
                    logSlip(h.id)
                    toast(`${h.name} — slip logged. Clean days reset; the record stays honest.`)
                  }}
                />
              ) : null,
            )
          )}
          {dayOffset < 0 && (
            <p className="rs-foot">
              Filling in {pagerLabel.toLowerCase()} — events carry that day's timestamp, so streaks
              stay honest. Quit habits log slips only on the day itself.
            </p>
          )}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={() => setAdding(true)}>
              Add habit
            </button>
          </div>
        </>
      )}

      {tab === 'month' && <MonthView />}

      {tab === 'year' &&
        (habits.length === 0 ? (
          <Empty title="Nothing to map yet" sub="The year view fills as you do." />
        ) : (
          <>
            {(() => {
              const yi = yearInsights(st)
              return (
                <div className="ins-grid">
                  <StatBox label="active days" value={String(yi.activeDays)} sub="last 365" />
                  <StatBox label="check-ins" value={String(yi.checkIns)} />
                  <StatBox label="best streak" value={`${yi.bestStreak}d`} />
                  <StatBox label="habits tracked" value={String(yi.habitsTracked)} />
                </div>
              )
            })()}
            {habits.map((h) => (
              <YearGrid key={h.id} habit={h} />
            ))}
          </>
        ))}

      {adding && <HabitForm mode="add" open onClose={() => setAdding(false)} />}
      <ManageSheet
        habit={managing}
        onClose={() => setManaging(null)}
        key={managing ? managing.id : 'none'}
      />
      <ConfirmSheet
        open={slipping !== null}
        title={slipping ? `Log a slip — ${slipping.name}?` : ''}
        body="No judgment. The counter resets to zero and the climb starts again."
        actionLabel="Log slip"
        danger
        onConfirm={() => {
          if (slipping) logSlip(slipping.id)
          toast('Slip logged — day zero')
        }}
        onClose={() => setSlipping(null)}
      />
    </>
  )
}

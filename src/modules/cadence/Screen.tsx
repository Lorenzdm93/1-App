import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { lastNDayKeys, todayKey, shiftDay } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty, Seg } from '../../app/ui'
import {
  cadenceStore,
  activeHabits,
  isChecked,
  addHabit,
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
  EMOJI_PRESETS,
  PALETTE,
  type Habit,
  type HabitType,
} from './model'

function accent(h: Habit): CSSProperties {
  return { ['--h-acc' as string]: h.color } as CSSProperties
}

/* ---------- today ---------- */

function BuildRow({ habit, onManage }: { habit: Habit; onManage: () => void }) {
  const st = useStore(cadenceStore)
  const done = isChecked(st, habit.id)
  const streak = habitStreak(st, habit.id)
  const week = lastNDayKeys(7)
  return (
    <div className="cd-row" style={accent(habit)}>
      <button
        className={'cd-check' + (done ? ' done' : '')}
        onClick={() => toggleCheck(habit.id)}
        aria-label={(done ? 'Uncheck ' : 'Check ') + habit.name}
      >
        {habit.emoji}
      </button>
      <button className="cd-info" onClick={onManage} style={{ textAlign: 'left' }}>
        <div className="cd-name">{habit.name}</div>
        {habit.cue && <div className="cd-cue">{habit.cue}</div>}
        <div className="cd-strip" aria-hidden="true">
          {week.map((day) => (
            <span key={day} className={'cd-cell' + (isChecked(st, habit.id, day) ? ' on' : '')} />
          ))}
        </div>
      </button>
      <span className="cd-streak num">{streak > 0 ? `${streak}d` : '—'}</span>
    </div>
  )
}

function QuitRow({ habit, onManage, onSlip }: { habit: Habit; onManage: () => void; onSlip: () => void }) {
  const st = useStore(cadenceStore)
  const clean = daysClean(st, habit.id)
  const slippedToday = slipDays(st, habit.id).includes(todayKey())
  return (
    <div className="cd-row" style={accent(habit)}>
      <span className="cd-check quit" aria-hidden="true">{habit.emoji}</span>
      <button className="cd-info" onClick={onManage} style={{ textAlign: 'left' }}>
        <div className="cd-name">{habit.name}</div>
        <div className="cd-cue">{clean === 1 ? '1 day clean' : `${clean} days clean`}{habit.cue ? ` · ${habit.cue}` : ''}</div>
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

  return (
    <>
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
            ? `${habitStreak(st, habit.id)}d streak`
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

/* ---------- editor + manage ---------- */

function AddHabitSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>(EMOJI_PRESETS[0])
  const [color, setColor] = useState<string>(PALETTE[0])
  const [type, setType] = useState<HabitType>('build')
  const [cue, setCue] = useState('')

  function commit() {
    if (!name.trim()) {
      toast('Give the habit a name')
      return
    }
    addHabit({ name, emoji, color, type, cue })
    setName('')
    setCue('')
    setEmoji(EMOJI_PRESETS[0])
    setColor(PALETTE[0])
    setType('build')
    onClose()
    toast('Habit added')
  }

  return (
    <Sheet open={open} title="New habit" onClose={onClose}>
      <Seg<HabitType>
        options={[
          { id: 'build', label: 'Build' },
          { id: 'quit', label: 'Quit' },
        ]}
        value={type}
        onChange={setType}
      />
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
        Add habit
      </button>
    </Sheet>
  )
}

function ManageSheet({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const st = useStore(cadenceStore)
  const [confirmArchive, setConfirmArchive] = useState(false)
  if (habit === null) return null
  const isBuild = habit.type === 'build'
  return (
    <>
      <Sheet open title={`${habit.emoji} ${habit.name}`} onClose={onClose}>
        <div style={accent(habit)}>
          <div className="cd-heat" aria-label="Last eight weeks">
            {lastNDayKeys(56).map((day) => {
              const on = isBuild
                ? isChecked(st, habit.id, day)
                : false
              const slip = !isBuild && slipDays(st, habit.id).includes(day)
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
            <span className="k">{isBuild ? 'Current streak' : 'Days clean'}</span>
            <span className="num">
              {isBuild ? `${habitStreak(st, habit.id)} days` : `${daysClean(st, habit.id)} days`}
            </span>
          </div>
          {habit.cue && (
            <div className="kv">
              <span className="k">Cue</span>
              <span>{habit.cue}</span>
            </div>
          )}
          <div className="kv">
            <span className="k">Started</span>
            <span>
              {new Date(habit.createdTs).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-danger" onClick={() => setConfirmArchive(true)}>
              Archive habit
            </button>
          </div>
        </div>
      </Sheet>
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

const VIEWS = [
  { id: 'today', label: 'Today' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
] as const

type View = (typeof VIEWS)[number]['id']

export default function CadenceScreen() {
  const st = useStore(cadenceStore)
  const habits = activeHabits(st)
  const [view, setView] = useState<View>('today')
  const [adding, setAdding] = useState(false)
  const [managing, setManaging] = useState<Habit | null>(null)
  const [slipping, setSlipping] = useState<Habit | null>(null)

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Seg<View> options={VIEWS} value={view} onChange={setView} />
      </div>

      {view === 'today' && (
        <>
          {habits.length === 0 ? (
            <Empty title="No habits yet" sub="Small, daily, repeatable — that's where the 1% lives." />
          ) : (
            <div className="card">
              {habits.map((h) =>
                h.type === 'build' ? (
                  <BuildRow key={h.id} habit={h} onManage={() => setManaging(h)} />
                ) : (
                  <QuitRow
                    key={h.id}
                    habit={h}
                    onManage={() => setManaging(h)}
                    onSlip={() => setSlipping(h)}
                  />
                ),
              )}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={() => setAdding(true)}>
              Add habit
            </button>
          </div>
        </>
      )}

      {view === 'month' && <MonthView />}

      {view === 'year' &&
        (habits.length === 0 ? (
          <Empty title="Nothing to map yet" sub="The year view fills as you do." />
        ) : (
          habits.map((h) => <YearGrid key={h.id} habit={h} />)
        ))}

      <AddHabitSheet open={adding} onClose={() => setAdding(false)} />
      <ManageSheet habit={managing} onClose={() => setManaging(null)} />
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

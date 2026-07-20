import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { todayKey, shiftDay, lastNDayKeys } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty, Field, StatBox } from '../../app/ui'
import {
  cadenceStore,
  activeHabits,
  habitById,
  isChecked,
  isScheduled,
  statusOf,
  scheduleLabel,
  setMood,
  moodOn,
  MOOD_FACES,
  addHabit,
  editHabit,
  archiveHabit,
  setCheck,
  setSlip,
  habitStreak,
  bestBuildStreak,
  daysClean,
  bestClean,
  strength,
  nextMilestone,
  MS_QUIT,
  rangeStat,
  dayIntensity,
  monthGrid,
  monthDayKey,
  monthInsights,
  monthMoodAvg,
  yearWeeks,
  yearInsights,
  EMOJI_PRESETS,
  PRESETS,
  PALETTE,
  type Habit,
  type HabitType,
  type YearCell,
} from './model'

/* Cross-tab handoff: Month/Year cells open their day in Today. Consumed on mount. */
let pendingDay: string | null = null
function openDayInToday(day: string): void {
  pendingDay = day
  navigate('/m/cadence/today')
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function hc(h: Habit): CSSProperties {
  return { ['--hc' as string]: h.color } as CSSProperties
}

function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

/* ---------- Today: ring summary ---------- */

function RingCard({ viewDay }: { viewDay: string }) {
  const st = useStore(cadenceStore)
  const habits = activeHabits(st)
  const sched = habits.filter(
    (h) => h.type === 'build' && viewDay >= h.startDate && isScheduled(h, viewDay),
  )
  const doneCt = sched.filter((h) => isChecked(st, h.id, viewDay)).length
  const slips = habits.filter(
    (h) => h.type === 'quit' && (st.slips[h.id] ?? []).includes(viewDay),
  ).length
  const pct = sched.length > 0 ? doneCt / sched.length : 0
  const allDone = sched.length > 0 && doneCt === sched.length && slips === 0
  const R = 20
  const C = 2 * Math.PI * R
  const headline =
    sched.length > 0
      ? doneCt === sched.length
        ? 'All done 🎉'
        : `${doneCt} of ${sched.length} done`
      : 'No scheduled habits'
  const subline =
    slips > 0
      ? `${slips} slip${slips > 1 ? 's' : ''} logged ${viewDay === todayKey() ? 'today' : 'this day'}`
      : allDone
        ? 'Great consistency today'
        : 'Tap a circle to check off'
  return (
    <div className={'cd-ringcard' + (allDone ? ' done' : '')}>
      <span className="cd-ring" aria-hidden="true">
        <svg width="46" height="46" viewBox="0 0 46 46">
          <circle cx="23" cy="23" r={R} stroke="var(--ring-track)" strokeWidth="5" fill="none" />
          <circle
            cx="23" cy="23" r={R}
            stroke="var(--accent)" strokeWidth="5" fill="none" strokeLinecap="round"
            strokeDasharray={String(C)} strokeDashoffset={String(C * (1 - pct))}
            transform="rotate(-90 23 23)"
            style={{ transition: 'stroke-dashoffset 0.5s var(--ease)' }}
          />
        </svg>
        <i className="num">{sched.length > 0 ? Math.round(pct * 100) : '—'}</i>
      </span>
      <span className="cd-ringtxt">
        <b>{headline}</b>
        <span>{subline}</span>
      </span>
    </div>
  )
}

/* ---------- Today: habit cards ---------- */

function MiniStrip({ habit, endDay }: { habit: Habit; endDay: string }) {
  const st = useStore(cadenceStore)
  return (
    <span className="cd-mini" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => {
        const day = shiftDay(endDay, i - 6)
        const s = statusOf(st, habit, day)
        const cls =
          s === 'done' || s === 'clean' ? ' on' : s === 'slip' ? ' slip' : s === 'off' ? ' off' : s === 'pre' ? ' pre' : ''
        return <i key={day} className={'m' + cls + (day === endDay ? ' now' : '')} />
      })}
    </span>
  )
}

function HabitCard({
  habit,
  viewDay,
  onManage,
}: {
  habit: Habit
  viewDay: string
  onManage: () => void
}) {
  const st = useStore(cadenceStore)
  const today = todayKey()
  const isBuild = habit.type === 'build'
  const offDay = isBuild && !isScheduled(habit, viewDay)
  const preDay = viewDay < habit.startDate
  const done = isBuild && isChecked(st, habit.id, viewDay)
  const slipped = !isBuild && (st.slips[habit.id] ?? []).includes(viewDay)
  const badge = scheduleLabel(habit)
  const clean = daysClean(st, habit.id)
  const str = strength(st, habit.id)
  const ms = !isBuild && !slipped ? nextMilestone(clean, MS_QUIT) : null

  return (
    <div className={'cd-card' + (offDay || preDay ? ' muted' : '')} style={hc(habit)}>
      <span className="cd-accbar" aria-hidden="true" />
      <button className="cd-emoji" onClick={onManage} aria-label={`Open ${habit.name}`}>
        {habit.emoji}
      </button>
      <button className="cd-mid" onClick={onManage}>
        <span className="cd-name">
          {habit.name}
          {!isBuild && <i className="cd-badge quit">quit</i>}
          {badge && <i className="cd-badge">{badge}</i>}
          {offDay && <i className="cd-badge">rest day</i>}
        </span>
        {habit.cue && <span className="cd-cue">{habit.cue}</span>}
        <span className="cd-meta">
          {isBuild ? (
            <span className="cd-streakline">
              🔥 <b className="num">{habitStreak(st, habit.id)}</b>{' '}
              {habitStreak(st, habit.id) === 1 ? 'day' : 'days'}
            </span>
          ) : (
            <span className="cd-streakline">
              Best clean <b className="num">{bestClean(st, habit.id)}</b>d
            </span>
          )}
          <span className="cd-strength">
            Strength <i className="cd-sbar"><i style={{ width: `${str}%` }} /></i>{' '}
            <b className="num">{str}</b>
          </span>
        </span>
        <MiniStrip habit={habit} endDay={viewDay} />
      </button>
      <span className="cd-right">
        {isBuild ? (
          <button
            className={'cd-check' + (done ? ' on' : '')}
            disabled={preDay}
            onClick={() => setCheck(habit.id, viewDay, !done)}
            aria-pressed={done}
            aria-label={(done ? 'Uncheck ' : 'Check off ') + habit.name}
          >
            <CheckGlyph />
          </button>
        ) : (
          <span className="cd-quitctl">
            <span className="cd-cleannum num">
              {slipped ? 0 : clean}
              <small> {(slipped ? 0 : clean) === 1 ? 'day clean' : 'days clean'}</small>
            </span>
            <button
              className={'cd-slipbtn' + (slipped ? ' active' : '')}
              disabled={preDay}
              aria-pressed={slipped}
              onClick={() => {
                setSlip(habit.id, viewDay, !slipped)
                if (!slipped && viewDay === today) {
                  toast(`${habit.name} — slip logged. Clean days reset; the record stays honest.`)
                }
              }}
            >
              {slipped ? 'Slipped ✓' : 'Log slip'}
            </button>
            {ms !== null && (
              <span className="cd-nextms">
                {ms - clean} day{ms - clean === 1 ? '' : 's'} to {ms}
              </span>
            )}
          </span>
        )}
      </span>
    </div>
  )
}

/* ---------- Today view ---------- */

function TodayView({ onAdd, onManage }: { onAdd: () => void; onManage: (h: Habit) => void }) {
  const st = useStore(cadenceStore)
  const [viewDay, setViewDay] = useState<string>(() => {
    const p = pendingDay
    pendingDay = null
    return p ?? todayKey()
  })
  const today = todayKey()
  const isToday = viewDay === today
  const habits = activeHabits(st)
  const ordered = [...habits].sort((a, b) => {
    const as = viewDay >= a.startDate && isScheduled(a, viewDay) ? 0 : 1
    const bs = viewDay >= b.startDate && isScheduled(b, viewDay) ? 0 : 1
    return as - bs
  })
  const d = new Date(viewDay + 'T12:00:00')

  return (
    <>
      <div className="cd-dayhead">
        <button className="cd-dnav" onClick={() => setViewDay((v) => shiftDay(v, -1))} aria-label="Previous day">‹</button>
        <span className="cd-dwrap">
          <i className="dow">{DOW_SHORT[d.getDay()]}, {MON_SHORT[d.getMonth()]} {d.getDate()}</i>
          <b className="date">{isToday ? 'Today' : `${MONTHS[d.getMonth()]} ${d.getDate()}`}</b>
        </span>
        <button
          className="cd-dnav"
          onClick={() => setViewDay((v) => shiftDay(v, 1))}
          disabled={isToday}
          aria-label="Next day"
        >
          ›
        </button>
        {!isToday && (
          <button className="cd-jump" onClick={() => setViewDay(today)}>Jump to today</button>
        )}
      </div>

      {habits.length > 0 && <RingCard viewDay={viewDay} />}

      <div className="cd-mood">
        <span className="cd-mood-k">
          Mood
          {(() => {
            const vals = Object.entries(st.moods ?? {})
              .sort(([a], [b]) => (a < b ? 1 : -1))
              .slice(0, 7)
              .map(([, v]) => v)
            if (vals.length === 0) return null
            const avg = vals.reduce((s, v) => s + v, 0) / vals.length
            return <i className="cd-mood-avg">{MOOD_FACES[Math.round(avg) - 1]} 7d</i>
          })()}
        </span>
        {MOOD_FACES.map((em, i) => (
          <button
            key={em}
            className={'cd-mood-btn' + (moodOn(st, viewDay) === i + 1 ? ' on' : '')}
            aria-label={`Mood ${i + 1} of 5`}
            onClick={() => setMood(viewDay, i + 1)}
          >
            {em}
          </button>
        ))}
      </div>

      {habits.length === 0 ? (
        <Empty title="No habits yet" sub="Small, daily, repeatable — that's where the 1% lives." />
      ) : (
        <div className="cd-cards">
          {ordered.map((h) => (
            <HabitCard key={h.id} habit={h} viewDay={viewDay} onManage={() => onManage(h)} />
          ))}
        </div>
      )}

      {!isToday && habits.length > 0 && (
        <p className="rs-foot">
          Filling in a past day — checks carry that day's own timestamp, so streaks stay honest.
        </p>
      )}

      <button className="cd-addbtn" onClick={onAdd}>
        <i aria-hidden="true">＋</i> Add habit
      </button>
    </>
  )
}

/* ---------- Month view ---------- */

function intensityLevel(r: number | null): number | null {
  if (r === null) return null
  if (r <= 0) return 0
  if (r >= 1) return 4
  if (r >= 0.75) return 3
  if (r >= 0.5) return 2
  return 1
}

function Legend() {
  return (
    <div className="cd-legend" aria-hidden="true">
      Less
      {[0, 1, 2, 3, 4].map((l) => (
        <i key={l} className={'lc l' + l} />
      ))}
      More
    </div>
  )
}

function stripCellClass(s: ReturnType<typeof statusOf>): string {
  if (s === 'done' || s === 'clean') return ' on'
  if (s === 'slip') return ' slip'
  if (s === 'off') return ' off'
  if (s === 'pre' || s === 'future') return ' pre'
  return ''
}

function MonthView() {
  const st = useStore(cadenceStore)
  const now = new Date()
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() })
  const grid = monthGrid(ym.y, ym.m)
  const today = todayKey()
  const habits = activeHabits(st)
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth()

  function move(delta: number) {
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  const ins = monthInsights(st, grid)
  const moodAvg = monthMoodAvg(st, grid)
  const aKey = monthDayKey(grid, 1)
  const bKey = monthDayKey(grid, grid.days)

  return (
    <>
      <div className="cd-secnav">
        <button className="cd-dnav" onClick={() => move(-1)} aria-label="Previous month">‹</button>
        <b className="cd-seclabel">{MONTHS[ym.m]} {ym.y}</b>
        <button className="cd-dnav" onClick={() => move(1)} disabled={isCurrent} aria-label="Next month">›</button>
      </div>

      <div className="ins-grid">
        <StatBox label="avg completion" value={ins.avgCompletion !== null ? `${ins.avgCompletion}%` : '—'} />
        <StatBox label="active habits" value={String(ins.activeHabits)} />
        <StatBox
          label="most consistent"
          value={ins.mostConsistent ? `${ins.mostConsistent.emoji} ${ins.mostConsistent.pct}%` : '—'}
          sub={ins.mostConsistent ? ins.mostConsistent.name : undefined}
        />
        <StatBox label="avg mood" value={moodAvg !== null ? `${MOOD_FACES[Math.round(moodAvg) - 1]} ${moodAvg}` : '—'} />
      </div>

      {habits.length === 0 ? (
        <Empty title="No habits yet" sub="Add some from the Today tab — the month fills in as you do." />
      ) : (
        <>
          <div className="card">
            <div className="cd-divider">Overall — daily completion</div>
            <div className="cd-cal">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <span className="cd-caldow" key={d}>{d}</span>
              ))}
              {Array.from({ length: grid.leadingBlanks }).map((_, i) => (
                <span key={'b' + i} className="cd-calcell blank" />
              ))}
              {Array.from({ length: grid.days }).map((_, i) => {
                const day = monthDayKey(grid, i + 1)
                const future = day > today
                const lvl = future ? null : intensityLevel(dayIntensity(st, day))
                return (
                  <button
                    key={day}
                    className={
                      'cd-calcell' +
                      (lvl !== null ? ' l' + lvl : '') +
                      (day === today ? ' today' : '') +
                      (future ? ' future' : '')
                    }
                    disabled={future}
                    onClick={() => openDayInToday(day)}
                    aria-label={`Open ${day}`}
                  >
                    <i className="cd-calnum num">{i + 1}</i>
                  </button>
                )
              })}
            </div>
            <Legend />
          </div>

          <div className="card">
            <div className="cd-divider">By habit</div>
            {habits.map((h) => {
              const s = rangeStat(st, h, aKey, bKey)
              const isBuild = h.type === 'build'
              const streak = isBuild ? habitStreak(st, h.id) : daysClean(st, h.id)
              return (
                <div className="cd-hrow" key={h.id} style={hc(h)}>
                  <span className="cd-hlead">
                    <i className="cd-he">{h.emoji}</i>
                    <span className="cd-hmeta">
                      <b className="cd-hn">{h.name}</b>
                      <i className="cd-hsub">{!isBuild ? 'quit' : scheduleLabel(h) ?? 'daily'}</i>
                    </span>
                  </span>
                  <span className="cd-strip">
                    {Array.from({ length: grid.days }).map((_, i) => {
                      const day = monthDayKey(grid, i + 1)
                      const status = statusOf(st, h, day)
                      const dead = status === 'pre' || status === 'future'
                      return (
                        <button
                          key={day}
                          className={'sc' + stripCellClass(status) + (day === today ? ' today' : '')}
                          disabled={dead}
                          aria-label={`${h.name} · ${day}`}
                          onClick={() => {
                            if (isBuild) setCheck(h.id, day, !isChecked(st, h.id, day))
                            else setSlip(h.id, day, !(st.slips[h.id] ?? []).includes(day))
                          }}
                        />
                      )
                    })}
                  </span>
                  <span className="cd-hstats">
                    <span className="hs">
                      <b className="n num">{s.rate !== null ? `${s.rate}%` : '—'}</b>
                      <i className="l">this month</i>
                    </span>
                    <span className="hs">
                      <b className="n num">{streak}</b>
                      <i className="l">{isBuild ? 'streak' : 'days clean'}</i>
                    </span>
                  </span>
                </div>
              )
            })}
            <p className="cd-hint">Tap any cell to fill in or correct a past day. Tap a calendar day to open it.</p>
          </div>
        </>
      )}
    </>
  )
}

/* ---------- Year view ---------- */

function Heatmap({
  weeks,
  cell,
  scrollToToday,
}: {
  weeks: YearCell[][]
  cell: (day: string) => { cls?: string; bg?: string } | null
  scrollToToday: boolean
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const today = todayKey()
  useEffect(() => {
    const node = wrap.current
    if (!node || !scrollToToday) return
    const idx = weeks.findIndex((wk) => wk.some((c) => c.key === today))
    if (idx >= 0 && node.scrollWidth > node.clientWidth) {
      node.scrollLeft = Math.max(0, idx * 14 - node.clientWidth * 0.6)
    }
  }, [weeks, scrollToToday, today])

  const labels: { left: number; text: string }[] = []
  let lastMonth = -1
  weeks.forEach((wk, i) => {
    const first = wk.find((c) => c.inYear)
    if (!first) return
    const mo = Number(first.key.slice(5, 7)) - 1
    if (mo !== lastMonth) {
      labels.push({ left: i * 14, text: MON_SHORT[mo] })
      lastMonth = mo
    }
  })

  return (
    <div className="cd-heatwrap" ref={wrap}>
      <div className="cd-heatmonths" aria-hidden="true">
        {labels.map((l) => (
          <span key={l.text + l.left} style={{ left: l.left }}>{l.text}</span>
        ))}
      </div>
      <div className="cd-heatbody">
        <div className="cd-heatdays" aria-hidden="true">
          {['', 'T', '', 'T', '', 'S', ''].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="cd-heat">
          {weeks.map((wk, wi) => (
            <div className="cd-hcol" key={wi}>
              {wk.map((c) => {
                if (!c.inYear) return <i key={c.key} className="cd-hc ghost" />
                const r = cell(c.key)
                const style = r?.bg ? ({ background: r.bg } as CSSProperties) : undefined
                return (
                  <button
                    key={c.key}
                    className={'cd-hc' + (r?.cls ?? '') + (c.key === today ? ' today' : '')}
                    style={style}
                    disabled={c.key > today}
                    onClick={() => openDayInToday(c.key)}
                    aria-label={`Open ${c.key}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function YearView() {
  const st = useStore(cadenceStore)
  const nowYear = new Date().getFullYear()
  const [year, setYear] = useState(nowYear)
  const habits = activeHabits(st)
  const weeks = yearWeeks(year)
  const today = todayKey()
  const yi = yearInsights(st, year)
  const aKey = `${year}-01-01`
  const bKey = `${year}-12-31`

  return (
    <>
      <div className="cd-secnav">
        <button className="cd-dnav" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">‹</button>
        <b className="cd-seclabel">{year}</b>
        <button className="cd-dnav" onClick={() => setYear((y) => y + 1)} disabled={year >= nowYear} aria-label="Next year">›</button>
      </div>

      <div className="ins-grid">
        <StatBox label="check-ins" value={String(yi.checkIns)} />
        <StatBox label="best streak" value={`${yi.bestStreak}d`} />
        <StatBox label="active days" value={String(yi.activeDays)} />
        <StatBox label="avg mood" value={yi.avgMood !== null ? `${MOOD_FACES[Math.round(yi.avgMood) - 1]} ${yi.avgMood}` : '—'} />
      </div>

      {habits.length === 0 ? (
        <Empty title="Nothing to map yet" sub="The year view fills as you do." />
      ) : (
        <>
          <div className="card">
            <div className="cd-divider">Everything — consistency across the year</div>
            <Heatmap
              weeks={weeks}
              scrollToToday={year === nowYear}
              cell={(day) => {
                if (day > today) return null
                const lvl = intensityLevel(dayIntensity(st, day))
                return lvl !== null ? { cls: ' l' + lvl } : null
              }}
            />
            <Legend />
          </div>

          <div className="card">
            <div className="cd-divider">By habit</div>
            {habits.map((h) => {
              const s = rangeStat(st, h, aKey, bKey)
              const best = h.type === 'build' ? bestBuildStreak(st, h.id) : bestClean(st, h.id)
              return (
                <div className="cd-yhrow" key={h.id} style={hc(h)}>
                  <div className="cd-yhhead">
                    <i className="cd-he">{h.emoji}</i>
                    <b className="cd-hn">
                      {h.name}
                      {h.type === 'quit' && <i className="cd-badge quit">quit</i>}
                    </b>
                    <span className="cd-yst">
                      <span>Rate <b className="num">{s.rate !== null ? `${s.rate}%` : '—'}</b></span>
                      <span>Best <b className="num">{best}</b>d</span>
                      <span>Strength <b className="num">{strength(st, h.id)}</b></span>
                    </span>
                  </div>
                  <Heatmap
                    weeks={weeks}
                    scrollToToday={year === nowYear}
                    cell={(day) => {
                      const status = statusOf(st, h, day)
                      if (status === 'pre' || status === 'future') return null
                      if (status === 'done' || status === 'clean') return { bg: h.color }
                      if (status === 'slip') return { cls: ' slip' }
                      if (status === 'off') return { cls: ' off' }
                      return { cls: ' miss' }
                    }}
                  />
                </div>
              )
            })}
            <p className="cd-hint">Each square is a day — swipe sideways for the whole year. Tap a square to open that day.</p>
          </div>
        </>
      )}
    </>
  )
}

/* ---------- habit form (add + edit) ---------- */

const DAY_CHIPS: { dow: number; label: string }[] = [
  { dow: 1, label: 'Mon' }, { dow: 2, label: 'Tue' }, { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' }, { dow: 5, label: 'Fri' }, { dow: 6, label: 'Sat' }, { dow: 0, label: 'Sun' },
]

function HabitForm({
  mode,
  habit,
  onClose,
}: {
  mode: 'add' | 'edit'
  habit?: Habit
  onClose: () => void
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [emoji, setEmoji] = useState<string>(habit?.emoji ?? '✅')
  const [color, setColor] = useState<string>(habit?.color ?? PALETTE[0])
  const [type, setType] = useState<HabitType>(habit?.type ?? 'build')
  const [cue, setCue] = useState(habit?.cue ?? '')
  const [schedMode, setSchedMode] = useState<'daily' | 'days'>(habit?.schedule.mode ?? 'daily')
  const [days, setDays] = useState<number[]>(
    habit?.schedule.mode === 'days' ? [...habit.schedule.days] : [1, 2, 3, 4, 5],
  )
  const [startDate, setStartDate] = useState<string>(habit?.startDate ?? todayKey())
  const isQuit = type === 'quit'

  function commit() {
    if (!name.trim()) {
      toast('Give your habit a name first.')
      return
    }
    if (!isQuit && schedMode === 'days' && days.length === 0) {
      toast('Pick at least one day.')
      return
    }
    const schedule =
      isQuit || schedMode === 'daily'
        ? ({ mode: 'daily' } as const)
        : ({ mode: 'days', days: [...days].sort((a, b) => a - b) } as const)
    if (mode === 'add') {
      addHabit({ name, emoji, color, type, schedule, startDate, cue })
      toast(`${emoji} “${name.trim()}” added.`)
    } else if (habit) {
      editHabit(habit.id, { name, emoji, color, type, schedule, startDate, cue })
      toast('Habit updated')
    }
    onClose()
  }

  return (
    <Sheet open title={mode === 'add' ? 'New habit' : 'Edit habit'} onClose={onClose}>
      {mode === 'add' && (
        <>
          <Field label="Quick start — tap to prefill">
            <div className="cd-qk">Build</div>
            <div className="cd-qchips">
              {PRESETS.build.map(([em, nm]) => (
                <button key={nm} className="cd-qchip" onClick={() => { setName(nm); setEmoji(em); setType('build') }}>
                  {em} {nm}
                </button>
              ))}
            </div>
            <div className="cd-qk">Quit</div>
            <div className="cd-qchips">
              {PRESETS.quit.map(([em, nm]) => (
                <button key={nm} className="cd-qchip q" onClick={() => { setName(nm); setEmoji(em); setType('quit') }}>
                  {em} {nm}
                </button>
              ))}
            </div>
          </Field>
          <div className="cd-divider">or set up your own</div>
        </>
      )}

      <Field label="Type">
        <div className="cd-typeseg">
          <button className={'opt' + (!isQuit ? ' sel' : '')} onClick={() => setType('build')}>
            <b>🎯 Build</b>
            <i>Do it — check off each day</i>
          </button>
          <button className={'opt q' + (isQuit ? ' sel' : '')} onClick={() => setType('quit')}>
            <b>🚫 Quit</b>
            <i>Avoid it — count days clean</i>
          </button>
        </div>
      </Field>

      <Field label="Name">
        <input
          className="tinput"
          placeholder={isQuit ? 'e.g. No smoking' : 'e.g. Morning workout'}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Icon">
        <div className="cd-emoji-grid">
          {EMOJI_PRESETS.map((em) => (
            <button key={em} className={'eg' + (em === emoji ? ' sel' : '')} onClick={() => setEmoji(em)}>
              {em}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Color">
        <div className="cd-swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={'sw' + (c === color ? ' sel' : '')}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </Field>

      {!isQuit && (
        <Field label="Repeat">
          <div className="cd-minitabs">
            <button className={schedMode === 'daily' ? 'on' : ''} onClick={() => setSchedMode('daily')}>Every day</button>
            <button className={schedMode === 'days' ? 'on' : ''} onClick={() => setSchedMode('days')}>Specific days</button>
          </div>
          {schedMode === 'days' && (
            <div className="cd-days">
              {DAY_CHIPS.map(({ dow, label }) => (
                <button
                  key={dow}
                  className={'dp' + (days.includes(dow) ? ' on' : '')}
                  aria-pressed={days.includes(dow)}
                  onClick={() =>
                    setDays((d) => (d.includes(dow) ? d.filter((x) => x !== dow) : [...d, dow]))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </Field>
      )}

      <Field label={isQuit ? 'Quit date' : 'Start date'}>
        <input
          className="tinput"
          type="date"
          value={startDate}
          max={todayKey()}
          onChange={(e) => { if (e.target.value) setStartDate(e.target.value) }}
        />
        <p className="cd-hint">
          {isQuit ? 'The day you quit — your clean streak counts from here.' : "Days before this aren't counted."}
        </p>
      </Field>

      <Field label="Cue / reminder (optional)">
        <input
          className="tinput"
          placeholder={isQuit ? 'e.g. When I crave it, I drink water instead' : 'e.g. After I make coffee, I meditate for 10 min'}
          value={cue}
          maxLength={140}
          onChange={(e) => setCue(e.target.value)}
        />
        <p className="cd-hint">A specific “when/where” cue makes habits far more likely to stick.</p>
      </Field>

      <button className="btn btn-primary cd-commit" onClick={commit}>
        {mode === 'add' ? 'Add habit' : 'Save changes'}
      </button>
    </Sheet>
  )
}

/* ---------- manage sheet ---------- */

function ManageSheet({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const st = useStore(cadenceStore)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [editing, setEditing] = useState(false)
  if (habit === null) return null
  const live = habitById(st, habit.id) ?? habit
  const isBuild = live.type === 'build'
  return (
    <>
      {!editing && (
        <Sheet open title={`${live.emoji} ${live.name}`} onClose={onClose}>
          <div style={hc(live)}>
            <div className="cd-heat8" aria-label="Last eight weeks">
              {lastNDayKeys(56).map((day) => {
                const s = statusOf(st, live, day)
                const style =
                  s === 'done' || s === 'clean' ? ({ background: live.color } as CSSProperties) : undefined
                return <i key={day} className={'hc' + stripCellClass(s) + (day === todayKey() ? ' today' : '')} style={style} />
              })}
            </div>
            <p className="cd-hint">Last 8 weeks — today outlined.</p>
            <div className="kv">
              <span className="k">{isBuild ? 'Current streak' : 'Days clean'}</span>
              <span className="num">{isBuild ? `${habitStreak(st, live.id)} days` : `${daysClean(st, live.id)} days`}</span>
            </div>
            <div className="kv">
              <span className="k">Best {isBuild ? 'streak' : 'clean run'}</span>
              <span className="num">{isBuild ? bestBuildStreak(st, live.id) : bestClean(st, live.id)} days</span>
            </div>
            <div className="kv">
              <span className="k">Strength</span>
              <span className="num">{strength(st, live.id)} / 100</span>
            </div>
            <div className="kv">
              <span className="k">Schedule</span>
              <span>{isBuild ? scheduleLabel(live) ?? 'Every day' : 'Every day'}</span>
            </div>
            {live.cue && (
              <div className="kv">
                <span className="k">Cue</span>
                <span>{live.cue}</span>
              </div>
            )}
            <div className="kv">
              <span className="k">{isBuild ? 'Started' : 'Quit date'}</span>
              <span>
                {new Date(live.startDate + 'T12:00:00').toLocaleDateString(undefined, {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            </div>
            <div className="btn-row" style={{ marginTop: 14 }}>
              <button className="btn btn-danger" onClick={() => setConfirmArchive(true)}>Archive</button>
              <button className="btn btn-ghost" onClick={() => setEditing(true)}>Edit</button>
            </div>
          </div>
        </Sheet>
      )}
      {editing && (
        <HabitForm
          mode="edit"
          habit={live}
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
  const [adding, setAdding] = useState(false)
  const [managing, setManaging] = useState<Habit | null>(null)

  return (
    <>
      {tab === 'today' && <TodayView onAdd={() => setAdding(true)} onManage={setManaging} />}
      {tab === 'month' && <MonthView />}
      {tab === 'year' && <YearView />}

      {adding && <HabitForm mode="add" onClose={() => setAdding(false)} />}
      <ManageSheet
        habit={managing}
        onClose={() => setManaging(null)}
        key={managing ? managing.id : 'none'}
      />
    </>
  )
}

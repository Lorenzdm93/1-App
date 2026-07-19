import { useRef, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { formatDuration } from '../../core/dates'
import { navigate } from '../../core/router'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty, parseNum, StatBox } from '../../app/ui'
import { Bars, Line } from '../../app/charts'
import {
  ghisaStore,
  EXERCISES,
  startSession,
  startFromTemplate,
  duplicateTemplate,
  addExercise,
  removeExercise,
  addPlannedSet,
  updateSet,
  completeSet,
  uncompleteSet,
  removeSet,
  cycleSetType,
  finishSession,
  discardSession,
  skipRest,
  adjustRest,
  saveTemplate,
  deleteTemplate,
  sessionVolume,
  sessionSets,
  doneSets,
  workingSets,
  previousSets,
  historicalMaxWeight,
  exerciseHistory,
  e1rmSeries,
  bestSet,
  allExerciseNames,
  topExercises,
  periodRange,
  aggregatePeriod,
  pctDelta,
  periodBuckets,
  TRAINING_ADVICE,
  type Period,
  type ExerciseEntry,
  type Session,
  type SetEntry,
  type SetType,
  type Template,
  type TemplateExercise,
} from './model'

const TYPE_BADGE: Record<SetType, string> = { normal: '', warmup: 'W', drop: 'D', fail: 'F' }

function useNow(activeWhile: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!activeWhile) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [activeWhile])
  return now
}

function setLine(sets: SetEntry[]): string {
  return sets.map((s) => `${s.weight}×${s.reps}${s.type === 'warmup' ? 'w' : ''}`).join(' · ')
}

/* ---------- exercise picker (shared by session + template editor) ---------- */

function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (name: string) => void
}) {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return EXERCISES
    return EXERCISES.filter((e) => e.toLowerCase().includes(q))
  }, [query])
  function pick(name: string) {
    onPick(name)
    setQuery('')
    onClose()
  }
  return (
    <Sheet open={open} title="Choose exercise" onClose={onClose}>
      <input
        className="tinput"
        placeholder="Search or type a new exercise"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <div className="gh-exlist">
        {matches.map((e) => (
          <button key={e} onClick={() => pick(e)}>
            {e}
          </button>
        ))}
        {query.trim() && !matches.some((m) => m.toLowerCase() === query.trim().toLowerCase()) && (
          <button onClick={() => pick(query)} style={{ color: 'var(--m-ghisa)', fontWeight: 700 }}>
            Add “{query.trim()}”
          </button>
        )}
      </div>
    </Sheet>
  )
}

/* ---------- exercise overview sheet ---------- */

function ExerciseSheet({
  name,
  history,
  onClose,
}: {
  name: string | null
  history: Session[]
  onClose: () => void
}) {
  if (name === null) return null
  const days = exerciseHistory(history, name)
  const series = e1rmSeries(history, name)
  const best = bestSet(history, name)
  return (
    <Sheet open title={name} onClose={onClose}>
      {days.length === 0 ? (
        <Empty title="No sets yet" sub="This exercise has no logged history." />
      ) : (
        <>
          <div className="w-stat-row">
            <div className="w-stat">
              <div className="v num">{best ? `${best.weight} kg` : '—'}</div>
              <div className="k">best set{best ? ` · ×${best.reps}` : ''}</div>
            </div>
            <div className="w-stat">
              <div className="v num">{series.length > 0 ? `${series[series.length - 1]}` : '—'}</div>
              <div className="k">last e1RM · kg</div>
            </div>
          </div>
          {series.length >= 2 && (
            <div style={{ marginTop: 12 }}>
              <Line values={series} accentVar="var(--m-ghisa)" />
              <div className="cd-heat-label">e1RM per session — oldest to newest</div>
            </div>
          )}
          <div className="section-label" style={{ marginTop: 8 }}>
            Recent sessions
          </div>
          {days.slice(0, 6).map((d) => (
            <div className="kv" key={d.ts}>
              <span className="k">
                {new Date(d.ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </span>
              <span className="num" style={{ textAlign: 'right' }}>
                {setLine(d.sets)}
              </span>
            </div>
          ))}
        </>
      )}
    </Sheet>
  )
}

/* ---------- rest bar ---------- */

function RestBar({ now }: { now: number }) {
  const st = useStore(ghisaStore)
  useEffect(() => {
    if (st.restUntil !== null && st.restUntil <= now) {
      skipRest()
      toast('Rest over — back to the bar')
    }
  }, [st.restUntil, now])
  if (st.restUntil === null || st.restUntil <= now) return null
  const remaining = Math.ceil((st.restUntil - now) / 1000)
  const frac = Math.min(1, (st.restUntil - now) / (st.restSeconds * 1000))
  return (
    <div className="gh-rest">
      <div className="gh-rest-top">
        <span className="t">Rest</span>
        <span className="v num">{remaining}s</span>
      </div>
      <div className="gh-rest-bar">
        <i style={{ width: `${frac * 100}%` }} />
      </div>
      <div className="gh-rest-actions">
        <button onClick={() => adjustRest(-15)}>−15</button>
        <button onClick={() => adjustRest(15)}>+15</button>
        <button onClick={skipRest}>Skip</button>
      </div>
    </div>
  )
}

/* ---------- live session ---------- */

function SetRow({
  exercise,
  set,
  index,
  prev,
  prevMax,
}: {
  exercise: ExerciseEntry
  set: SetEntry
  index: number
  prev: SetEntry[]
  prevMax: number
}) {
  const [weight, setWeight] = useState(set.weight > 0 ? String(set.weight) : '')
  const [reps, setReps] = useState(set.reps > 0 ? String(set.reps) : '')
  const prevAt = prev[index]
  const empty = set.weight === 0 && set.reps === 0 && !set.done
  const [dx, setDx] = useState(0)
  const touchX = useRef<number | null>(null)

  function commitField(field: 'weight' | 'reps', raw: string) {
    const n = parseNum(raw)
    updateSet(exercise.id, set.id, { [field]: n === null ? 0 : field === 'reps' ? Math.round(n) : n })
  }

  function toggleDone() {
    if (set.done) {
      uncompleteSet(exercise.id, set.id)
      return
    }
    const ok = completeSet(
      exercise.id,
      set.id,
      prevAt ? { weight: prevAt.weight, reps: prevAt.reps } : undefined,
    )
    if (!ok) {
      toast('Enter reps first')
      return
    }
    // Reflect adopted previous values in the inputs
    const after = ghisaStore
      .get()
      .active?.exercises.find((e) => e.id === exercise.id)
      ?.sets.find((s) => s.id === set.id)
    if (after) {
      setWeight(after.weight > 0 ? String(after.weight) : '')
      setReps(after.reps > 0 ? String(after.reps) : '')
    }
  }

  return (
    <div
      className={'gh-row' + (set.done ? ' done' : '') + (dx < 0 ? ' swiping' : '')}
      onTouchStart={(e: { touches: { clientX: number }[] }) => {
        touchX.current = e.touches[0].clientX
      }}
      onTouchMove={(e: { touches: { clientX: number }[] }) => {
        if (touchX.current === null) return
        setDx(Math.min(0, Math.max(-96, e.touches[0].clientX - touchX.current)))
      }}
      onTouchEnd={() => {
        if (dx < -70) removeSet(exercise.id, set.id)
        setDx(0)
        touchX.current = null
      }}
    >
      <span className="gh-del-hint" aria-hidden="true">Delete</span>
      <div className="gh-row-inner" style={{ transform: `translateX(${dx}px)` }}>
      <button
        className={'gh-type gh-type-' + set.type}
        onClick={() => cycleSetType(exercise.id, set.id)}
        aria-label="Change set type"
      >
        {TYPE_BADGE[set.type] || index + 1}
      </button>
      <span className="gh-prevcol num">
        {prevAt ? `${prevAt.weight}×${prevAt.reps}` : '—'}
        {set.done && set.type !== 'warmup' && prevMax > 0 && set.weight > prevMax && (
          <span className="gh-pr">PR</span>
        )}
      </span>
      <input
        className="tinput gh-in"
        inputMode="decimal"
        placeholder={prevAt ? String(prevAt.weight) : 'kg'}
        value={weight}
        onChange={(e) => {
          setWeight(e.target.value)
          commitField('weight', e.target.value)
        }}
        aria-label="Weight in kilograms"
      />
      <input
        className="tinput gh-in"
        inputMode="numeric"
        placeholder={prevAt ? String(prevAt.reps) : 'reps'}
        value={reps}
        onChange={(e) => {
          setReps(e.target.value)
          commitField('reps', e.target.value)
        }}
        aria-label="Repetitions"
      />
      <button
        className={'gh-check' + (set.done ? ' on' : '')}
        onClick={toggleDone}
        aria-label={set.done ? 'Mark set not done' : 'Complete set'}
        aria-pressed={set.done}
      >
        ✓
      </button>
      <button
        className="gh-x"
        onClick={() => removeSet(exercise.id, set.id)}
        aria-label="Remove set"
        style={{ visibility: empty || !set.done ? 'visible' : 'hidden' }}
      >
        ×
      </button>
      </div>
    </div>
  )
}

function LiveSession({ session, history }: { session: Session; history: Session[] }) {
  const now = useNow(true)
  const [picker, setPicker] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [overview, setOverview] = useState<string | null>(null)

  return (
    <>
      <div className="card">
        <div className="gh-live-head">
          <span className="gh-elapsed">{formatDuration(now - session.startTs)}</span>
          <span className="gh-live-sub num">
            {doneSets(session)}/{sessionSets(session)} sets ·{' '}
            {Math.round(sessionVolume(session)).toLocaleString()} kg
          </span>
        </div>
        <div className="gh-live-sub">
          {session.templateName ? `${session.templateName} — in progress` : 'Session in progress'}
        </div>
        <RestBar now={now} />
      </div>

      {session.exercises.map((ex) => {
        const prev = previousSets(history, ex.name)
        const prevMax = historicalMaxWeight(history, ex.name)
        return (
          <div className="card gh-ex" key={ex.id}>
            <div className="gh-ex-name">
              <button className="gh-ex-open" onClick={() => setOverview(ex.name)}>
                {ex.name}
              </button>
              <span className="n num">
                {ex.sets.length} sets
                {ex.sets.length === 0 && (
                  <button
                    className="gh-ex-remove"
                    onClick={() => removeExercise(ex.id)}
                    aria-label={`Remove ${ex.name}`}
                  >
                    ×
                  </button>
                )}
              </span>
            </div>
            <div className="gh-cols" aria-hidden="true">
              <span>set</span>
              <span>prev</span>
              <span>kg</span>
              <span>reps</span>
              <span />
              <span />
            </div>
            {ex.sets.map((s, i) => (
              <SetRow key={s.id} exercise={ex} set={s} index={i} prev={prev} prevMax={prevMax} />
            ))}
            <button className="gh-addset" onClick={() => addPlannedSet(ex.id)}>
              + Add set
            </button>
          </div>
        )
      })}

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={() => setPicker(true)}>
          Add exercise
        </button>
      </div>

      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className="btn btn-danger" onClick={() => setConfirmDiscard(true)}>
          Discard
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            const done = finishSession()
            toast(done ? 'Workout logged' : 'Empty session discarded')
          }}
        >
          Finish workout
        </button>
      </div>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={addExercise} />
      <ExerciseSheet name={overview} history={history} onClose={() => setOverview(null)} />

      <ConfirmSheet
        open={confirmDiscard}
        title="Discard this workout?"
        body="Logged sets in this session will be lost. This can't be undone."
        actionLabel="Discard"
        danger
        onConfirm={() => {
          discardSession()
          toast('Session discarded')
        }}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  )
}

/* ---------- template editor ---------- */

function TemplateEditor({
  editing,
  onClose,
}: {
  editing: Template | 'new' | null
  onClose: () => void
}) {
  const isNew = editing === 'new'
  const base = isNew || editing === null ? null : editing
  const [name, setName] = useState(base ? base.name : '')
  const [exercises, setExercises] = useState<TemplateExercise[]>(base ? [...base.exercises] : [])
  const [picker, setPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (editing === null) return null

  function bump(i: number, delta: number) {
    setExercises((xs) =>
      xs.map((x, j) => (j === i ? { ...x, targetSets: Math.max(1, Math.min(9, x.targetSets + delta)) } : x)),
    )
  }

  return (
    <>
      <Sheet open title={isNew ? 'New template' : 'Edit template'} onClose={onClose}>
        <input
          className="tinput"
          placeholder="Template name — e.g. Upper A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {exercises.map((x, i) => (
          <div className="gh-tpl-row" key={x.name + i}>
            <span className="nm">{x.name}</span>
            <span className="ctrl num">
              <button onClick={() => bump(i, -1)} aria-label="Fewer sets">−</button>
              {x.targetSets}
              <button onClick={() => bump(i, 1)} aria-label="More sets">+</button>
            </span>
            <button
              className="del"
              onClick={() => setExercises((xs) => xs.filter((_, j) => j !== i))}
              aria-label={`Remove ${x.name}`}
            >
              ×
            </button>
          </div>
        ))}
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setPicker(true)}>
          Add exercise
        </button>
        <div className="btn-row" style={{ marginTop: 10 }}>
          {!isNew && (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
          <button
            className="btn btn-primary"
            disabled={!name.trim() || exercises.length === 0}
            onClick={() => {
              saveTemplate({ ...(base ? { id: base.id } : {}), name, exercises })
              toast(isNew ? 'Template created' : 'Template saved')
              onClose()
            }}
          >
            Save template
          </button>
        </div>
      </Sheet>
      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(n) =>
          setExercises((xs) =>
            xs.some((x) => x.name.toLowerCase() === n.toLowerCase())
              ? xs
              : [...xs, { name: n, targetSets: 3 }],
          )
        }
      />
      <ConfirmSheet
        open={confirmDelete}
        title="Delete this template?"
        body="Past workouts started from it keep their history."
        actionLabel="Delete"
        danger
        onConfirm={() => {
          if (base) deleteTemplate(base.id)
          toast('Template deleted')
          onClose()
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}

/* ---------- tabs ---------- */

function Train({ templates }: { templates: Template[] }) {
  const [editing, setEditing] = useState<Template | 'new' | null>(null)
  const [menu, setMenu] = useState<Template | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null)
  return (
    <>
      <button className="btn btn-primary gh-start-hero" onClick={startSession}>
        ▶&nbsp; Start empty workout
      </button>
      <div className="gh-tpl-bar">
        <span className="section-label" style={{ margin: 0 }}>Templates</span>
        <button className="linklike" onClick={() => setEditing('new')}>+ New template</button>
      </div>
      {templates.map((t) => (
        <div className="card gh-tpl" key={t.id}>
          <div className="gh-tpl-head">
            <div className="gh-tpl-name">{t.name}</div>
            <button className="gh-dots" onClick={() => setMenu(t)} aria-label={`More for ${t.name}`}>⋯</button>
          </div>
          <div className="gh-tpl-preview">{t.exercises.map((e) => e.name).join(' · ')}</div>
          <div className="gh-tpl-actions">
            <button className="btn btn-primary gh-tpl-start" onClick={() => startFromTemplate(t.id)}>
              ▶&nbsp; Start
            </button>
            <button className="gh-pencil" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m13.5 6.5 3 3" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      <TemplateEditor
        key={editing === null ? 'none' : editing === 'new' ? 'new' : editing.id}
        editing={editing}
        onClose={() => setEditing(null)}
      />
      <Sheet open={menu !== null} title={menu?.name ?? ''} onClose={() => setMenu(null)}>
        <button
          className="btn btn-ghost"
          style={{ width: '100%' }}
          onClick={() => {
            if (menu) {
              duplicateTemplate(menu.id)
              toast(`${menu.name} duplicated`)
            }
            setMenu(null)
          }}
        >
          Duplicate template
        </button>
        <button
          className="btn btn-danger"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => {
            setConfirmDelete(menu)
            setMenu(null)
          }}
        >
          Delete template
        </button>
      </Sheet>
      <ConfirmSheet
        open={confirmDelete !== null}
        title={`Delete ${confirmDelete?.name ?? ''}?`}
        body="Logged workouts started from it stay in History — only the template goes."
        actionLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDelete) deleteTemplate(confirmDelete.id)
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  )
}

function HistoryTab({ history }: { history: Session[] }) {
  const [open, setOpen] = useState<Session | null>(null)
  if (history.length === 0) {
    return <Empty title="No workouts yet" sub="Start a session and log your first sets. Every rep counts toward today's 1%." />
  }
  return (
    <>
      {history.map((s) => {
        const d = new Date(s.startTs)
        const mins = s.endTs ? Math.round((s.endTs - s.startTs) / 60000) : 0
        return (
          <button className="card card-tap gh-hist-card" key={s.id} onClick={() => setOpen(s)}>
            <div className="gh-hist-row">
              <div>
                <div className="gh-hist-date">
                  {s.templateName ? `${s.templateName} · ` : ''}
                  {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div className="gh-hist-sub num">
                  {s.exercises.length} exercises · {workingSets(s)} working sets · {mins} min
                </div>
              </div>
              <div className="gh-hist-vol num">{Math.round(sessionVolume(s)).toLocaleString()} kg</div>
            </div>
          </button>
        )
      })}
      <Sheet
        open={open !== null}
        title={
          open
            ? new Date(open.startTs).toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : ''
        }
        onClose={() => setOpen(null)}
      >
        {open &&
          open.exercises.map((ex) => (
            <div className="kv" key={ex.id}>
              <span className="k">{ex.name}</span>
              <span className="num" style={{ textAlign: 'right' }}>{setLine(ex.sets)}</span>
            </div>
          ))}
      </Sheet>
    </>
  )
}

const PERIODS: readonly { id: Period; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

const PREV_LABEL: Record<Period, string> = {
  week: 'last week',
  month: 'last month',
  year: 'last year',
}

function InsightsTab({ history }: { history: Session[] }) {
  const [overview, setOverview] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('month')
  if (history.length === 0) {
    return <Empty title="Nothing to chart yet" sub="Insights appear after your first workout." />
  }
  const cur = aggregatePeriod(history, periodRange(period, 0))
  const prev = aggregatePeriod(history, periodRange(period, 1))
  const buckets = periodBuckets(history, period)
  const top = topExercises(history, 5)
  const names = allExerciseNames(history)
  const volDelta = pctDelta(cur.volume, prev.volume)
  const trendLine =
    prev.volume === 0
      ? 'First period on the books — the baseline every future comparison stands on.'
      : volDelta !== null && volDelta >= 0
        ? `Volume up ${Math.round(volDelta)}% on ${PREV_LABEL[period]} — that is the 1% compounding. Keep the inputs boring.`
        : `Volume down ${Math.abs(Math.round(volDelta ?? 0))}% vs ${PREV_LABEL[period]}. One soft period is noise; two is a signal — check sleep, check the program, then add the reps back.`
  return (
    <>
      <div className="chips" style={{ marginBottom: 14 }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            className={'chip' + (p.id === period ? ' on' : '')}
            style={{ ['--chip-accent' as string]: 'var(--m-ghisa)' } as CSSProperties}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="ins-grid three">
        <StatBox label="workouts" value={String(cur.workouts)} delta={pctDelta(cur.workouts, prev.workouts)} />
        <StatBox label="volume kg" value={cur.volume.toLocaleString()} delta={volDelta} />
        <StatBox label="sets" value={String(cur.sets)} delta={pctDelta(cur.sets, prev.sets)} />
        <StatBox label="reps" value={String(cur.reps)} delta={pctDelta(cur.reps, prev.reps)} />
        <StatBox label="minutes" value={String(cur.minutes)} delta={pctDelta(cur.minutes, prev.minutes)} />
        <StatBox label="avg length" value={`${cur.avgMinutes}m`} />
      </div>
      <div className="ins-note">vs {PREV_LABEL[period]} · {periodRange(period, 0).label}</div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ghisa)' }}>
            {period === 'week' ? 'Sessions this week' : period === 'month' ? 'Weeks this month' : 'Months this year'} · kg
          </span>
        </div>
        {buckets.length === 0 ? (
          <div className="rs-foot">No sessions in this period yet.</div>
        ) : (
          <Bars data={buckets} accentVar="var(--m-ghisa)" />
        )}
      </div>

      <div className="card guide">
        <p><b>Reading the period.</b> {trendLine}</p>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ghisa)' }}>Most trained · all time</span>
        </div>
        {top.map((t) => (
          <div className="kv" key={t.name}>
            <span className="k">{t.name}</span>
            <span className="num">{t.sets} sets</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ghisa)' }}>Exercise overview</span>
        </div>
        <div className="chips">
          {names.map((n) => (
            <button key={n} className="chip" onClick={() => setOverview(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="card guide">
        {TRAINING_ADVICE.map((a) => (
          <p key={a.title}>
            <b>{a.title}.</b> {a.body}
          </p>
        ))}
      </div>

      <ExerciseSheet name={overview} history={history} onClose={() => setOverview(null)} />
    </>
  )
}

function RunningBanner({ session }: { session: Session }) {
  const now = useNow(true)
  return (
    <button className="gh-running" onClick={() => navigate('/m/ghisa/train')}>
      <span className="pulse" aria-hidden="true" />
      Workout running · {formatDuration(now - session.startTs)} — return
    </button>
  )
}

export default function GhisaScreen({ tab = 'train' }: { tab?: string }) {
  const st = useStore(ghisaStore)
  if (st.active && tab === 'train') {
    return <LiveSession session={st.active} history={st.history} />
  }
  return (
    <>
      {st.active && <RunningBanner session={st.active} />}
      {tab === 'train' && <Train templates={st.templates} />}
      {tab === 'history' && <HistoryTab history={st.history} />}
      {tab === 'insights' && <InsightsTab history={st.history} />}
    </>
  )
}

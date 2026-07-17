import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../core/hooks'
import { formatDuration } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty, Seg, parseNum } from '../../app/ui'
import { Bars, Line } from '../../app/charts'
import {
  ghisaStore,
  EXERCISES,
  startSession,
  startFromTemplate,
  addExercise,
  removeExercise,
  addSet,
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
  workingSets,
  previousSets,
  historicalMaxWeight,
  exerciseHistory,
  e1rmSeries,
  bestSet,
  allExerciseNames,
  weeklyVolume,
  topExercises,
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

function SetForm({ exercise, prev }: { exercise: ExerciseEntry; prev: SetEntry[] }) {
  const last = exercise.sets[exercise.sets.length - 1]
  const prevSame = prev[Math.min(exercise.sets.length, prev.length - 1)]
  const seed = last ?? prevSame
  const [weight, setWeight] = useState(seed ? String(seed.weight) : '')
  const [reps, setReps] = useState(seed ? String(seed.reps) : '')

  function commit() {
    const w = parseNum(weight)
    const r = parseNum(reps)
    if (w === null || r === null || r < 1) {
      toast('Enter weight and reps')
      return
    }
    addSet(exercise.id, w, Math.round(r))
  }

  return (
    <div className="gh-set-form">
      <span style={{ color: 'var(--faint)', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
        {exercise.sets.length + 1}
      </span>
      <input
        className="tinput"
        inputMode="decimal"
        placeholder="kg"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        aria-label="Weight in kilograms"
      />
      <input
        className="tinput"
        inputMode="numeric"
        placeholder="reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        aria-label="Repetitions"
      />
      <button className="plus" onClick={commit} aria-label="Log set">
        +
      </button>
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
            {sessionSets(session)} sets · {Math.round(sessionVolume(session)).toLocaleString()} kg
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
            {prev.length > 0 && (
              <div className="gh-prev">Last time: {setLine(prev)}</div>
            )}
            {ex.sets.map((s, i) => (
              <div className="gh-set" key={s.id}>
                <button
                  className={'gh-type gh-type-' + s.type}
                  onClick={() => cycleSetType(ex.id, s.id)}
                  aria-label="Change set type"
                >
                  {TYPE_BADGE[s.type] || i + 1}
                </button>
                <span className="val num">
                  {s.weight} kg
                  {s.type !== 'warmup' && prevMax > 0 && s.weight > prevMax && (
                    <span className="gh-pr">PR</span>
                  )}
                </span>
                <span className="val num">{s.reps} reps</span>
                <button className="del" onClick={() => removeSet(ex.id, s.id)} aria-label="Remove set">
                  ×
                </button>
              </div>
            ))}
            <SetForm exercise={ex} prev={prev} key={'form-' + ex.id + '-' + ex.sets.length} />
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
  return (
    <>
      <button className="btn btn-primary" onClick={startSession}>
        Start empty workout
      </button>
      <div className="section-label">Templates</div>
      {templates.map((t) => (
        <div className="card" key={t.id}>
          <div className="gh-tpl-head">
            <div>
              <div className="gh-hist-date">{t.name}</div>
              <div className="gh-hist-sub">
                {t.exercises.map((e) => e.name).join(' · ')}
              </div>
            </div>
            <button className="gh-tpl-edit" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}>
              Edit
            </button>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10, width: '100%' }}
            onClick={() => startFromTemplate(t.id)}
          >
            Start {t.name}
          </button>
        </div>
      ))}
      <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setEditing('new')}>
        New template
      </button>
      <TemplateEditor editing={editing} onClose={() => setEditing(null)} />
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

function StatsTab({ history }: { history: Session[] }) {
  const [overview, setOverview] = useState<string | null>(null)
  if (history.length === 0) {
    return <Empty title="Nothing to chart yet" sub="Stats appear after your first workout." />
  }
  const buckets = weeklyVolume(history, 8)
  const top = topExercises(history, 5)
  const names = allExerciseNames(history)
  return (
    <>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ghisa)' }}>Weekly volume · kg</span>
        </div>
        <Bars data={buckets} accentVar="var(--m-ghisa)" />
      </div>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-ghisa)' }}>Most trained</span>
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
      <ExerciseSheet name={overview} history={history} onClose={() => setOverview(null)} />
    </>
  )
}

const TABS = [
  { id: 'train', label: 'Train' },
  { id: 'history', label: 'History' },
  { id: 'stats', label: 'Stats' },
] as const

type Tab = (typeof TABS)[number]['id']

export default function GhisaScreen() {
  const st = useStore(ghisaStore)
  const [tab, setTab] = useState<Tab>('train')
  if (st.active) return <LiveSession session={st.active} history={st.history} />
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Seg<Tab> options={TABS} value={tab} onChange={setTab} />
      </div>
      {tab === 'train' && <Train templates={st.templates} />}
      {tab === 'history' && <HistoryTab history={st.history} />}
      {tab === 'stats' && <StatsTab history={st.history} />}
    </>
  )
}

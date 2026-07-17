import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../core/hooks'
import { formatDuration } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty, parseNum } from '../../app/ui'
import {
  ghisaStore,
  EXERCISES,
  startSession,
  addExercise,
  addSet,
  removeSet,
  finishSession,
  discardSession,
  skipRest,
  adjustRest,
  sessionVolume,
  sessionSets,
  previousSets,
  historicalMaxWeight,
  type ExerciseEntry,
  type Session,
  type SetEntry,
} from './model'

/** Timestamp-based ticker — immune to background-tab throttling. */
function useNow(activeWhile: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!activeWhile) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [activeWhile])
  return now
}

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
      <span className="idx" style={{ color: 'var(--faint)', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
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

function LiveSession({ session, history }: { session: Session; history: Session[] }) {
  const now = useNow(true)
  const [picker, setPicker] = useState(false)
  const [query, setQuery] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return EXERCISES
    return EXERCISES.filter((e) => e.toLowerCase().includes(q))
  }, [query])

  function pick(name: string) {
    addExercise(name)
    setPicker(false)
    setQuery('')
  }

  return (
    <>
      <div className="card">
        <div className="gh-live-head">
          <span className="gh-elapsed">{formatDuration(now - session.startTs)}</span>
          <span className="gh-live-sub num">
            {sessionSets(session)} sets · {Math.round(sessionVolume(session)).toLocaleString()} kg
          </span>
        </div>
        <div className="gh-live-sub">Session in progress</div>
        <RestBar now={now} />
      </div>

      {session.exercises.map((ex) => {
        const prev = previousSets(history, ex.name)
        const prevMax = historicalMaxWeight(history, ex.name)
        return (
          <div className="card gh-ex" key={ex.id}>
            <div className="gh-ex-name">
              {ex.name}
              <span className="n num">{ex.sets.length} sets</span>
            </div>
            {prev.length > 0 && (
              <div className="gh-prev">
                Last time: {prev.map((s) => `${s.weight}×${s.reps}`).join(' · ')}
              </div>
            )}
            {ex.sets.map((s, i) => (
              <div className="gh-set" key={s.id}>
                <span className="idx">{i + 1}</span>
                <span className="val num">
                  {s.weight} kg
                  {prevMax > 0 && s.weight > prevMax && <span className="gh-pr">PR</span>}
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

      <Sheet open={picker} title="Add exercise" onClose={() => setPicker(false)}>
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

function History({ history }: { history: Session[] }) {
  if (history.length === 0) {
    return <Empty title="No workouts yet" sub="Start a session and log your first sets. Every rep counts toward today's 1%." />
  }
  return (
    <>
      <div className="section-label">History</div>
      {history.map((s) => {
        const d = new Date(s.startTs)
        const mins = s.endTs ? Math.round((s.endTs - s.startTs) / 60000) : 0
        return (
          <div className="card" key={s.id}>
            <div className="gh-hist-row">
              <div>
                <div className="gh-hist-date">
                  {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div className="gh-hist-sub num">
                  {s.exercises.length} exercises · {sessionSets(s)} sets · {mins} min
                </div>
              </div>
              <div className="gh-hist-vol num">{Math.round(sessionVolume(s)).toLocaleString()} kg</div>
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function GhisaScreen() {
  const st = useStore(ghisaStore)
  if (st.active) return <LiveSession session={st.active} history={st.history} />
  return (
    <>
      <button className="btn btn-primary" onClick={startSession}>
        Start workout
      </button>
      <History history={st.history} />
    </>
  )
}

import { useState } from 'react'
import { useStore } from '../../core/hooks'
import { lastNDayKeys } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty } from '../../app/ui'
import {
  cadenceStore,
  activeHabits,
  isChecked,
  addHabit,
  archiveHabit,
  toggleCheck,
  habitStreak,
  EMOJI_PRESETS,
  type Habit,
} from './model'

function HabitRow({ habit, onManage }: { habit: Habit; onManage: () => void }) {
  const st = useStore(cadenceStore)
  const done = isChecked(st, habit.id)
  const streak = habitStreak(st, habit.id)
  const week = lastNDayKeys(7)

  return (
    <div className="cd-row">
      <button
        className={'cd-check' + (done ? ' done' : '')}
        onClick={() => toggleCheck(habit.id)}
        aria-label={(done ? 'Uncheck ' : 'Check ') + habit.name}
      >
        {habit.emoji}
      </button>
      <button className="cd-info" onClick={onManage} style={{ textAlign: 'left' }}>
        <div className="cd-name">{habit.name}</div>
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

export default function CadenceScreen() {
  const st = useStore(cadenceStore)
  const habits = activeHabits(st)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>(EMOJI_PRESETS[0])
  const [managing, setManaging] = useState<Habit | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)

  function commitAdd() {
    if (!name.trim()) {
      toast('Give the habit a name')
      return
    }
    addHabit(name, emoji)
    setName('')
    setEmoji(EMOJI_PRESETS[0])
    setAdding(false)
    toast('Habit added')
  }

  return (
    <>
      {habits.length === 0 ? (
        <Empty title="No habits yet" sub="Small, daily, repeatable — that's where the 1% lives." />
      ) : (
        <div className="card">
          {habits.map((h) => (
            <HabitRow key={h.id} habit={h} onManage={() => setManaging(h)} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={() => setAdding(true)}>
          Add habit
        </button>
      </div>

      <Sheet open={adding} title="New habit" onClose={() => setAdding(false)}>
        <input
          className="tinput"
          placeholder="e.g. Read 10 pages"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="cd-emoji-grid">
          {EMOJI_PRESETS.map((em) => (
            <button
              key={em}
              className={'cd-emoji' + (em === emoji ? ' on' : '')}
              onClick={() => setEmoji(em)}
            >
              {em}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={commitAdd}>
          Add habit
        </button>
      </Sheet>

      <Sheet
        open={managing !== null}
        title={managing ? `${managing.emoji} ${managing.name}` : ''}
        onClose={() => setManaging(null)}
      >
        {managing && (
          <>
            <div className="kv">
              <span className="k">Current streak</span>
              <span className="num">{habitStreak(st, managing.id)} days</span>
            </div>
            <div className="kv">
              <span className="k">Started</span>
              <span>
                {new Date(managing.createdTs).toLocaleDateString(undefined, {
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
          </>
        )}
      </Sheet>

      <ConfirmSheet
        open={confirmArchive}
        title="Archive this habit?"
        body="It disappears from your list but its history stays in your data."
        actionLabel="Archive"
        danger
        onConfirm={() => {
          if (managing) archiveHabit(managing.id)
          setManaging(null)
          toast('Habit archived')
        }}
        onClose={() => setConfirmArchive(false)}
      />
    </>
  )
}

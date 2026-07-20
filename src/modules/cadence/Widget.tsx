import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import {
  cadenceStore,
  activeHabits,
  isChecked,
  isScheduled,
  toggleCheck,
  daysClean,
} from './model'
import { todayKey } from '../../core/dates'

/** Interactive widget: build habits check off right here; quit habits show days clean. */
export default function CadenceWidget() {
  const st = useStore(cadenceStore)
  const habits = activeHabits(st)
  const today = todayKey()

  if (habits.length === 0) {
    return <div className="w-line">No habits yet — add the first one and tick it off right here.</div>
  }

  const dueBuilds = habits.filter(
    (h) => h.type === 'build' && today >= h.startDate && isScheduled(h, today),
  )
  const done = dueBuilds.filter((h) => isChecked(st, h.id)).length

  return (
    <>
      <div className="cd-chips">
        {habits.map((h) => {
          const style = { ['--hc' as string]: h.color } as CSSProperties
          if (h.type === 'quit') {
            return (
              <button key={h.id} className="cd-chip quit" style={style} onClick={() => navigate('/m/cadence')}>
                <span aria-hidden="true">{h.emoji}</span>
                {daysClean(st, h.id)}d clean
              </button>
            )
          }
          const offToday = today < h.startDate || !isScheduled(h, today)
          const checked = isChecked(st, h.id)
          return (
            <button
              key={h.id}
              className={'cd-chip' + (checked ? ' done' : '') + (offToday ? ' rest' : '')}
              style={style}
              onClick={() => (offToday ? navigate('/m/cadence') : toggleCheck(h.id))}
              aria-pressed={checked}
            >
              <span aria-hidden="true">{h.emoji}</span>
              {h.name}
            </button>
          )
        })}
      </div>
      {dueBuilds.length > 0 && (
        <div className="w-line num">
          {done} of {dueBuilds.length} today{done === dueBuilds.length ? ' — clean sweep.' : ''}
        </div>
      )}
    </>
  )
}

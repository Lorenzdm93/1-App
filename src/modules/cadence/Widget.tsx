import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import {
  cadenceStore,
  activeHabits,
  isChecked,
  toggleCheck,
  daysClean,
  countInWeek,
  weekStartKey,
} from './model'
import { todayKey } from '../../core/dates'

/** Interactive widget: build habits check off right here; quit habits show days clean. */
export default function CadenceWidget() {
  const st = useStore(cadenceStore)
  const habits = activeHabits(st)

  if (habits.length === 0) {
    return <div className="w-line">No habits yet — add the first one and tick it off right here.</div>
  }

  const builds = habits.filter((h) => h.type === 'build')
  const done = builds.filter((h) => isChecked(st, h.id)).length

  return (
    <>
      <div className="cd-chips">
        {habits.map((h) => {
          const style = { ['--h-acc' as string]: h.color } as CSSProperties
          if (h.type === 'quit') {
            return (
              <button key={h.id} className="cd-chip quit" style={style} onClick={() => navigate('/m/cadence')}>
                <span aria-hidden="true">{h.emoji}</span>
                {daysClean(st, h.id)}d clean
              </button>
            )
          }
          const checked = isChecked(st, h.id)
          const weekly =
            h.targetPerWeek < 7
              ? ` ${countInWeek(st, h.id, weekStartKey(todayKey()))}/${h.targetPerWeek}`
              : ''
          return (
            <button
              key={h.id}
              className={'cd-chip' + (checked ? ' done' : '')}
              style={style}
              onClick={() => toggleCheck(h.id)}
              aria-pressed={checked}
            >
              <span aria-hidden="true">{h.emoji}</span>
              {h.name}
              {weekly && <span className="num">{weekly}</span>}
            </button>
          )
        })}
      </div>
      {builds.length > 0 && (
        <div className="w-line num">
          {done} of {builds.length} today{done === builds.length ? ' — clean sweep.' : ''}
        </div>
      )}
    </>
  )
}

import { useStore } from '../../core/hooks'
import { cadenceStore, activeHabits, isChecked, toggleCheck } from './model'

/** Interactive widget: habits are checked off directly from Today. */
export default function CadenceWidget() {
  const st = useStore(cadenceStore)
  const habits = activeHabits(st)

  if (habits.length === 0) {
    return <div className="w-line">No habits yet — add the first one and tick it off right here.</div>
  }

  const done = habits.filter((h) => isChecked(st, h.id)).length

  return (
    <>
      <div className="cd-chips">
        {habits.map((h) => {
          const checked = isChecked(st, h.id)
          return (
            <button
              key={h.id}
              className={'cd-chip' + (checked ? ' done' : '')}
              onClick={() => toggleCheck(h.id)}
              aria-pressed={checked}
            >
              <span aria-hidden="true">{h.emoji}</span>
              {h.name}
            </button>
          )
        })}
      </div>
      <div className="w-line num">
        {done} of {habits.length} today{done === habits.length ? ' — clean sweep.' : ''}
      </div>
    </>
  )
}

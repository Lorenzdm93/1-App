import { useStore } from '../../core/hooks'
import { todayKey } from '../../core/dates'
import { sanaStore, dueOn, isTaken, activeItems } from './model'

export default function SanaWidget() {
  const st = useStore(sanaStore)
  const today = todayKey()
  const due = dueOn(st, today)
  const taken = due.filter(({ item, slot }) => isTaken(st, item.id, slot, today)).length
  if (activeItems(st).length === 0) {
    return <div className="w-empty">Add your first supplement or medicine.</div>
  }
  return (
    <div className="w-stat-row">
      <div className="w-stat">
        <div className="v num">{taken}/{due.length}</div>
        <div className="k">today</div>
      </div>
      <div className="w-stat">
        <div className="v num">{due.length - taken}</div>
        <div className="k">remaining</div>
      </div>
    </div>
  )
}

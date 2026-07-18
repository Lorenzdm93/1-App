import { useStore } from '../../core/hooks'
import { todayKey } from '../../core/dates'
import { sanaStore, dueOn, isTaken } from './model'

export default function SanaWidget() {
  const st = useStore(sanaStore)
  const today = todayKey()
  const due = dueOn(st, today)
  const taken = due.filter(({ compound }) => isTaken(st, compound.id, today)).length
  if (st.stacks.length === 0) {
    return <div className="w-empty">Build your first stack — a regimen Today assembles itself from.</div>
  }
  return (
    <div className="w-stat-row">
      <div className="w-stat"><div className="v num">{taken}/{due.length}</div><div className="k">doses</div></div>
      <div className="w-stat"><div className="v num">{due.length - taken}</div><div className="k">remaining</div></div>
    </div>
  )
}

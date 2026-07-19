import { useStore } from '../../core/hooks'
import { LIFTS } from './formulas'
import { caliberStore } from './model'

export default function CaliberWidget() {
  const st = useStore(caliberStore)
  const rows = LIFTS.filter((l) => st.prs[l.id]).map((l) => ({
    name: l.name,
    pr: st.prs[l.id],
  }))

  if (rows.length === 0) {
    return <div className="w-line">No tested lifts yet — log a set to place yourself on the gauge.</div>
  }

  const best = rows.reduce((m, r) => Math.max(m, r.pr.e1rm), 0)
  return (
    <div className="w-line">
      {rows.length} lift{rows.length === 1 ? '' : 's'} on the gauge · best e1RM <b className="num">{best} kg</b>
    </div>
  )
}

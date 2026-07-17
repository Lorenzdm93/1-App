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

  return (
    <div>
      {rows.slice(0, 3).map((r) => (
        <div className="cb-pr-row" key={r.name}>
          <span>{r.name}</span>
          <span className="v num">{r.pr.e1rm} kg</span>
        </div>
      ))}
    </div>
  )
}

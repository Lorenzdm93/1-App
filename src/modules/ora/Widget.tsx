import { useStore } from '../../core/hooks'
import { oraStore, elapsedH, stageFor, targetHoursFor } from './model'

export default function OraWidget() {
  const st = useStore(oraStore)
  if (st.current) {
    const h = elapsedH(st.current.startTs)
    const stage = stageFor(h)
    const hh = Math.floor(h)
    const mm = Math.floor((h - hh) * 60)
    return (
      <div className="w-stat-row">
        <div className="w-stat">
          <div className="v num">{hh}h {String(mm).padStart(2, '0')}</div>
          <div className="k">fasting · of {st.current.targetH}h</div>
        </div>
        <div className="w-stat">
          <div className="v" style={{ fontSize: 14 }}>{stage.name}</div>
          <div className="k">current stage</div>
        </div>
      </div>
    )
  }
  const last = st.fasts[0]
  if (!last) {
    return <div className="w-line">No fast yet — the timer is one tap away, {targetHoursFor(st)}h target loaded.</div>
  }
  const lh = elapsedH(last.startTs, last.endTs)
  return (
    <div className="w-line">
      Not fasting. Last: <b className="num">{lh.toFixed(1)}h</b> {last.hit ? '· goal reached ✓' : `· ended early (aim ${last.targetH}h)`}
    </div>
  )
}

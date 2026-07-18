import { useEffect } from 'react'
import { useStore } from '../../core/hooks'
import { groveStore, maybeComplete, todayStats } from './model'
import PlantSVG from './PlantSVG'

export default function GroveWidget() {
  const st = useStore(groveStore)
  useEffect(() => {
    maybeComplete()
  }, [])
  const today = todayStats(st.plants)
  if (st.plants.length === 0 && !st.running) {
    return <div className="w-line">The forest is empty — one focus session plants the first tree.</div>
  }
  return (
    <>
      <div className="w-stat-row">
        <div className="w-stat">
          <div className="v num">{today.minutes}m</div>
          <div className="k">focus today</div>
        </div>
        <div className="w-stat">
          <div className="v num">{today.count}</div>
          <div className="k">trees today</div>
        </div>
      </div>
      {st.plants.length > 0 && (
        <div className="gr-widget-row" aria-hidden="true">
          {st.plants.slice(0, 6).map((t) => (
            <PlantSVG key={t.id} kind={t.kind} size={26} />
          ))}
        </div>
      )}
    </>
  )
}

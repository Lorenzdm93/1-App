import { useEffect } from 'react'
import { useStore } from '../../core/hooks'
import { groveStore, maybeComplete, todayStats } from './model'
import TreeSVG from './TreeSVG'

export default function GroveWidget() {
  const st = useStore(groveStore)
  useEffect(() => {
    maybeComplete()
  }, [])
  const today = todayStats(st.trees)
  if (st.trees.length === 0 && !st.running) {
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
      {st.trees.length > 0 && (
        <div className="gr-widget-row" aria-hidden="true">
          {st.trees.slice(0, 6).map((t) => (
            <TreeSVG key={t.id} species={t.species} growth={1} size={26} />
          ))}
        </div>
      )}
    </>
  )
}

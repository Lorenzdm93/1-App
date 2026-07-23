/**
 * GROVE dashboard widget — today's stats plus the day's grove in miniature.
 * Wrapped in .gv2 so the art's --gv-* palette resolves on the dashboard.
 */
import { useEffect, useMemo } from 'react'
import { useStore } from '../../core/hooks'
import { dayKey, todayKey } from '../../core/dates'
import { groveStore, maybeComplete, todayStats, minutesFor } from './model'
import { PlantSprite } from './Art'

export default function GroveWidget() {
  const st = useStore(groveStore)
  useEffect(() => {
    maybeComplete()
  }, [])
  const today = todayStats(st.plants)
  const todays = useMemo(
    () => st.plants.filter((p) => dayKey(p.ts) === todayKey()).slice(0, 5).reverse(),
    [st.plants],
  )

  if (st.plants.length === 0 && !st.running) {
    return <div className="w-line">The forest is empty — one focus session plants the first tree.</div>
  }
  return (
    <div className="gv2">
      <div className="w-stat-row">
        <div className="w-stat">
          <div className="v num">{today.minutes}m</div>
          <div className="k">focus today</div>
        </div>
        <div className="w-stat">
          <div className="v num">{today.count}</div>
          <div className="k">sessions</div>
        </div>
      </div>
      {todays.length > 0 && (
        <div className="gv2-widgetrow" aria-hidden="true">
          {todays.map((p, i) => (
            <PlantSprite key={p.id} kind={p.kind} p={1} h={34} prefix={'wg' + i} />
          ))}
        </div>
      )}
      {st.running && (
        <div className="w-line">
          {st.running.pausedAt !== null ? 'Paused — ' : ''}
          {st.running.mode === 'focus' ? 'Focus running' : 'Break running'} · {minutesFor(st, st.running.mode)}m round
        </div>
      )}
    </div>
  )
}

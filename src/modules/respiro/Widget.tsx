import { useStore } from '../../core/hooks'
import { eventsStore, sumValue, countEvents } from '../../core/events'
import { todayKey, lastNDayKeys, formatMinutes } from '../../core/dates'

export default function RespiroWidget() {
  const events = useStore(eventsStore)
  const today = [todayKey()]
  const week = lastNDayKeys(7)
  const todayMin = sumValue(events, 'respiro', 'session', today)
  const weekMin = sumValue(events, 'respiro', 'session', week)
  const todaySessions = countEvents(events, 'respiro', 'session', today)

  return (
    <>
      <div className="w-stat-row">
        <div className="w-stat">
          <div className="v">{formatMinutes(todayMin)}</div>
          <div className="k">today</div>
        </div>
        <div className="w-stat">
          <div className="v">{formatMinutes(weekMin)}</div>
          <div className="k">last 7 days</div>
        </div>
      </div>
      <div className="w-line">
        {todaySessions > 0
          ? `${todaySessions} session${todaySessions > 1 ? 's' : ''} today — breath banked.`
          : 'Two minutes of breathing counts. Start anywhere.'}
      </div>
    </>
  )
}

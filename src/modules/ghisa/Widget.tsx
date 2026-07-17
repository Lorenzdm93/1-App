import { useStore } from '../../core/hooks'
import { dayKey, lastNDayKeys } from '../../core/dates'
import { ghisaStore, sessionVolume, sessionSets } from './model'

export default function GhisaWidget() {
  const st = useStore(ghisaStore)
  const week = new Set(lastNDayKeys(7))
  const weekSessions = st.history.filter((s) => week.has(dayKey(s.startTs)))
  const weekVolume = weekSessions.reduce((sum, s) => sum + sessionVolume(s), 0)
  const last = st.history[0]

  return (
    <>
      <div className="w-stat-row">
        <div className="w-stat">
          <div className="v">{weekSessions.length}</div>
          <div className="k">workouts · 7d</div>
        </div>
        <div className="w-stat">
          <div className="v">{Math.round(weekVolume).toLocaleString()}</div>
          <div className="k">kg volume · 7d</div>
        </div>
      </div>
      <div className="w-line">
        {st.active
          ? 'Session in progress — sets are waiting.'
          : last
            ? `Last: ${new Date(last.startTs).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${sessionSets(last)} sets · ${Math.round(sessionVolume(last)).toLocaleString()} kg`
            : 'No workouts yet — the iron is patient.'}
      </div>
    </>
  )
}

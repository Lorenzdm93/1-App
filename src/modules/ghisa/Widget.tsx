import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { ghisaStore, fmtVol, periodStart, weekStreak } from './model'

/** Compact Today-dashboard card: this week's volume + week streak, or a nudge to start. */
export default function GhisaWidget() {
  const st = useStore(ghisaStore)
  const weekStart = periodStart('week')
  const thisWeek = st.workouts.filter((w) => w.startedAt >= weekStart)
  const vol = thisWeek.reduce((a, w) => a + w.volume, 0)
  const sets = thisWeek.reduce((a, w) => a + w.sets, 0)
  const streak = weekStreak(st.workouts)

  if (st.active) {
    return (
      <button className="gw-line" onClick={() => navigate('/m/ghisa/train')}>
        Workout in progress — tap to resume.
      </button>
    )
  }

  if (thisWeek.length === 0) {
    return (
      <div className="gw-wrap">
        <div className="gw-line">No sessions logged this week yet.</div>
        {streak > 0 && <div className="gw-sub num">{streak}-week streak on the line — don't break it.</div>}
      </div>
    )
  }

  return (
    <div className="gw-wrap">
      <div className="gw-stats">
        <span className="gw-stat"><b className="num">{fmtVol(vol)}</b><i>kg this week</i></span>
        <span className="gw-stat"><b className="num">{thisWeek.length}</b><i>{thisWeek.length === 1 ? 'session' : 'sessions'}</i></span>
        <span className="gw-stat"><b className="num">{sets}</b><i>sets</i></span>
      </div>
    </div>
  )
}

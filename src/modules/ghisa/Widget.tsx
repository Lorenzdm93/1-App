import { useStore } from '../../core/hooks'
import { ghisaStore, sessionSets, sessionVolume } from './model'

export default function GhisaWidget() {
  const st = useStore(ghisaStore)
  if (st.active) {
    return (
      <div className="w-line">
        Workout in progress — <b className="num">{sessionSets(st.active)} sets · {Math.round(sessionVolume(st.active)).toLocaleString()} kg</b>
      </div>
    )
  }
  const last = st.history[0]
  return (
    <>
      {last && (
        <div className="w-line">
          Last: <b className="num">{Math.round(sessionVolume(last)).toLocaleString()} kg</b> · {new Date(last.endTs ?? last.startTs).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      )}
    </>
  )
}

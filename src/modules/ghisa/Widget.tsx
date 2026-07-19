import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { ghisaStore, startFromTemplate, sessionSets, sessionVolume } from './model'

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
      {st.templates.length > 0 && (
        <div className="gh-w-tpls">
          {st.templates.slice(0, 3).map((t) => (
            <button
              key={t.id}
              className="gh-w-tpl"
              onClick={() => {
                startFromTemplate(t.id)
                navigate('/m/ghisa')
              }}
            >
              ▶ {t.name}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

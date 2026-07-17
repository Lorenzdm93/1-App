import { useStore } from '../core/hooks'
import { settingsStore, toggleModule } from '../core/settings'
import { MODULES } from '../core/registry'
import { navigate } from '../core/router'
import { Toggle, Chevron } from '../app/ui'

export default function Modules() {
  const settings = useStore(settingsStore)

  return (
    <>
      <div className="screen-head">
        <div className="eyebrow">Your toolkit</div>
        <h1 className="screen-title">Modules</h1>
      </div>

      {MODULES.map((m) => {
        const on = settings.enabled.includes(m.id)
        return (
          <div className="card" key={m.id}>
            <div className="mmod">
              <span className="mark">
                <m.Icon size={22} />
              </span>
              <div className="info">
                <div className="name" style={{ color: on ? m.accentVar : 'var(--dim)' }}>
                  {m.name}
                </div>
                <div className="tag">{m.tagline}</div>
              </div>
              <Toggle on={on} onChange={() => toggleModule(m.id)} label={`Enable ${m.name}`} />
            </div>
            {on && (
              <button className="mmod-open" style={{ width: '100%' }} onClick={() => navigate('/m/' + m.id)}>
                Open {m.name}
                <Chevron />
              </button>
            )}
          </div>
        )
      })}

      <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--faint)', textAlign: 'center' }}>
        Disabling a module hides it — its data stays on this device.
      </p>
    </>
  )
}

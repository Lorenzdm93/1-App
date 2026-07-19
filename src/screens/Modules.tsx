import { useRef, useState } from 'react'
import { useStore } from '../core/hooks'
import { settingsStore, toggleModule, setModuleOrder } from '../core/settings'
import { MODULES } from '../core/registry'
import { navigate } from '../core/router'
import { Toggle, Chevron } from '../app/ui'

const ROW_H = 84

export default function Modules() {
  const settings = useStore(settingsStore)
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null)
  const startY = useRef(0)
  const orderRef = useRef<string[]>([])

  const enabledOrdered = settings.enabled.filter((id) => MODULES.some((mm) => mm.id === id))
  const disabled = MODULES.filter((mm) => !settings.enabled.includes(mm.id))

  function onDragStart(id: string, y: number) {
    startY.current = y
    orderRef.current = [...enabledOrdered]
    setDrag({ id, dy: 0 })
  }
  function onDragMove(y: number) {
    setDrag((d) => {
      if (!d) return d
      const dy = y - startY.current
      const order = orderRef.current
      const from = order.indexOf(d.id)
      const shift = Math.round(dy / ROW_H)
      const to = Math.min(order.length - 1, Math.max(0, from + shift))
      if (to !== from) {
        const next = [...order]
        next.splice(from, 1)
        next.splice(to, 0, d.id)
        orderRef.current = next
        startY.current = y
        setModuleOrder(next)
        return { id: d.id, dy: 0 }
      }
      return { id: d.id, dy }
    })
  }

  return (
    <>
      <div className="screen-head">
        <div className="eyebrow">Your toolkit</div>
        <h1 className="screen-title">Modules</h1>
      </div>

      <p className="rs-foot" style={{ margin: '0 2px 12px' }}>
        Hold the ⠿ handle and drag to reorder — Today follows this order.
      </p>
      {[...enabledOrdered.map((id) => MODULES.find((mm) => mm.id === id)!), ...disabled].map((m) => {
        const on = settings.enabled.includes(m.id)
        const dragging = drag?.id === m.id
        return (
          <div
            className={'card mmod-card' + (dragging ? ' dragging' : '')}
            key={m.id}
            style={dragging ? { transform: `translateY(${drag!.dy}px)` } : undefined}
          >
            <div className="mmod">
              {on && (
                <span
                  className="mmod-grip"
                  aria-label={`Reorder ${m.name}`}
                  onTouchStart={(e: { touches: { clientY: number }[] }) => onDragStart(m.id, e.touches[0].clientY)}
                  onTouchMove={(e: { touches: { clientY: number }[] }) => onDragMove(e.touches[0].clientY)}
                  onTouchEnd={() => setDrag(null)}
                >
                  ⠿
                </span>
              )}
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

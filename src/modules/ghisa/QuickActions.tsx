/**
 * GHISA dashboard quick action — "Start workout" chip on the 1% overview.
 * Opens a small routine menu (templates + empty), starts the session, and
 * lands the user directly in the live workout screen via the ghisaUi channel.
 */
import { useState } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { ActionChip } from '../../app/ui'
import { ghisaStore, ghisaUi, startWorkout, type Template } from './model'

function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5 19 12 7 19.5v-15Z" />
    </svg>
  )
}

export default function GhisaQuickActions() {
  const st = useStore(ghisaStore)
  const [open, setOpen] = useState(false)

  function go(tpl: Template | null) {
    setOpen(false)
    if (!st.active) startWorkout(tpl)
    ghisaUi.set({ liveOpen: true })
    navigate('/m/ghisa/train')
  }

  return (
    <>
      <ActionChip
        accentVar="var(--m-ghisa)"
        label={st.active ? 'Resume workout' : 'Start workout'}
        onClick={() => {
          if (st.active) go(null)
          else setOpen(true)
        }}
      />
      {open && (
        <div className="gh2 gh2-scrim" onClick={() => setOpen(false)}>
          <div className="gh2-actions" onClick={(e) => e.stopPropagation()}>
            <div className="gh2-actioncard">
              <div className="gh2-actiontitle">Start workout</div>
              {st.templates.map((t) => (
                <button key={t.id} className="gh2-action" onClick={() => go(t)}>
                  <PlayIcon size={16} /> {t.name}
                </button>
              ))}
              <button className="gh2-action" onClick={() => go(null)}>
                <PlayIcon size={16} /> Empty workout
              </button>
            </div>
            <button className="gh2-actioncancel" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  )
}

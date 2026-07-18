import { useState } from 'react'
import type { ModuleDefinition } from '../core/types'
import { eraseNS } from '../core/storage'
import { removeModuleEvents } from '../core/events'
import { ConfirmSheet } from './ui'

/**
 * The auto-appended Settings tab every module gets. Shared chrome:
 * about text and the erase hatch. Modules add their own extras via
 * `SettingsExtra` without re-implementing the dangerous parts.
 */
export default function ModuleSettingsScreen({ mod }: { mod: ModuleDefinition }) {
  const [confirming, setConfirming] = useState(false)
  const Extra = mod.SettingsExtra
  return (
    <>
      {Extra && <Extra />}
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: mod.accentVar }}>About</span>
        </div>
        <div className="kv"><span className="k">Module</span><span>{mod.name}</span></div>
        <div className="kv"><span className="k">Schema</span><span className="num">v{mod.schemaVersion}</span></div>
        <p className="rs-foot" style={{ marginTop: 8 }}>
          {mod.tagline}. Data lives on this device under its own key — erasing here touches only{' '}
          {mod.name}, nothing else.
        </p>
      </div>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--danger)' }}>Danger</span>
        </div>
        <button className="btn btn-danger" onClick={() => setConfirming(true)}>
          Erase {mod.name} data
        </button>
      </div>
      <ConfirmSheet
        open={confirming}
        title={`Erase ${mod.name}?`}
        body="Removes this module's saved data and its entries in the shared event stream, then reloads. The other modules are untouched. There is no undo."
        actionLabel="Erase & reload"
        danger
        onConfirm={() => {
          eraseNS(mod.id)
          removeModuleEvents(mod.id)
          window.location.reload()
        }}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

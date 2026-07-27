import { useRef, useState } from 'react'
import { useStore } from '../core/hooks'
import { eventsStore } from '../core/events'
import { settingsStore, setTheme, type Theme } from '../core/settings'
import { exportAll, importAll, clearAll } from '../core/storage'
import { todayKey } from '../core/dates'
import { toast } from '../core/toast'
import { ConfirmSheet, Seg, Chevron, Switch } from '../app/ui'
import { syncStore, connect, disconnect, backupNow, restoreLatest, FIREBASE_CONFIG } from '../core/sync'
import { seedAllSampleData, removeAllSampleData, anySampleData } from '../core/sampledata'
import { notifyStore, notifyStatus, enableNotifications, disableNotifications, setModuleNotify } from '../core/notify'
import { setModuleLines } from '../core/settings'
import { enabledModules } from '../core/registry'
import { navigate } from '../core/router'
import Mark from '../app/Mark'

const APP_VERSION = '0.22.0'

const THEME_OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
] as const

export default function Settings() {
  const events = useStore(eventsStore)
  const settings = useStore(settingsStore)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmErase, setConfirmErase] = useState(false)
  const [pendingImport, setPendingImport] = useState<string | null>(null)
  const sync = useStore(syncStore)
  const notify = useStore(notifyStore)

  function download() {
    try {
      const blob = new Blob([exportAll()], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `one-percent-backup-${todayKey()}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      toast('Backup exported')
    } catch {
      toast('Export failed')
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPendingImport(String(reader.result))
    reader.onerror = () => toast("Couldn't read that file")
    reader.readAsText(file)
  }

  return (
    <>
      <div className="screen-head">
        <div className="eyebrow">The instrument</div>
        <h1 className="screen-title">Settings</h1>
      </div>

      <button className="card navrow" onClick={() => navigate('/modules')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <rect x="13.1" y="3.5" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <rect x="3.5" y="13.1" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <rect x="13.1" y="13.1" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="mid">
          <b>Modules</b>
          <i>Enable, disable &amp; reorder your toolkit</i>
        </span>
        <Chevron />
      </button>


      <div className="card">
        <Mark size={40} title="" />
        <div className="kv">
          <span className="k">Version</span>
          <span className="num">{APP_VERSION}</span>
        </div>
        <div className="kv">
          <span className="k">Events logged</span>
          <span className="num">{events.length.toLocaleString()}</span>
        </div>
        <div className="kv">
          <span className="k">Data</span>
          <span>On this device only</span>
        </div>
      </div>

      <div className="section-label">Appearance</div>
      <div className="card">
        <Seg<Theme> options={THEME_OPTIONS} value={settings.theme} onChange={setTheme} />
        <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--faint)' }}>
          System follows your device. Dark is the instrument's home finish.
        </p>
      </div>

      <div className="section-label">Backup</div>
      <div className="card">
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={download}>
            Export
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--faint)' }}>
          One JSON file carries every module. Export before switching devices.
        </p>
        <div className="cloudrow">
          {sync.status === 'unconfigured' && (
            <p className="cloudnote">
              <b>Cloud backup</b> is scaffolded and dormant — paste a Firebase config into
              <span className="num"> src/core/sync.ts</span> and this card comes alive. Five-minute setup, documented in the file.
            </p>
          )}
          {sync.status !== 'unconfigured' && (
            <>
              <div className="cloudhead">
                <b>Cloud backup</b>
                <span>{sync.email ?? 'not connected'}</span>
              </div>
              {sync.error && <p className="clouderr">{sync.error}</p>}
              <div className="btn-row">
                {sync.status !== 'signedin' && sync.status !== 'working' && (
                  <button className="btn btn-ghost" onClick={() => void connect()} disabled={sync.status === 'loading'}>
                    {sync.status === 'loading' ? 'Connecting…' : 'Connect Google'}
                  </button>
                )}
                {(sync.status === 'signedin' || sync.status === 'working') && (
                  <>
                    <button className="btn btn-ghost" disabled={sync.status === 'working'}
                      onClick={() => { backupNow().then(() => toast('Backed up to cloud')).catch(() => toast('Backup failed')) }}>
                      {sync.status === 'working' ? 'Backing up…' : 'Back up now'}
                    </button>
                    <button className="btn btn-ghost"
                      onClick={() => { restoreLatest().then((ok) => { if (!ok) toast('No cloud backup yet') }).catch(() => toast('Restore failed')) }}>
                      Restore
                    </button>
                    <button className="btn btn-ghost" onClick={() => void disconnect()}>Sign out</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="section-label">Notifications</div>
      <div className="card">
        {(() => {
          const status = notifyStatus()
          if (status === 'unsupported') {
            return <p className="cloudnote">This browser doesn't support notifications.</p>
          }
          return (
            <>
              <div className="cloudhead">
                <b>Notifications</b>
                <span>{status === 'denied' ? 'blocked in browser settings' : notify.enabled && status === 'granted' ? 'on' : 'off'}</span>
              </div>
              <p className="cloudnote" style={{ marginBottom: 10 }}>
                Timers, fasting phases, and app updates arrive as system notifications.
                On iPhone the web app needs to be installed to the Home Screen; the App Store
                build can also alert you while it is closed.
              </p>
              {status !== 'denied' && (
                <div className="btn-row">
                  {!(notify.enabled && status === 'granted') ? (
                    <button className="btn btn-ghost" onClick={() => void enableNotifications()}>Enable</button>
                  ) : (
                    <button className="btn btn-ghost" onClick={() => disableNotifications()}>Turn off</button>
                  )}
                </div>
              )}
              {notify.enabled && status === 'granted' && (
                <div className="nmods">
                  {enabledModules(settings.enabled).map((m) => {
                    const on = notify.mods[m.id] !== false
                    return (
                      <div className="nrow" key={m.id}>
                        <span>{m.name}</span>
                        <Switch checked={on} onChange={(v) => setModuleNotify(m.id, v)} label={`Notifications for ${m.name}`} />
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )
        })()}
      </div>

      <div className="section-label">Display</div>
      <div className="card">
        <div className="nrow">
          <div>
            <span>Modules over time</span>
            <p className="cloudnote" style={{ margin: '3px 0 0' }}>Per-module progress lines under the Profile ledger.</p>
          </div>
          <Switch
            checked={settings.moduleLines !== false}
            onChange={(v) => setModuleLines(v)}
            label="Modules over time on Profile"
          />
        </div>
      </div>

      <div className="section-label">Sample data</div>
      <div className="card">
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--faint)', lineHeight: 1.6 }}>
          Twelve months of realistic, seam-linked history across every module — deterministic, so
          screenshots are reproducible. Tagged throughout: removal never touches your real data.
        </p>
        <div className="btn-row">
          <button
            className="btn btn-ghost"
            onClick={() => {
              const n = seedAllSampleData()
              toast(`Sample data loaded — ${n} modules`)
            }}
          >
            Load sample data
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!anySampleData()) {
                toast('No sample data present')
                return
              }
              removeAllSampleData()
              toast('Sample data removed')
            }}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="section-label">Danger zone</div>
      <div className="card">
        <button className="btn btn-danger" onClick={() => setConfirmErase(true)}>
          Erase all data
        </button>
      </div>

      <ConfirmSheet
        open={pendingImport !== null}
        title="Import backup?"
        body="This replaces everything currently stored — workouts, habits, sessions, tests and settings."
        actionLabel="Import"
        onConfirm={() => {
          try {
            const n = importAll(pendingImport ?? '')
            toast(`${n} entries restored`)
            setTimeout(() => location.reload(), 600)
          } catch {
            toast("That isn't a 1% backup file")
          }
        }}
        onClose={() => setPendingImport(null)}
      />

      <ConfirmSheet
        open={confirmErase}
        title="Erase everything?"
        body="All modules, history and settings are removed from this device. Export a backup first if in doubt."
        actionLabel="Erase"
        danger
        onConfirm={() => {
          clearAll()
          location.reload()
        }}
        onClose={() => setConfirmErase(false)}
      />
    </>
  )
}

import { useRef, useState } from 'react'
import { useStore } from '../core/hooks'
import { oneStore, setRate, setGoal } from '../core/one'
import { parseNum } from '../app/ui'
import { eventsStore } from '../core/events'
import { settingsStore, setTheme, type Theme } from '../core/settings'
import { exportAll, importAll, clearAll } from '../core/storage'
import { todayKey } from '../core/dates'
import { toast } from '../core/toast'
import { ConfirmSheet, Seg } from '../app/ui'

const APP_VERSION = '0.7.0'

const THEME_OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
] as const

function OnePercentCard() {
  const one = useStore(oneStore)
  const rates = [0.005, 0.01, 0.02]
  const goalRows: { key: 'grove' | 'respiro' | 'ghisa'; label: string; unit: string; hint: string }[] = [
    { key: 'grove', label: 'GROVE focus / week', unit: 'min', hint: 'e.g. 2400 = 40 h — holding it scores 100%' },
    { key: 'respiro', label: 'RESPIRO breathwork / week', unit: 'min', hint: 'a ceiling where maintenance counts' },
    { key: 'ghisa', label: 'GHISA volume / week', unit: 'kg', hint: 'cap the ratchet at a sane training load' },
  ]
  return (
    <div className="card">
      <div className="card-head">
        <span className="label">Your 1%</span>
      </div>
      <div className="kv">
        <span className="k">Weekly improvement rate — the target beats your trailing 4-week pace by this much</span>
      </div>
      <div className="chips" style={{ marginBottom: 6 }}>
        {rates.map((r) => (
          <button
            key={r}
            className={'chip' + (one.rate === r ? ' on' : '')}
            onClick={() => setRate(r)}
          >
            {r * 100}% / week
          </button>
        ))}
      </div>
      <p className="rs-foot" style={{ marginBottom: 14 }}>
        Growth modules (GHISA, GROVE, RESPIRO) chase this ratchet. Habit modules (CADENCE, SANA)
        score the week directly. CALIBER only counts weeks you actually test.
      </p>
      {goalRows.map((g) => (
        <div className="kv" key={g.key}>
          <span className="k">
            {g.label}
            <span className="hint"> · {g.hint}</span>
          </span>
          <input
            className="tinput one-goal num"
            inputMode="numeric"
            placeholder="—"
            defaultValue={one.goals[g.key] !== undefined ? String(one.goals[g.key]) : ''}
            onBlur={(e) => {
              const n = parseNum(e.target.value)
              setGoal(g.key, n !== null && n > 0 ? Math.round(n) : undefined)
            }}
          />
        </div>
      ))}
      <p className="rs-foot">
        Goals are optional ceilings: once your pace reaches one, the target stops ratcheting and
        holding the ceiling is a 100% week. Clear the field to let the ratchet run.
      </p>
    </div>
  )
}

export default function Settings() {
  const events = useStore(eventsStore)
  const settings = useStore(settingsStore)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmErase, setConfirmErase] = useState(false)
  const [pendingImport, setPendingImport] = useState<string | null>(null)

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

      <OnePercentCard />

      <div className="card">
        <div className="about-mark">
          1<span className="pct">%</span>
        </div>
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

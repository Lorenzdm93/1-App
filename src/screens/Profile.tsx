import { useStore } from '../core/hooks'
import { navigate } from '../core/router'
import { settingsStore } from '../core/settings'
import { enabledModules } from '../core/registry'
import { oneStore } from '../core/one'
import { eventsStore } from '../core/events'
import { Bars } from '../app/charts'
import { StatBox } from '../app/ui'
import { ghisaStore } from '../modules/ghisa/model'
import { oraStore, oraStats } from '../modules/ora/model'
import type { CSSProperties } from 'react'
import { caliberStore } from '../modules/caliber/model'

/** Sum of event values for a module+kind, in the event's native unit. */
function sumEvents(module: string, kind?: string): number {
  return eventsStore
    .get()
    .filter((e) => e.module === module && (kind === undefined || e.kind === kind))
    .reduce((s, e) => s + (e.value ?? 0), 0)
}

function countEvents(module: string): number {
  return eventsStore.get().filter((e) => e.module === module).length
}

export default function Profile() {
  const settings = useStore(settingsStore)
  const one = useStore(oneStore)
  useStore(eventsStore)
  const mods = enabledModules(settings.enabled)

  const weeks = Object.entries(one.weekLog).sort(([a], [b]) => (a < b ? -1 : 1))
  const won = weeks.filter(([, w]) => w.score >= 100).length
  const best = weeks.reduce((m, [, w]) => Math.max(m, w.score), 0)
  const compound = Math.round((Math.pow(1 + one.rate, won) - 1) * 100)

  const gh = ghisaStore.get()
  const lifetimeVolume = Math.round(gh.workouts.reduce((s, w) => s + w.volume, 0))
  const ora = oraStats(oraStore.get().fasts)
  const cal = caliberStore.get()
  const bestE1 = Math.round(
    Object.values(cal.prs).reduce((m, p) => Math.max(m, p?.e1rm ?? 0), 0),
  )

  const cumulative: Record<string, string> = {
    ghisa: lifetimeVolume > 0 ? `${lifetimeVolume.toLocaleString()} kg lifted` : '—',
    grove: sumEvents('grove') > 0 ? `${Math.round(sumEvents('grove') / 60)} h focused` : '—',
    respiro: sumEvents('respiro') > 0 ? `${Math.round(sumEvents('respiro'))} min breathed` : '—',
    ora: ora.totalH > 0 ? `${Math.round(ora.totalH)} h fasted` : '—',
    cadence: countEvents('cadence') > 0 ? `${countEvents('cadence')} entries` : '—',
    sana: countEvents('sana') > 0 ? `${countEvents('sana')} doses logged` : '—',
    caliber: bestE1 > 0 ? `best e1RM ${bestE1} kg` : '—',
  }

  return (
    <>
      <div className="screen-head">
        <div className="eyebrow">The long game</div>
        <h1 className="screen-title">Profile</h1>
      </div>

      <div className="card">
        <div className="ins-grid three">
          <StatBox label="weeks won" value={`${won}/${weeks.length}`} />
          <StatBox label="compounded" value={won > 0 ? `+${compound}%` : '—'} />
          <StatBox label="best week" value={best > 0 ? `${Math.round(best)}%` : '—'} />
        </div>
        {weeks.length >= 2 && (
          <>
            <div className="section-label">The ledger</div>
            <Bars data={weeks.slice(-16).map(([k, w]) => ({ label: k.slice(5), value: w.score }))} accentVar="var(--accent)" />
          </>
        )}
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/one')}>
          The 1% engine — rate, goals, philosophy
        </button>
      </div>

      <div className="section-label">Per module — all time</div>
      {mods.map((m) => {
        const wonHere = weeks.filter(([, w]) => (w.per[m.id] ?? 0) >= 100).length
        return (
          <button
            key={m.id}
            className="card card-tap pf-row"
            style={{ ['--accent' as string]: m.accentVar } as CSSProperties}
            onClick={() => navigate('/m/' + m.id)}
          >
            <span className="pf-ic">
              <m.Icon size={18} />
            </span>
            <span className="pf-main">
              <b>{m.name}</b>
              <span>{cumulative[m.id] ?? '—'}</span>
            </span>
            <span className="pf-won num">
              {wonHere}
              <i>wks won</i>
            </span>
          </button>
        )
      })}
      <p className="rs-foot">
        Cumulative numbers are lifetime, straight from the log. The compounding figure is (1 +
        rate)^weeks-won — the honest arithmetic of showing up.
      </p>
    </>
  )
}

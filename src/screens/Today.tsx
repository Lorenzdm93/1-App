import { useStore } from '../core/hooks'
import { eventsStore, activeModulesOnDay, currentStreak } from '../core/events'
import { settingsStore } from '../core/settings'
import { enabledModules } from '../core/registry'
import { navigate } from '../core/router'
import { todayKey, lastNDayKeys, dayKey } from '../core/dates'
import { OnePercentRing, Chevron, Empty } from '../app/ui'

export default function Today() {
  const events = useStore(eventsStore)
  const settings = useStore(settingsStore)
  const modules = enabledModules(settings.enabled)

  const today = todayKey()
  const activeToday = activeModulesOnDay(events, today)
  const streak = currentStreak(events, today)
  const week = lastNDayKeys(7)
  const activeDays = new Set(events.map((e) => dayKey(e.ts)))

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <>
      <div className="screen-head">
        <div className="eyebrow">{dateLabel}</div>
        <h1 className="screen-title">Today</h1>
      </div>

      <div className="card hero">
        <OnePercentRing modules={modules} activeIds={activeToday}>
          <span className="big num">{streak}</span>
          <span className="cap">day streak</span>
        </OnePercentRing>
        <div className="hero-caption">
          {activeToday.size > 0 ? (
            <>
              <span className="lit">1% banked</span> — {activeToday.size} of {modules.length} modules
              active today
            </>
          ) : (
            <>Nothing logged yet — one small action claims the day.</>
          )}
        </div>
        <div className="day-dots" aria-label="Last seven days">
          {week.map((day) => (
            <span
              key={day}
              className={
                'day-dot' + (activeDays.has(day) ? ' on' : '') + (day === today ? ' today' : '')
              }
            />
          ))}
        </div>
      </div>

      {modules.length === 0 && (
        <Empty title="No modules enabled" sub="Turn on the tools you want in the Modules tab." />
      )}

      {modules.map((m) => (
        <div className="card" key={m.id}>
          <button className="card-head" onClick={() => navigate('/m/' + m.id)}>
            <span className="mark">
              <m.Icon />
            </span>
            <span className="label" style={{ color: m.accentVar }}>
              {m.name}
            </span>
            <Chevron />
          </button>
          <m.Widget />
          {m.QuickActions && (
            <div className="action-row">
              <m.QuickActions />
            </div>
          )}
        </div>
      ))}
    </>
  )
}

import { eventsStore } from '../../core/events'
import { dayKey } from '../../core/dates'
import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'
import QuickActions from './QuickActions'

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12h19" stroke="var(--m-ghisa)" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="7.5" width="3" height="9" rx="1" fill="var(--m-ghisa)" />
      <rect x="16" y="7.5" width="3" height="9" rx="1" fill="var(--m-ghisa)" />
      <rect x="2" y="9.5" width="2" height="5" rx="0.8" fill="var(--m-ghisa)" opacity="0.55" />
      <rect x="20" y="9.5" width="2" height="5" rx="0.8" fill="var(--m-ghisa)" opacity="0.55" />
    </svg>
  )
}

function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 12h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5.4" y="8" width="2.8" height="8" rx="1" fill="currentColor" />
      <rect x="15.8" y="8" width="2.8" height="8" rx="1" fill="currentColor" />
    </svg>
  )
}

function ClockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SparkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19V9M12 19V4M19 19v-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1.6" fill="currentColor" />
    </svg>
  )
}

const ghisa: ModuleDefinition = {
  id: 'ghisa',
  name: 'GHISA',
  tagline: 'Workout log — sets, volume, iron discipline.',
  accentVar: 'var(--m-ghisa)',
  schemaVersion: 4,
  tabs: [
    { id: 'train', label: 'Train', Icon: BellIcon },
    { id: 'history', label: 'History', Icon: ClockIcon },
    { id: 'insights', label: 'Insights', Icon: SparkIcon },
  ],
  Icon,
  Screen,
  Widget,
  QuickActions,
  weekly: {
    label: 'volume',
    unit: 'kg',
    mode: 'growth',
    goalKey: 'ghisa',
    measure(start, end) {
      let v = 0
      for (const e of eventsStore.get()) {
        if (e.module !== 'ghisa' || e.kind !== 'session') continue
        const d = dayKey(e.ts)
        if (d >= start && d <= end) v += e.value ?? 0
      }
      return Math.round(v)
    },
    advice({ gap }) {
      return `${Math.ceil(gap).toLocaleString()} kg of volume to go — one honest session usually covers it.`
    },
  },
}

export default ghisa

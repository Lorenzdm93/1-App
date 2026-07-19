import { oraStore, weekFastScore, elapsedH, targetHoursFor } from './model'
import type { ModuleDefinition } from '../../core/types'
import OraScreen, { OraSettingsExtra } from './Screen'
import OraWidget from './Widget'
import OraQuickActions from './QuickActions'

function DialIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.5V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 12l3.4-3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function BodyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 9h6M9 13h6M9 17h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20V11M12 20V5M19 20v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ListIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 6.5h7M4 12.5h15M4 18.5h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const ora: ModuleDefinition = {
  id: 'ora',
  name: 'ORA',
  tagline: 'Fasting, hour by hour',
  accentVar: 'var(--m-ora)',
  Icon: DialIcon,
  schemaVersion: 1,
  tabs: [
    { id: 'timer', label: 'Timer', Icon: DialIcon },
    { id: 'body', label: 'Body', Icon: BodyIcon },
    { id: 'progress', label: 'Progress', Icon: ChartIcon },
    { id: 'log', label: 'Log', Icon: ListIcon },
  ],
  Screen: OraScreen,
  Widget: OraWidget,
  QuickActions: OraQuickActions,
  SettingsExtra: OraSettingsExtra,
  weekly: {
    label: 'fasting',
    unit: '%',
    mode: 'completion',
    measure(start, end) {
      return weekFastScore(oraStore.get(), start, end)
    },
    advice() {
      const st = oraStore.get()
      if (st.current) {
        const left = st.current.targetH - elapsedH(st.current.startTs)
        if (left > 0) return `${Math.ceil(left * 10) / 10}h to target — the fast in progress lifts the week.`
        return 'Target reached — end the fast when you\'re ready and bank it.'
      }
      const t = targetHoursFor(st)
      return `A completed ${t}h fast today raises the week's average.`
    },
  },
}

export default ora

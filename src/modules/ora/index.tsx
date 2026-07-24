import { oraStore, weekFastScore, elapsedH, targetHoursFor } from './model'
import { wireOraIntegrations } from './integrations'

/* Registration-time side effect: fast minutes stream into CADENCE. */
wireOraIntegrations()
import type { ModuleDefinition } from '../../core/types'
import OraScreen, { OraSettingsExtra } from './Screen'
import OraWidget from './Widget'
import OraQuickActions from './QuickActions'

function DialIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="13.2" r="7.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 2.6h4M12 2.6v2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 13.2 15 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M18.6 5.6l1.4 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
      <circle cx="6.4" cy="6.6" r="2.9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.4 5.2v1.5l1 .8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12.4 6.6H20M4 12.6h16M4 18.4h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const ora: ModuleDefinition = {
  id: 'ora',
  name: 'ORA',
  tagline: 'Fasting, hour by hour',
  intro: {
    body: [
      'Fasting, hour by hour: pick a daily rhythm, a custom length, or an eating window — the dial tracks you to the second.',
      'Body shows what\'s happening inside at every stage. Ending early still logs: it\'s data, not failure.',
    ],
    disclaimer:
      'ORA is not medical advice. Do not fast — and talk to a doctor first — if you are pregnant, under 18, underweight, have a history of disordered eating, or take medication affecting blood sugar or blood pressure.',
  },
  accentVar: 'var(--m-ora)',
  Icon: DialIcon,
  schemaVersion: 2,
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

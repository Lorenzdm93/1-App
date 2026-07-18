import type { ModuleDefinition } from '../../core/types'
import SanaScreen from './Screen'
import SanaWidget from './Widget'
import SanaQuickActions from './QuickActions'

function PillIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="9" width="17" height="7" rx="3.5" stroke="currentColor" strokeWidth="1.7" transform="rotate(-35 12 12)" />
      <path d="M9.2 14.8l5.6-5.6" stroke="currentColor" strokeWidth="1.7" transform="rotate(-35 12 12)" />
    </svg>
  )
}

function ListIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4.6" cy="6.5" r="1.4" fill="currentColor" />
      <circle cx="4.6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="4.6" cy="17.5" r="1.4" fill="currentColor" />
    </svg>
  )
}

function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20V10M12 20V5M19 20v-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function SanaIcon({ size = 22 }: { size?: number }) {
  return <PillIcon size={size} />
}

const sana: ModuleDefinition = {
  id: 'sana',
  name: 'SANA',
  tagline: 'Supplements & medicine, on rails',
  accentVar: 'var(--m-sana)',
  schemaVersion: 1,
  Icon: SanaIcon,
  tabs: [
    { id: 'today', label: 'Today', Icon: PillIcon },
    { id: 'stack', label: 'Stack', Icon: ListIcon },
    { id: 'insights', label: 'Insights', Icon: ChartIcon },
  ],
  Screen: SanaScreen,
  Widget: SanaWidget,
  QuickActions: SanaQuickActions,
}

export default sana

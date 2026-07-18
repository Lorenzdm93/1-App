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

function LayersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 9 5-9 5-9-5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m4.5 12.5 7.5 4.2 7.5-4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4.5 16.5 7.5 4.2 7.5-4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    </svg>
  )
}

function BookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 6c-2-1.6-4.6-2-8-2v14c3.4 0 6 .4 8 2 2-1.6 4.6-2 8-2V4c-3.4 0-6 .4-8 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 6v14" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
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
  tagline: 'Your stacks, on rails',
  accentVar: 'var(--m-sana)',
  schemaVersion: 1,
  Icon: SanaIcon,
  tabs: [
    { id: 'today', label: 'Today', Icon: PillIcon },
    { id: 'stacks', label: 'Stacks', Icon: LayersIcon },
    { id: 'history', label: 'History', Icon: ChartIcon },
    { id: 'library', label: 'Library', Icon: BookIcon },
  ],
  Screen: SanaScreen,
  Widget: SanaWidget,
  QuickActions: SanaQuickActions,
}

export default sana

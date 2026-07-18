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

const ghisa: ModuleDefinition = {
  id: 'ghisa',
  name: 'GHISA',
  tagline: 'Workout log — sets, volume, iron discipline.',
  accentVar: 'var(--m-ghisa)',
  schemaVersion: 4,
  tabs: [
    { id: 'train', label: 'Train' },
    { id: 'history', label: 'History' },
    { id: 'stats', label: 'Stats' },
  ],
  Icon,
  Screen,
  Widget,
  QuickActions,
}

export default ghisa

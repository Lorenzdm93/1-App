import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'
import QuickActions from './QuickActions'

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="var(--m-respiro)" strokeWidth="1.6" opacity="0.45" />
      <circle cx="12" cy="12" r="5" stroke="var(--m-respiro)" strokeWidth="1.6" opacity="0.75" />
      <circle cx="12" cy="12" r="1.8" fill="var(--m-respiro)" />
    </svg>
  )
}

const respiro: ModuleDefinition = {
  id: 'respiro',
  name: 'RESPIRO',
  tagline: 'Breathwork — box, 4-7-8, coherence, sigh.',
  accentVar: 'var(--m-respiro)',
  schemaVersion: 2,
  tabs: [
    { id: 'breathe', label: 'Breathe' },
    { id: 'tools', label: 'Tools' },
  ],
  Icon,
  Screen,
  Widget,
  QuickActions,
}

export default respiro

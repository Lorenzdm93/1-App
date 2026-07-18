import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'
import QuickActions from './QuickActions'

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12,3 17,11 7,11" fill="var(--m-grove)" opacity="0.9" />
      <polygon points="12,8 18.5,17 5.5,17" fill="var(--m-grove)" opacity="0.65" />
      <rect x="10.9" y="17" width="2.2" height="4" rx="1" fill="var(--m-grove)" opacity="0.8" />
    </svg>
  )
}

const grove: ModuleDefinition = {
  id: 'grove',
  name: 'GROVE',
  tagline: 'Deep focus grows a forest.',
  accentVar: 'var(--m-grove)',
  schemaVersion: 1,
  tabs: [
    { id: 'focus', label: 'Focus' },
    { id: 'forest', label: 'Forest' },
  ],
  Icon,
  Screen,
  Widget,
  QuickActions,
}

export default grove

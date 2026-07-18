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

function TreeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 17 11H7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 8.5 18.5 17h-13z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 17v4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function ForestIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 5 10.5 11h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17 7 20.5 13h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 11v5M17 13v3M3 20h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
    { id: 'focus', label: 'Focus', Icon: TreeIcon },
    { id: 'forest', label: 'Forest', Icon: ForestIcon },
  ],
  Icon,
  Screen,
  Widget,
  QuickActions,
}

export default grove

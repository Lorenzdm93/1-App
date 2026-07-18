import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 15.5a8 8 0 0 1 16 0"
        stroke="var(--m-caliber)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M12 15.5 15.5 9" stroke="var(--m-caliber)" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.7" fill="var(--m-caliber)" />
    </svg>
  )
}

const caliber: ModuleDefinition = {
  id: 'caliber',
  name: 'CALIBER',
  tagline: 'Strength gauge — e1RM and standards per lift.',
  accentVar: 'var(--m-caliber)',
  schemaVersion: 2,
  Icon,
  Screen,
  Widget,
}

export default caliber

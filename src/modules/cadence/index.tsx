import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="13" width="3.4" height="6" rx="1.2" fill="var(--m-cadence)" opacity="0.5" />
      <rect x="8.6" y="9" width="3.4" height="10" rx="1.2" fill="var(--m-cadence)" opacity="0.75" />
      <rect x="14.2" y="5" width="3.4" height="14" rx="1.2" fill="var(--m-cadence)" />
      <circle cx="20.5" cy="6" r="1.6" fill="var(--m-cadence)" />
    </svg>
  )
}

const cadence: ModuleDefinition = {
  id: 'cadence',
  name: 'CADENCE',
  tagline: 'Daily habits — streaks that compound.',
  accentVar: 'var(--m-cadence)',
  schemaVersion: 1,
  Icon,
  Screen,
  Widget,
}

export default cadence

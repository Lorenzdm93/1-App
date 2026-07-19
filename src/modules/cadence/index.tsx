import { cadenceStore, weekCompletion, weekAdvice } from './model'
import { weekStartKey, todayKey } from '../../core/dates'
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

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function GridIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3, 4].map((c) => (
          <rect key={r + '-' + c} x={3.4 + c * 3.7} y={5 + r * 3.7} width="2.5" height="2.5" rx="0.7" fill="currentColor" opacity={(r + c) % 3 === 0 ? 1 : 0.4} />
        )),
      )}
    </svg>
  )
}

const cadence: ModuleDefinition = {
  id: 'cadence',
  name: 'CADENCE',
  tagline: 'Daily habits — streaks that compound.',
  accentVar: 'var(--m-cadence)',
  schemaVersion: 3,
  tabs: [
    { id: 'today', label: 'Today', Icon: CheckIcon },
    { id: 'month', label: 'Month', Icon: CalIcon },
    { id: 'year', label: 'Year', Icon: GridIcon },
  ],
  Icon,
  Screen,
  Widget,
  weekly: {
    label: 'habits',
    unit: '%',
    mode: 'completion',
    measure(start, _end) {
      return weekCompletion(cadenceStore.get(), start)
    },
    advice() {
      return weekAdvice(cadenceStore.get(), weekStartKey(todayKey())) ?? 'A little behind — the smallest habit today restarts the pull.'
    },
  },
}

export default cadence

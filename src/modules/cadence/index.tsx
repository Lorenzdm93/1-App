import { cadenceStore, weekCompletion, weekAdvice } from './model'
import { weekStartKey, todayKey } from '../../core/dates'
import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 13h3l2.4-6.4 3.4 11 2.6-8.6 1.9 4h5.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.4 12.3 2.4 2.4 4.9-5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {[5, 12, 19].map((y) =>
        [4, 9.33, 14.66, 20].map((x) => <circle key={x + '-' + y} cx={x} cy={y} r="1.5" />),
      )}
    </svg>
  )
}

const cadence: ModuleDefinition = {
  id: 'cadence',
  name: 'CADENCE',
  tagline: 'Daily habits — streaks that compound.',
  intro: {
    body: [
      'Small daily promises, kept visibly. Build habits count checks against a weekly target; quit habits count clean days.',
      'Tap to check today, page back to fix yesterday. Slips log without drama — the streak just restarts.',
    ],
  },
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

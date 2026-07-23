import { eventsStore } from '../../core/events'
import { dayKey } from '../../core/dates'
import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'
import QuickActions from './QuickActions'

/* GHISA's mark — the prototype's lucide dumbbell (0.383), exact strokes. */
function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6.5 6.5 11 11" /><path d="m21 21-1-1" /><path d="m3 3 1 1" />
      <path d="m18 22 4-4" /><path d="m2 6 4-4" /><path d="m3 10 7-7" /><path d="m14 21 7-7" />
    </svg>
  )
}

function HomeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5" />
    </svg>
  )
}

function DumbIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6.5 6.5 11 11" /><path d="m21 21-1-1" /><path d="m3 3 1 1" />
      <path d="m18 22 4-4" /><path d="m2 6 4-4" /><path d="m3 10 7-7" /><path d="m14 21 7-7" />
    </svg>
  )
}

function UserIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function LibIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M4.5 4.5v15M9 4.5v15M13.5 5.5v13M18.5 7.5 20 19" />
    </svg>
  )
}

const ghisa: ModuleDefinition = {
  id: 'ghisa',
  name: 'GHISA',
  tagline: 'Workout log — sets, volume, iron discipline.',
  intro: {
    body: [
      'GHISA logs the work: sets, kilos, honest volume. Start empty or from a template — the rest timer and PR flags run themselves.',
      'Every finished session feeds your week\'s 1% as training volume. The log is the coach.',
    ],
  },
  accentVar: 'var(--m-ghisa)',
  schemaVersion: 7,
  tabs: [
    { id: 'home', label: 'Home', Icon: HomeIcon },
    { id: 'train', label: 'Train', Icon: DumbIcon },
    { id: 'profile', label: 'Profile', Icon: UserIcon },
    { id: 'library', label: 'Exercises', Icon: LibIcon },
  ],
  Icon,
  Screen,
  Widget,
  QuickActions,
  weekly: {
    label: 'volume',
    unit: 'kg',
    mode: 'growth',
    goalKey: 'ghisa',
    measure(start, end) {
      let v = 0
      for (const e of eventsStore.get()) {
        if (e.module !== 'ghisa' || e.kind !== 'session') continue
        const d = dayKey(e.ts)
        if (d >= start && d <= end) v += e.value ?? 0
      }
      return Math.round(v)
    },
    advice({ gap }) {
      return `${Math.ceil(gap).toLocaleString()} kg of volume to go — one honest session usually covers it.`
    },
  },
}

export default ghisa

import { eventsStore } from '../../core/events'
import { dayKey } from '../../core/dates'
import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'

/* The forged dumbbell — GHISA's mark. */
function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <g transform="rotate(45 12 12)">
        <rect x="6.8" y="10.9" width="10.4" height="2.2" rx="1.1" />
        <rect x="4.6" y="8.6" width="2.4" height="6.8" rx="1.1" />
        <rect x="17" y="8.6" width="2.4" height="6.8" rx="1.1" />
        <rect x="2.9" y="10.1" width="1.5" height="3.8" rx="0.75" />
        <rect x="19.6" y="10.1" width="1.5" height="3.8" rx="0.75" />
      </g>
      <g transform="rotate(-45 12 12)">
        <rect x="6.8" y="10.9" width="10.4" height="2.2" rx="1.1" />
        <rect x="4.6" y="8.6" width="2.4" height="6.8" rx="1.1" />
        <rect x="17" y="8.6" width="2.4" height="6.8" rx="1.1" />
      </g>
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <g transform="rotate(45 12 12)">
        <rect x="6.8" y="10.9" width="10.4" height="2.2" rx="1.1" />
        <rect x="4.6" y="8.6" width="2.4" height="6.8" rx="1.1" />
        <rect x="17" y="8.6" width="2.4" height="6.8" rx="1.1" />
      </g>
      <g transform="rotate(-45 12 12)">
        <rect x="6.8" y="10.9" width="10.4" height="2.2" rx="1.1" />
        <rect x="4.6" y="8.6" width="2.4" height="6.8" rx="1.1" />
        <rect x="17" y="8.6" width="2.4" height="6.8" rx="1.1" />
      </g>
    </svg>
  )
}

function ClockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.6 5v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.9 9a8 8 0 1 1-.6 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 8.2V12l2.6 1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
  schemaVersion: 5,
  tabs: [
    { id: 'home', label: 'Home', Icon: HomeIcon },
    { id: 'train', label: 'Train', Icon: DumbIcon },
    { id: 'history', label: 'History', Icon: ClockIcon },
    { id: 'library', label: 'Exercises', Icon: LibIcon },
  ],
  Icon,
  Screen,
  Widget,
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

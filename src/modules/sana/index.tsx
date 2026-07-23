import { sanaStore, weekAdherence, dueOn, isTaken } from './model'
import { wireSanaIntegrations } from './integrations'

/* Registration-time side effect: dose changes stream into CADENCE. */
wireSanaIntegrations()
import { todayKey } from '../../core/dates'
import type { ModuleDefinition } from '../../core/types'
import SanaScreen from './Screen'
import SanaWidget from './Widget'
import SanaQuickActions from './QuickActions'

function PillIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.6" y="5" width="16.8" height="15.4" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v4M16 3v4M3.6 10h16.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m9 15 2 2 3.8-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LayersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3.6 8.4 4.4L12 12.4 3.6 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m3.6 12.4 8.4 4.4 8.4-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.6 16.6 8.4 4.4 8.4-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    </svg>
  )
}

function BookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 6.2C10.4 4.9 8 4.4 4.4 4.5v13.6c3.6-.1 6 .4 7.6 1.7 1.6-1.3 4-1.8 7.6-1.7V4.5c-3.6-.1-6 .4-7.6 1.7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 6.2v13.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 16v-3.4M12 16V8.6M16 16v-5.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function SanaIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g transform="rotate(-38 12 12)">
        <rect x="4.4" y="8.4" width="15.2" height="7.2" rx="3.6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 8.4v7.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M6.6 10.4c.5-.6 1.2-1 2-1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  )
}

const sana: ModuleDefinition = {
  id: 'sana',
  name: 'SANA',
  tagline: 'Your stacks, on rails',
  intro: {
    body: [
      'SANA keeps supplements and medicines in stacks — follow any mix per day, and anything they share is listed only once.',
      'Tap a stack on Today to see only its doses; tap the ⓘ beside any compound to read what it does. Take all ticks a whole stack at once.',
    ],
    disclaimer:
      'SANA is a personal tracker and general reference — not medical advice. Talk to a doctor or pharmacist before you start, stop, or combine supplements or medicines, especially when pregnant, nursing, on other medication, or managing a health condition.',
  },
  accentVar: 'var(--m-sana)',
  schemaVersion: 2,
  Icon: SanaIcon,
  tabs: [
    { id: 'today', label: 'Today', Icon: PillIcon },
    { id: 'stacks', label: 'Stacks', Icon: LayersIcon },
    { id: 'history', label: 'History', Icon: ChartIcon },
    { id: 'library', label: 'Library', Icon: BookIcon },
  ],
  Screen: SanaScreen,
  Widget: SanaWidget,
  QuickActions: SanaQuickActions,
  weekly: {
    label: 'adherence',
    unit: '%',
    mode: 'completion',
    measure(start, _end) {
      return weekAdherence(sanaStore.get(), start)
    },
    advice() {
      const st = sanaStore.get()
      const today = todayKey()
      const left = dueOn(st, today).filter(({ compound }) => !isTaken(st, compound.id, today)).length
      if (left > 0) return `${left} dose${left === 1 ? '' : 's'} today keeps the perfect week alive.`
      return 'A missed dose earlier this week — page back on Today to log it if it was actually taken.'
    },
  },
}

export default sana

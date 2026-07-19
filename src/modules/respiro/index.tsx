import { eventsStore } from '../../core/events'
import { dayKey } from '../../core/dates'
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

function LeafIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21C6 16 5 9 12 3c7 6 6 13 0 18z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 20V8" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
    </svg>
  )
}

function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20V12M12 20V6M19 20v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function NoteIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18V6l9-2v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

const respiro: ModuleDefinition = {
  id: 'respiro',
  name: 'RESPIRO',
  tagline: 'Breathwork — box, 4-7-8, coherence, sigh.',
  accentVar: 'var(--m-respiro)',
  schemaVersion: 3,
  tabs: [
    { id: 'practice', label: 'Practice', Icon: LeafIcon },
    { id: 'progress', label: 'Progress', Icon: ChartIcon },
    { id: 'sound', label: 'Sound', Icon: NoteIcon },
  ],
  Icon,
  Screen,
  Widget,
  QuickActions,
  weekly: {
    label: 'breathwork',
    unit: 'min',
    mode: 'growth',
    goalKey: 'respiro',
    measure(start, end) {
      let v = 0
      for (const e of eventsStore.get()) {
        if (e.module !== 'respiro' || e.kind !== 'session') continue
        const d = dayKey(e.ts)
        if (d >= start && d <= end) v += e.value ?? 0
      }
      return Math.round(v * 10) / 10
    },
    advice({ gap }) {
      return `${Math.ceil(gap)} breath minutes to go — one Coherent Breathing sitting clears it.`
    },
  },
}

export default respiro

import { eventsStore } from '../../core/events'
import { dayKey } from '../../core/dates'
import type { ModuleDefinition } from '../../core/types'
import Screen from './Screen'
import Widget from './Widget'
import QuickActions from './QuickActions'

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 14.5c2.5 0 2.5-5 5-5s2.5 5 5 5 2.5-5 5-5 2.5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" transform="translate(-1.5 -1)" />
      <path d="M4.5 18c2 0 2-3.4 4-3.4s2 3.4 4 3.4 2-3.4 4-3.4 2 3.4 4 3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

function LeafIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 13.5c2.4 0 2.4-4.6 4.8-4.6s2.4 4.6 4.8 4.6 2.4-4.6 4.8-4.6 2.4 4.6 4.8 4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" transform="translate(-1.2 -0.5)" />
      <path d="M4.5 17.4c1.9 0 1.9-3 3.8-3s1.9 3 3.8 3 1.9-3 3.8-3 1.9 3 3.8 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
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
      <path d="M9.5 17.4V5.8l9-1.8v11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.9" cy="17.4" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15.9" cy="15.4" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

const respiro: ModuleDefinition = {
  id: 'respiro',
  name: 'RESPIRO',
  tagline: 'Breathwork — box, 4-7-8, coherence, sigh.',
  intro: {
    body: [
      'Seven breathing protocols, from a 60-second downshift to sleep-ready 4·7·8 — pick by what you need right now.',
      'The dial paces you breath by breath; the bell is synthesized, nothing to download.',
    ],
  },
  accentVar: 'var(--m-respiro)',
  schemaVersion: 4,
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

import { eventsStore } from '../../core/events'
import { wireGroveIntegrations } from './integrations'

/* Registration-time side effect: minutes stream into CADENCE. */
wireGroveIntegrations()
import { dayKey } from '../../core/dates'
import type { ModuleDefinition } from '../../core/types'
import { lazyRetry } from '../../core/lazyload'
/* Code-split: the screen (and its settings block, same chunk) load on first visit. */
const Screen = lazyRetry(() => import('./Screen'))
const GroveSettingsExtra = lazyRetry(() => import('./Screen').then((m) => ({ default: m.GroveSettingsExtra })))
import Widget from './Widget'
import QuickActions from './QuickActions'

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12,2 18.4,10.6 5.6,10.6" fill="var(--m-grove)" opacity="0.92" />
      <polygon points="12,7.4 20,17.4 4,17.4" fill="var(--m-grove)" opacity="0.62" />
      <rect x="10.7" y="17.4" width="2.6" height="4.4" rx="1.2" fill="var(--m-grove)" opacity="0.85" />
    </svg>
  )
}

function TreeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 17 11H7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 8.5 18.5 17h-13z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 17v4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function TaskIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.3 12.2 2.3 2.3 5-5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
  tagline: 'Focus timer',
  intro: {
    body: [
      'A focus timer that grows a forest. Finished sessions plant trees by length; breaks plant flowers and ferns.',
      'Only focused minutes count toward your week — breaks are scenery, on purpose. Lifetime hours unlock the animals.',
    ],
  },
  accentVar: 'var(--m-grove)',
  schemaVersion: 3,
  tabs: [
    { id: 'focus', label: 'Focus', Icon: TreeIcon },
    { id: 'tasks', label: 'Tasks', Icon: TaskIcon },
    { id: 'forest', label: 'Forest', Icon: ForestIcon },
  ],
  Icon,
  Screen,
  Widget,
  QuickActions,
  SettingsExtra: GroveSettingsExtra,
  weekly: {
    label: 'focus',
    unit: 'min',
    mode: 'growth',
    goalKey: 'grove',
    measure(start, end) {
      let v = 0
      for (const e of eventsStore.get()) {
        if (e.module !== 'grove' || e.kind !== 'focus') continue
        const d = dayKey(e.ts)
        if (d >= start && d <= end) v += e.value ?? 0
      }
      return Math.round(v)
    },
    advice({ gap }) {
      const block = gap <= 30 ? 25 : 50
      return `${Math.ceil(gap)} focus minutes to go — a ${block}-minute session fits inside today.`
    },
  },
}

export default grove

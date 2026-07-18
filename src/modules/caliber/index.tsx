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

function TargetIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function TrendIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17l5-5 3.5 3.5L20 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8h5v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H19" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

const caliber: ModuleDefinition = {
  id: 'caliber',
  name: 'CALIBER',
  tagline: 'Strength gauge — e1RM and standards per lift.',
  accentVar: 'var(--m-caliber)',
  schemaVersion: 2,
  tabs: [
    { id: 'test', label: 'Test', Icon: TargetIcon },
    { id: 'progress', label: 'Progress', Icon: TrendIcon },
    { id: 'standards', label: 'Standards', Icon: BookIcon },
  ],
  Icon,
  Screen,
  Widget,
}

export default caliber

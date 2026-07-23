import { navigate, type Route } from '../core/router'

function RingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.6" opacity="0.45" />
      <path d="M12 3.6a8.4 8.4 0 0 1 5.2 1.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.1" y="3.5" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.1" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.1" y="13.1" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 20c.9-3.6 3.8-5.4 7.2-5.4s6.3 1.8 7.2 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.03-1.51 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.51-1.03 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.04A1.7 1.7 0 0 0 10.03 3.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.51 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.04a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z" />
      </g>
    </svg>
  )
}

const TABS = [
  { name: 'today', label: 'Today', path: '/', Icon: RingIcon },
  { name: 'modules', label: 'Modules', path: '/modules', Icon: GridIcon },
  { name: 'profile', label: 'Profile', path: '/profile', Icon: PersonIcon },
  { name: 'settings', label: 'Settings', path: '/settings', Icon: SlidersIcon },
] as const

export default function TabBar({ route }: { route: Route }) {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <button
            key={t.name}
            className={'tab' + (route.name === t.name ? ' on' : '')}
            onClick={() => navigate(t.path)}
            aria-current={route.name === t.name ? 'page' : undefined}
          >
            <t.Icon />
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

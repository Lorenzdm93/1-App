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

function SlidersIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="12" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="7" cy="17" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

const TABS = [
  { name: 'today', label: 'Today', path: '/', Icon: RingIcon },
  { name: 'modules', label: 'Modules', path: '/modules', Icon: GridIcon },
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

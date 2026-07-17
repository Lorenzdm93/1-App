import { navigate, type Route } from '../core/router'

function RingIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" opacity="0.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 2.2.29" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.1" y="3.5" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="13.1" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.1" y="13.1" width="7.4" height="7.4" rx="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15" cy="12" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="7" cy="17" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1.7" />
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

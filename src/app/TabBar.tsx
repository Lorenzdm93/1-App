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
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9M18.5 18.5l-1.9-1.9M7.4 7.4 5.5 5.5"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      />
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

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { navigate, type Route } from '../core/router'

/** Hevy-style sliding pill: measure the active tab, glide the indicator to
    it. Measurement-based, so it survives variable widths and the module
    bar's horizontal scroll. */
export function useTabGlider(activeKey: string): {
  innerRef: RefObject<HTMLDivElement | null>
  glider: { x: number; w: number } | null
} {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const [glider, setGlider] = useState<{ x: number; w: number } | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = innerRef.current?.querySelector<HTMLElement>('.tab.on, .mtab.on')
      if (!el) { setGlider(null); return }
      setGlider({ x: el.offsetLeft, w: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeKey])
  return { innerRef, glider }
}

function RingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" opacity="0.45" />
      <path d="M12 4a8 8 0 0 1 5 1.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20c1-3.9 4.2-5.9 8-5.9s7 2 8 5.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M4 7.5h9M17.5 7.5H20" /><circle cx="15.2" cy="7.5" r="2.1" />
        <path d="M4 16.5h2.5M11 16.5h9" /><circle cx="8.8" cy="16.5" r="2.1" />
      </g>
    </svg>
  )
}

const TABS = [
  { name: 'today', label: 'Today', path: '/', Icon: RingIcon },
  { name: 'profile', label: 'Profile', path: '/profile', Icon: PersonIcon },
  { name: 'settings', label: 'Settings', path: '/settings', Icon: SlidersIcon },
] as const

export default function TabBar({ route }: { route: Route }) {
  const { innerRef, glider } = useTabGlider(route.name)
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner" ref={innerRef}>
        {glider && (
          <span
            className="tab-glider"
            aria-hidden="true"
            style={{ transform: `translateX(${glider.x}px)`, width: glider.w }}
          />
        )}
        {TABS.map((t) => {
          const on = route.name === t.name || (t.name === 'settings' && route.name === 'modules')
          return (
          <button
            key={t.name}
            className={'tab' + (on ? ' on' : '')}
            onClick={() => navigate(t.path)}
            aria-current={on ? 'page' : undefined}
          >
            <t.Icon />
            {t.label}
          </button>
          )
        })}
      </div>
    </nav>
  )
}

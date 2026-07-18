import type { CSSProperties } from 'react'
import { useRoute, navigate } from '../core/router'
import { moduleById } from '../core/registry'
import { useStore } from '../core/hooks'
import { settingsStore } from '../core/settings'
import { useTheme } from './theme'
import Today from '../screens/Today'
import Modules from '../screens/Modules'
import Settings from '../screens/Settings'
import Onboarding from '../screens/Onboarding'
import TabBar from './TabBar'
import ModuleTabBar from './ModuleTabBar'
import { ToastHost } from './ui'

function Wordmark({ name, accent }: { name: string; accent: string }) {
  const chars = [...name]
  const idx = Math.max(0, chars.length - 2)
  return (
    <div className="name wordmark">
      {chars.map((c, i) => (
        <span key={i} style={i === idx ? { color: accent } : undefined}>
          {c}
        </span>
      ))}
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ModuleScreen({ id, tab }: { id: string; tab?: string }) {
  const mod = moduleById(id)
  if (!mod) {
    navigate('/')
    return null
  }
  const tabs = mod.tabs
  const active = tabs ? (tabs.some((t) => t.id === tab) ? (tab as string) : tabs[0].id) : undefined
  return (
    <div className="mod-scope" style={{ ['--accent' as string]: mod.accentVar } as CSSProperties}>
      <div className="mod-head">
        <button className="back" onClick={() => navigate('/')} aria-label="Back to Today">
          <BackIcon />
        </button>
        <span className="mod-mark">
          <mod.Icon size={22} />
        </span>
        <div className="titles">
          <Wordmark name={mod.name} accent={mod.accentVar} />
          <div className="sub eyebrow-sub">{mod.tagline}</div>
        </div>
      </div>
      <mod.Screen tab={active} />
      {tabs && <ModuleTabBar moduleId={mod.id} tabs={tabs} active={active as string} />}
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const settings = useStore(settingsStore)
  useTheme(settings.theme)

  if (!settings.onboarded) {
    return (
      <main className="frame">
        <Onboarding />
        <ToastHost />
      </main>
    )
  }

  return (
    <>
      <main className="frame">
        {route.name === 'today' && <Today />}
        {route.name === 'modules' && <Modules />}
        {route.name === 'settings' && <Settings />}
        {route.name === 'module' && (
          <ModuleScreen id={route.id} tab={route.tab} key={route.id} />
        )}
      </main>
      {!(route.name === 'module' && moduleById(route.id)?.tabs) && <TabBar route={route} />}
      <ToastHost />
    </>
  )
}

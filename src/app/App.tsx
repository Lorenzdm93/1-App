import type { CSSProperties } from 'react'
import { useRoute, navigate } from '../core/router'
import { moduleById } from '../core/registry'
import { useStore } from '../core/hooks'
import { settingsStore } from '../core/settings'
import { useTheme } from './theme'
import Today from '../screens/Today'
import Modules from '../screens/Modules'
import Settings from '../screens/Settings'
import One from '../screens/One'
import Profile from '../screens/Profile'
import Onboarding from '../screens/Onboarding'
import TabBar from './TabBar'
import ModuleTabBar from './ModuleTabBar'
import ModuleSettingsScreen from './ModuleSettingsScreen'
import { ToastHost, Sheet } from './ui'
import { introStore, shouldShowIntro, markIntroSeen } from '../core/intro'

function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.9 1.9M7.4 16.6l-1.9 1.9M18.5 18.5l-1.9-1.9M7.4 7.4 5.5 5.5"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      />
    </svg>
  )
}

export const SETTINGS_TAB = { id: 'settings', label: 'Settings', Icon: GearIcon } as const

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
      <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ModuleScreen({ id, tab }: { id: string; tab?: string }) {
  const mod = moduleById(id)
  if (!mod) {
    navigate('/')
    return null
  }
  // Every module gets the gear — Settings is a platform tab, not a module chore.
  const tabs = [...(mod.tabs ?? []), SETTINGS_TAB]
  const active = tabs.some((t) => t.id === tab) ? (tab as string) : tabs[0].id
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
      {active === 'settings' ? <ModuleSettingsScreen mod={mod} /> : <mod.Screen tab={active} />}
      <ModuleTabBar moduleId={mod.id} tabs={tabs} active={active} />
      <ModuleIntro mod={mod} />
    </div>
  )
}

function ModuleIntro({ mod }: { mod: NonNullable<ReturnType<typeof moduleById>> }) {
  useStore(introStore)
  if (!mod.intro || !shouldShowIntro(mod.id)) return null
  return (
    <Sheet open title={`Welcome to ${mod.name}`} onClose={() => markIntroSeen(mod.id)}>
      {mod.intro.body.map((p, i) => (
        <p className="guide-p" key={i}>{p}</p>
      ))}
      {mod.intro.disclaimer && <p className="rs-foot intro-disclaimer">{mod.intro.disclaimer}</p>}
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 14 }}
        onClick={() => markIntroSeen(mod.id)}
      >
        Start
      </button>
    </Sheet>
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
        <div className="view" key={route.name === 'module' ? 'm-' + route.id + '-' + (route.tab ?? '') : route.name}>
        {route.name === 'today' && <Today />}
        {route.name === 'modules' && <Modules />}
        {route.name === 'settings' && <Settings />}
        {route.name === 'one' && <One />}
        {route.name === 'profile' && <Profile />}
        {route.name === 'module' && (
          <ModuleScreen id={route.id} tab={route.tab} key={route.id} />
        )}
        </div>
      </main>
      {!(route.name === 'module' && moduleById(route.id)?.tabs) && <TabBar route={route} />}
      <ToastHost />
    </>
  )
}

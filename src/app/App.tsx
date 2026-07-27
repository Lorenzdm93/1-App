import { Suspense, useEffect, useState } from 'react'
import { lazyRetry } from '../core/lazyload'
import type { CSSProperties } from 'react'
import { useRoute, navigate } from '../core/router'
import { moduleById } from '../core/registry'
import { useStore } from '../core/hooks'
import { settingsStore } from '../core/settings'
import { useTheme } from './theme'
import Today from '../screens/Today'
import RespiroDock from '../modules/respiro/Dock'

/* Today is the home screen and stays in the main chunk; everything else
   arrives on first visit. */
const Modules = lazyRetry(() => import('../screens/Modules'))
const Settings = lazyRetry(() => import('../screens/Settings'))
const One = lazyRetry(() => import('../screens/One'))
const Profile = lazyRetry(() => import('../screens/Profile'))
const Onboarding = lazyRetry(() => import('../screens/Onboarding'))
import TabBar from './TabBar'
import ModuleTabBar from './ModuleTabBar'
import ModuleSettingsScreen from './ModuleSettingsScreen'
import ErrorBoundary from './ErrorBoundary'
import { ToastHost, Sheet } from './ui'
import { introStore, shouldShowIntro, markIntroSeen } from '../core/intro'
import { send as sendNotify } from '../core/notify'

function ScreenLoader() {
  return (
    <div className="screen-loader" role="status" aria-label="Loading">
      <span className="ring" />
    </div>
  )
}

/** "Update ready" — the person picks the moment; the app never reloads under
    their thumbs. */
function UpdateToast() {
  const [worker, setWorker] = useState<ServiceWorker | null>(null)
  useEffect(() => {
    const onReady = (e: Event) => {
      const w = (e as CustomEvent<ServiceWorker>).detail
      /* The notification is a bonus channel; the pill ALWAYS shows. Making
         the pill a mere fallback (v0.22.0) meant a missed notification left
         people stranded on an old shell whose chunk names the server no
         longer hosts — the "only GHISA works" incident. */
      sendNotify('system', '1% update ready', 'Tap to restart into the new version', () => {
        w.postMessage({ type: 'SKIP_WAITING' })
      })
      setWorker(w)
    }
    window.addEventListener('sw-update-ready', onReady)
    return () => window.removeEventListener('sw-update-ready', onReady)
  }, [])
  if (!worker) return null
  return (
    <div className="update-pill" role="status">
      <span>Update ready</span>
      <button
        onClick={() => {
          worker.postMessage({ type: 'SKIP_WAITING' })
          setWorker(null)
        }}
      >
        Restart
      </button>
    </div>
  )
}

function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7.5h9 M17.5 7.5H20 M4 16.5h2.5 M11 16.5h9 M17.3 7.5a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0Z M10.9 16.5a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0Z" />
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
  // Sheets portal to <body>, escaping .mod-scope — mirror the accent onto :root
  // so module dialogs (and their primary buttons) keep the module's color.
  useEffect(() => {
    if (!mod) return
    document.documentElement.style.setProperty('--accent', mod.accentVar)
    return () => document.documentElement.style.removeProperty('--accent')
  }, [mod])
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
      <ErrorBoundary name={mod.name} key={mod.id + ':' + active}>
        <Suspense fallback={<ScreenLoader />}>
          {active === 'settings' ? <ModuleSettingsScreen mod={mod} /> : <mod.Screen tab={active} />}
        </Suspense>
      </ErrorBoundary>
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
      <main className="frame" id="main">
        <Suspense fallback={<ScreenLoader />}>
          <Onboarding />
        </Suspense>
        <ToastHost />
      </main>
    )
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="edge-fade top" aria-hidden="true" />
      <div className="edge-fade bottom" aria-hidden="true" />
      <main className="frame" id="main" tabIndex={-1}>
        <div className="view" key={route.name === 'module' ? 'm-' + route.id + '-' + (route.tab ?? '') : route.name}>
        <Suspense fallback={<ScreenLoader />}>
        {route.name === 'today' && <Today />}
        {route.name === 'modules' && <Modules />}
        {route.name === 'settings' && <Settings />}
        {route.name === 'one' && <One />}
        {route.name === 'profile' && <Profile />}
        {route.name === 'module' && (
          <ModuleScreen id={route.id} tab={route.tab} key={route.id} />
        )}
        </Suspense>
        </div>
      </main>
      {!(route.name === 'module' && moduleById(route.id)?.tabs) && <TabBar route={route} />}
      <RespiroDock />
      <UpdateToast />
      <ToastHost />
    </>
  )
}

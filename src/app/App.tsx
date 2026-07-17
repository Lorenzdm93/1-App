import { useRoute, navigate } from '../core/router'
import { moduleById } from '../core/registry'
import Today from '../screens/Today'
import Modules from '../screens/Modules'
import Settings from '../screens/Settings'
import TabBar from './TabBar'
import { ToastHost } from './ui'

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ModuleScreen({ id }: { id: string }) {
  const mod = moduleById(id)
  if (!mod) {
    navigate('/')
    return null
  }
  return (
    <>
      <div className="mod-head">
        <button className="back" onClick={() => navigate('/')} aria-label="Back to Today">
          <BackIcon />
        </button>
        <span className="mod-mark">
          <mod.Icon size={22} />
        </span>
        <div className="titles">
          <div className="name" style={{ color: mod.accentVar }}>
            {mod.name}
          </div>
          <div className="sub">{mod.tagline}</div>
        </div>
      </div>
      <mod.Screen />
    </>
  )
}

export default function App() {
  const route = useRoute()
  return (
    <>
      <main className="frame">
        {route.name === 'today' && <Today />}
        {route.name === 'modules' && <Modules />}
        {route.name === 'settings' && <Settings />}
        {route.name === 'module' && <ModuleScreen id={route.id} key={route.id} />}
      </main>
      <TabBar route={route} />
      <ToastHost />
    </>
  )
}

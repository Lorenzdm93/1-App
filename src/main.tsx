import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './design/tokens.css'
import './design/app.css'
import App from './app/App'
import { toast } from './core/toast'

/* ---------- global safety nets: never a silent white screen ---------- */
let errToastAt = 0
function reportError(msg: string): void {
  const now = Date.now()
  if (now - errToastAt > 8000) {
    errToastAt = now
    try { toast(msg) } catch { /* toast itself unavailable — nothing to do */ }
  }
}
window.addEventListener('error', (e) => {
  console.error('[1%]', e.error ?? e.message)
  reportError('Something went wrong — your data is safe')
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[1%]', e.reason)
  reportError('Something went wrong — your data is safe')
})

/* ---------- connectivity: quiet, honest, once ---------- */
window.addEventListener('offline', () => toast('Offline — everything still works'))
window.addEventListener('online', () => toast('Back online'))

/* ---------- service worker with person-controlled updates ---------- */
if ('serviceWorker' in navigator && !location.hostname.startsWith('localhost-dev')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((reg) => {
        const announce = (worker: ServiceWorker) => {
          window.dispatchEvent(new CustomEvent('sw-update-ready', { detail: worker }))
        }
        if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting)
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing
          if (!nw) return
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) announce(nw)
          })
        })
        /* check for a new version whenever the app returns to the foreground */
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => undefined)
        })
      })
      .catch(() => undefined)
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      location.reload()
    })
  })
}

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

/**
 * Self-healing dynamic imports.
 *
 * THE FAILURE THIS KILLS
 * Every deploy renames every hashed chunk. If the running shell is one
 * generation old — a service worker still waiting, a cached index served
 * during a flaky moment — its lazy imports point at chunk names the server
 * no longer hosts. Result: whole modules 404 while anything cache-warm still
 * works, which is exactly the "only GHISA works" incident.
 *
 * THE CURE
 * On the FIRST failed chunk import: drop every cache, tell a waiting service
 * worker to take over, and reload once — the fresh shell then references
 * chunks that exist. A sessionStorage latch makes a SECOND failure in the
 * same session fall through to the module's error card instead of looping,
 * which is the honest behaviour when someone is genuinely offline on a cold
 * cache.
 */
import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

const LATCH = 'op:chunk-reload'

export function clearChunkReloadLatch(): void {
  try { sessionStorage.removeItem(LATCH) } catch { /* private mode */ }
}

async function healAndReload(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch { /* best effort */ }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    reg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
  } catch { /* best effort */ }
  location.reload()
}

export function lazyRetry<T extends ComponentType<never> | ComponentType<{ tab?: string }> | ComponentType<object>>(
  loader: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    loader().catch(async (err) => {
      let latched = false
      try { latched = sessionStorage.getItem(LATCH) === '1' } catch { /* private mode */ }
      if (latched) throw err
      try { sessionStorage.setItem(LATCH, '1') } catch { /* private mode */ }
      await healAndReload()
      /* the reload owns the page from here; never resolve */
      return new Promise<{ default: T }>(() => undefined)
    }),
  )
}

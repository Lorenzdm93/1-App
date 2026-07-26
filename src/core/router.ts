/**
 * Hash router with hierarchical back. Hash routing is a deliberate choice for
 * GitHub Pages (deep links and refreshes just work); the back gesture is
 * remapped to STRUCTURE instead of history: module tab → module root →
 * Today, and every top-level screen → Today. No more unwinding five hops of
 * tab-flipping to escape a module.
 */
import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'today' }
  | { name: 'modules' }
  | { name: 'settings' }
  | { name: 'one' }
  | { name: 'profile' }
  | { name: 'module'; id: string; tab?: string }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  if (path === 'modules') return { name: 'modules' }
  if (path === 'settings') return { name: 'settings' }
  if (path === 'one') return { name: 'one' }
  if (path === 'profile') return { name: 'profile' }
  const m = path.match(/^m\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/)
  if (m) return m[2] ? { name: 'module', id: m[1], tab: m[2] } : { name: 'module', id: m[1] }
  return { name: 'today' }
}

/** The structural parent of a route — null only at the root (Today). */
export function parentOf(r: Route): string | null {
  if (r.name === 'module') return r.tab ? '/m/' + r.id : '/'
  if (r.name === 'modules') return '/settings'
  if (r.name === 'today') return null
  return '/'
}

let internalNav = false

export function navigate(path: string): void {
  internalNav = true
  location.hash = path
}

/* Normalize the entry hash so the app always has a real route under it —
   a back-swipe from Home must never land on a blank pre-app history entry. */
if (typeof location !== 'undefined' && (!location.hash || location.hash === '#')) {
  try { history.replaceState(null, '', '#/') } catch { location.hash = '#/' }
}

let current: Route = typeof location !== 'undefined' ? parseHash(location.hash) : { name: 'today' }
const listeners = new Set<() => void>()
const emit = (): void => { for (const l of listeners) l() }

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (!location.hash || location.hash === '#') {
      /* swiped back past the app's first entry — pin to Home, replacing */
      try { history.replaceState(null, '', '#/') } catch { location.hash = '#/' }
      internalNav = false
      current = { name: 'today' }
      emit()
      return
    }
    if (internalNav) {
      internalNav = false
      current = parseHash(location.hash)
      emit()
      return
    }
    /* Browser back/forward gesture: send the person to the structural parent
       of where they WERE, not wherever history happens to point. */
    const target = parentOf(current)
    if (target === null) {
      current = parseHash(location.hash)
      emit()
      return
    }
    current = parseHash('#' + target)
    internalNav = true
    location.hash = target
    emit()
  })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getRoute(): Route {
  return current
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute, getRoute)
}

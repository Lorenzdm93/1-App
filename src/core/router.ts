/**
 * Hash router. Hash routing is a deliberate choice for GitHub Pages:
 * deep links and refreshes just work, with no 404.html rewrite hacks.
 */
import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'today' }
  | { name: 'modules' }
  | { name: 'settings' }
  | { name: 'module'; id: string; tab?: string }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  if (path === 'modules') return { name: 'modules' }
  if (path === 'settings') return { name: 'settings' }
  const m = path.match(/^m\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/)
  if (m) return m[2] ? { name: 'module', id: m[1], tab: m[2] } : { name: 'module', id: m[1] }
  return { name: 'today' }
}

export function navigate(path: string): void {
  location.hash = path
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

function getHash(): string {
  return location.hash
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, getHash)
  return parseHash(hash)
}

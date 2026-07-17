/**
 * A ~30-line external store. Deliberately framework-free:
 * React binds to it through `useStore` in hooks.ts, tests and future
 * non-React shells (Capacitor background tasks, sync workers) use it directly.
 */
import { loadNS, saveNS, type Migrate } from './storage'

export interface Store<T> {
  get(): T
  set(next: T | ((prev: T) => T)): void
  subscribe(listener: () => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** A store that hydrates from its namespace on creation and persists every set(). */
export function createPersistedStore<T>(
  ns: string,
  fallback: T,
  version = 1,
  migrate?: Migrate<T>,
): Store<T> {
  const inner = createStore<T>(loadNS(ns, fallback, version, migrate))
  return {
    get: inner.get,
    subscribe: inner.subscribe,
    set(next) {
      inner.set(next)
      saveNS(ns, inner.get(), version)
    },
  }
}

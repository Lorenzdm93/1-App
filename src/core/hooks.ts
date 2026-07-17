import { useSyncExternalStore } from 'react'
import type { Store } from './store'

/** Subscribe a component to a store. Re-renders on every set(). */
export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

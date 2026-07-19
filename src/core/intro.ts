/** First-visit intro sheets — one welcome per module, shown once. */
import { createPersistedStore } from './store'

export const introStore = createPersistedStore<{ seen: string[] }>('core.intro', { seen: [] }, 1)

export function markIntroSeen(moduleId: string): void {
  introStore.set((s) => (s.seen.includes(moduleId) ? s : { seen: [...s.seen, moduleId] }))
}

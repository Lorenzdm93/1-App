/** First-visit intro sheets — shown on first entry, and again after a long absence. */
import { createPersistedStore } from './store'

const RESHOW_MS = 90 * 24 * 3600_000

interface IntroState {
  seen: Record<string, number>
}

function migrate(data: unknown, from: number): IntroState {
  if (from === 1 && data && typeof data === 'object' && Array.isArray((data as { seen?: unknown }).seen)) {
    const seen: Record<string, number> = {}
    for (const id of (data as { seen: string[] }).seen) seen[id] = Date.now()
    return { seen }
  }
  return { seen: {} }
}

export const introStore = createPersistedStore<IntroState>('core.intro', { seen: {} }, 2, migrate)

export function shouldShowIntro(moduleId: string, now = Date.now()): boolean {
  const ts = introStore.get().seen[moduleId]
  return ts === undefined || now - ts > RESHOW_MS
}

export function markIntroSeen(moduleId: string): void {
  introStore.set((s) => ({ seen: { ...s.seen, [moduleId]: Date.now() } }))
}

/**
 * Orchestration. Ties digest → gate → provider → cache together and decides
 * WHEN to run:
 *
 *   local provider  — regenerates whenever the data meaningfully changes (free).
 *   LLM providers   — weekly, or on manual refresh, or when you switch provider
 *                     (high signal, low cost — the whole economic point).
 *
 * If the gate finds nothing meaningful, an empty result is cached for the week
 * and no provider (or LLM) runs at all. If an LLM provider returns nothing —
 * failure or a genuinely empty read — we fall back to the local heuristics so
 * the user always sees the value.
 */
import { createStore } from '../store'
import { createPersistedStore } from '../store'
import { buildDigest, digestFingerprint } from './digest'
import { detectSignals, hasMeaningfulSignal } from './signals'
import { localProvider } from './local'
import { cloudProvider, ownKeyProvider } from './cloud'
import { insightsConfigStore, activeProviderRunnable } from './config'
import type { Insight, InsightProvider } from './types'

interface InsightCache {
  weekStart: string
  fingerprint: string
  providerId: string
  generatedAt: number
  insights: Insight[]
}

const EMPTY: InsightCache = { weekStart: '', fingerprint: '', providerId: 'local', generatedAt: 0, insights: [] }

export const insightsCacheStore = createPersistedStore<InsightCache>('insights.cache', EMPTY, 1)
export const insightsStatusStore = createStore<{ generating: boolean }>({ generating: false })

const providers: Record<string, InsightProvider> = {
  local: localProvider,
  cloud: cloudProvider,
  ownkey: ownKeyProvider,
}

function shouldRegenerate(cache: InsightCache, weekStart: string, fp: string, providerId: string): boolean {
  if (cache.weekStart !== weekStart) return true
  if (cache.providerId !== providerId) return true
  /* local is free, so keep it live as the week's numbers move; LLMs stay weekly */
  if (providerId === 'local' && cache.fingerprint !== fp) return true
  return false
}

let running = false

export async function ensureInsights(force = false): Promise<void> {
  const cfg = insightsConfigStore.get()
  if (!cfg.enabled || running) return

  const digest = buildDigest()
  const fp = digestFingerprint(digest)
  const cache = insightsCacheStore.get()
  if (!force && !shouldRegenerate(cache, digest.weekStart, fp, cfg.providerId)) return

  const signals = detectSignals(digest)

  /* the gate: nothing worth saying → cache silence for the week, no call */
  if (!hasMeaningfulSignal(signals)) {
    insightsCacheStore.set(() => ({
      weekStart: digest.weekStart,
      fingerprint: fp,
      providerId: cfg.providerId,
      generatedAt: Date.now(),
      insights: [],
    }))
    return
  }

  running = true
  insightsStatusStore.set(() => ({ generating: true }))
  try {
    const provider = providers[cfg.providerId] ?? localProvider
    let insights: Insight[]
    if (provider.id !== 'local' && !activeProviderRunnable(cfg)) {
      insights = await localProvider.generate(digest, signals)
    } else {
      insights = await provider.generate(digest, signals)
      if (insights.length === 0 && provider.id !== 'local') {
        insights = await localProvider.generate(digest, signals)
      }
    }
    insightsCacheStore.set(() => ({
      weekStart: digest.weekStart,
      fingerprint: fp,
      providerId: cfg.providerId,
      generatedAt: Date.now(),
      insights,
    }))
  } finally {
    running = false
    insightsStatusStore.set(() => ({ generating: false }))
  }
}

export function regenerateInsights(): Promise<void> {
  return ensureInsights(true)
}

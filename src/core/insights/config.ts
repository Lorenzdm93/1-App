/**
 * AI-layer configuration, self-contained (like notify.ts) so nothing in the
 * core settings migration has to know about it.
 *
 * Providers:
 *   local   — on-device heuristics. Default. No network, no key, €0.
 *   cloud   — posts the numeric digest to YOUR serverless endpoint, which
 *             holds the API key. Dormant until a URL is set. (worker/insights.js)
 *   ownkey  — advanced: the user pastes their own Anthropic/OpenAI key, stored
 *             ONLY on this device and deliberately excluded from backups.
 *
 * The API key never lives in the exported/synced config — it sits in its own
 * un-prefixed localStorage entry, so it can't ride along in a backup file.
 */
import { createPersistedStore } from '../store'

export type ProviderId = 'local' | 'cloud' | 'ownkey'
export type OwnKeyVendor = 'anthropic' | 'openai'

export interface InsightsConfig {
  enabled: boolean
  providerId: ProviderId
  /** Your deployed Worker URL for the cloud provider. */
  cloudUrl: string | null
  ownKeyVendor: OwnKeyVendor
}

const DEFAULTS: InsightsConfig = {
  enabled: true,
  providerId: 'local',
  cloudUrl: null,
  ownKeyVendor: 'anthropic',
}

export const insightsConfigStore = createPersistedStore<InsightsConfig>('insights.config', DEFAULTS, 1)

export function setInsightsEnabled(on: boolean): void {
  insightsConfigStore.set((s) => ({ ...s, enabled: on }))
}
export function setProviderId(id: ProviderId): void {
  insightsConfigStore.set((s) => ({ ...s, providerId: id }))
}
export function setCloudUrl(url: string | null): void {
  insightsConfigStore.set((s) => ({ ...s, cloudUrl: url && url.trim() ? url.trim() : null }))
}
export function setOwnKeyVendor(v: OwnKeyVendor): void {
  insightsConfigStore.set((s) => ({ ...s, ownKeyVendor: v }))
}

/* ---- the secret: separate key, never exported ---- */
const KEY_SLOT = 'op:ai:secret'
const secretMem = { v: null as string | null }

export function getOwnKey(): string | null {
  if (secretMem.v !== null) return secretMem.v
  try {
    return localStorage.getItem(KEY_SLOT)
  } catch {
    return null
  }
}
export function setOwnKey(key: string | null): void {
  secretMem.v = key && key.trim() ? key.trim() : null
  try {
    if (secretMem.v) localStorage.setItem(KEY_SLOT, secretMem.v)
    else localStorage.removeItem(KEY_SLOT)
  } catch {
    /* memory copy holds it for the session */
  }
}
export function hasOwnKey(): boolean {
  return getOwnKey() !== null
}

/** Would the currently-selected provider actually be able to run? */
export function activeProviderRunnable(c: InsightsConfig): boolean {
  if (!c.enabled) return false
  if (c.providerId === 'cloud') return c.cloudUrl !== null
  if (c.providerId === 'ownkey') return hasOwnKey()
  return true // local always runs
}

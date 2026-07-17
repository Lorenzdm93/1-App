import { createPersistedStore } from '../../core/store'
import { logEvent } from '../../core/events'
import type { CustomPattern } from './protocols'

export interface RespiroState {
  protocolId: string
  /** Set by a quick action on Today: the screen starts a session on mount. */
  autostart: boolean
  custom: CustomPattern
  spotifyUrl: string
  bestHold: number
  lastHold: number
}

const DEFAULTS: RespiroState = {
  protocolId: 'box',
  autostart: false,
  custom: { inS: 4, hold1: 4, outS: 4, hold2: 4 },
  spotifyUrl: '',
  bestHold: 0,
  lastHold: 0,
}

/** v1 had only protocol + autostart. */
export function migrateRespiro(data: unknown, fromVersion: number): RespiroState {
  if (fromVersion === 1 && data !== null && typeof data === 'object') {
    const d = data as Partial<RespiroState>
    return {
      ...DEFAULTS,
      protocolId: typeof d.protocolId === 'string' ? d.protocolId : 'box',
    }
  }
  return DEFAULTS
}

export const respiroStore = createPersistedStore<RespiroState>('respiro', DEFAULTS, 2, migrateRespiro)

/* ---------- spotify ---------- */

export interface SpotifyRef {
  type: 'track' | 'playlist' | 'album' | 'episode' | 'show'
  id: string
}

export function parseSpotify(url: string): SpotifyRef | null {
  const m = url
    .trim()
    .match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist|album|episode|show)\/([A-Za-z0-9]+)/)
  if (!m) return null
  return { type: m[1] as SpotifyRef['type'], id: m[2] }
}

export function spotifyEmbedUrl(ref: SpotifyRef): string {
  return `https://open.spotify.com/embed/${ref.type}/${ref.id}`
}

export function setSpotify(url: string): boolean {
  if (url.trim() === '') {
    respiroStore.set((s) => ({ ...s, spotifyUrl: '' }))
    return true
  }
  if (parseSpotify(url) === null) return false
  respiroStore.set((s) => ({ ...s, spotifyUrl: url.trim() }))
  return true
}

/* ---------- custom pattern ---------- */

export function setCustom(patch: Partial<CustomPattern>): void {
  respiroStore.set((s) => ({ ...s, custom: { ...s.custom, ...patch } }))
}

/* ---------- breath hold ---------- */

export function recordHold(seconds: number): { isBest: boolean } {
  const s = Math.round(seconds)
  const prevBest = respiroStore.get().bestHold
  const isBest = s > prevBest
  respiroStore.set((st) => ({ ...st, lastHold: s, bestHold: Math.max(st.bestHold, s) }))
  if (s >= 10) logEvent({ module: 'respiro', kind: 'hold', value: s, unit: 's' })
  return { isBest }
}

export function selectProtocol(id: string): void {
  respiroStore.set((s) => ({ ...s, protocolId: id }))
}

export function requestAutostart(id: string): void {
  respiroStore.set((s) => ({ ...s, protocolId: id, autostart: true }))
}

export function consumeAutostart(): boolean {
  const wants = respiroStore.get().autostart
  if (wants) respiroStore.set((s) => ({ ...s, autostart: false }))
  return wants
}

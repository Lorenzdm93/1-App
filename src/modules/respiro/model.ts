import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
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
  /** Sound settings — a soft tick at each phase change. */
  cues: boolean
  /** A low bell when a session ends. */
  bell: boolean
  /** Soft synthesized drone that swells with the breath during sessions. */
  ambient: boolean
  /** Saved sound links — Spotify embeds and full-length YouTube. */
  soundLibrary: SoundItem[]
}

export interface SoundItem {
  id: string
  kind: 'spotify' | 'youtube'
  url: string
  name: string
}

const DEFAULTS: RespiroState = {
  protocolId: 'box',
  autostart: false,
  custom: { inS: 4, hold1: 4, outS: 4, hold2: 4 },
  spotifyUrl: '',
  bestHold: 0,
  lastHold: 0,
  cues: true,
  bell: true,
  ambient: true,
  soundLibrary: [],
}

/** v1: protocol + autostart only. v2: no sound settings. */
export function migrateRespiro(data: unknown, fromVersion: number): RespiroState {
  if ((fromVersion === 1 || fromVersion === 2) && data !== null && typeof data === 'object') {
    const d = data as Partial<RespiroState>
    return {
      ...DEFAULTS,
      protocolId: typeof d.protocolId === 'string' ? d.protocolId : 'box',
      custom: d.custom && typeof d.custom === 'object' ? d.custom : DEFAULTS.custom,
      spotifyUrl: typeof d.spotifyUrl === 'string' ? d.spotifyUrl : '',
      bestHold: typeof d.bestHold === 'number' ? d.bestHold : 0,
      lastHold: typeof d.lastHold === 'number' ? d.lastHold : 0,
      /* v4: a previously-pinned single Spotify link seeds the new library. */
      soundLibrary:
        typeof d.spotifyUrl === 'string' && d.spotifyUrl
          ? [{ id: uid(), kind: 'spotify', url: d.spotifyUrl, name: 'Saved from Spotify' }]
          : [],
    }
  }
  if (fromVersion === 3 && data !== null && typeof data === 'object') {
    const d = data as Partial<RespiroState>
    return {
      ...DEFAULTS,
      ...d,
      ambient: typeof d.ambient === 'boolean' ? d.ambient : true,
      soundLibrary: Array.isArray(d.soundLibrary)
        ? d.soundLibrary
        : typeof d.spotifyUrl === 'string' && d.spotifyUrl
          ? [{ id: uid(), kind: 'spotify', url: d.spotifyUrl, name: 'Saved from Spotify' }]
          : [],
    }
  }
  return DEFAULTS
}

export const respiroStore = createPersistedStore<RespiroState>('respiro', DEFAULTS, 4, migrateRespiro)

export function setSound(patch: Partial<Pick<RespiroState, 'cues' | 'bell'>>): void {
  respiroStore.set((s) => ({ ...s, ...patch }))
}

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

/* ---------------- v4: sound library (Spotify + full-length YouTube) ---------------- */

export interface YouTubeRef { videoId: string }

/** watch?v=, youtu.be/, shorts/, embed/ and m.youtube forms. */
export function parseYouTube(url: string): YouTubeRef | null {
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\.|^m\./, '')
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0]
      return id ? { videoId: id } : null
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v')
      if (v) return { videoId: v }
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/)
      if (m) return { videoId: m[1] }
    }
    return null
  } catch {
    return null
  }
}

/** Full-length playback, no login, no keys — the whole song plays. */
export function youtubeEmbedUrl(ref: YouTubeRef): string {
  return `https://www.youtube-nocookie.com/embed/${ref.videoId}?autoplay=1&playsinline=1`
}

/** Accepts a Spotify or YouTube link; names it; returns the item or null if unparseable. */
export function addSoundItem(url: string, name: string): SoundItem | null {
  const yt = parseYouTube(url)
  const sp = yt ? null : parseSpotify(url)
  if (!yt && !sp) return null
  const item: SoundItem = {
    id: uid(),
    kind: yt ? 'youtube' : 'spotify',
    url: url.trim(),
    name: name.trim() || (yt ? 'YouTube audio' : 'Spotify audio'),
  }
  respiroStore.set((s) => ({ ...s, soundLibrary: [...s.soundLibrary, item] }))
  return item
}

export function removeSoundItem(id: string): void {
  respiroStore.set((s) => ({ ...s, soundLibrary: s.soundLibrary.filter((x) => x.id !== id) }))
}

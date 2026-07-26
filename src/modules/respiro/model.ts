import { createPersistedStore } from '../../core/store'
import { uid } from '../../core/id'
import { eventsStore } from '../../core/events'
import { resetLedger } from '../../core/one'
import { mulberry32 } from '../../core/rng'
import { dayKey, shiftDay, weekStartKey } from '../../core/dates'
import { logEvent } from '../../core/events'
import type { CustomPattern } from './protocols'

export interface RespiroState {
  protocolId: string
  /** Set by a quick action on Today: the screen starts a session on mount. */
  autostart: boolean
  custom: CustomPattern
  spotifyUrl: string
  dock: SoundItem | null
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

/** The docked player — store-backed so it survives tab switches (screens
    remount per tab by design) and greets you again on module re-entry. */
export function setDock(item: SoundItem | null): void {
  respiroStore.set((s) => ({ ...s, dock: item }))
}

const DEFAULTS: RespiroState = {
  protocolId: 'box',
  autostart: false,
  custom: { inS: 4, hold1: 4, outS: 4, hold2: 4 },
  spotifyUrl: '',
  dock: null,
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
      dock: (d as { dock?: SoundItem | null }).dock ?? null,
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

/* ---------------- pre-launch sample data (tagged '-demo') ---------------- */

export function hasDemo(): boolean {
  return eventsStore.get().some((e) => e.module === 'respiro' && e.id.endsWith('-demo'))
}

/** Twelve sessions over two weeks — box, coherent, one long marea. Events only; your settings are untouched. */
export function seedDemo(now = Date.now()): void {
  removeDemo()
  const DAY = 86_400_000
  const rng = mulberry32(0x7357)
  const cw = weekStartKey(dayKey(now))
  const fortnightFrom = shiftDay(cw, -14)
  const fresh: { id: string; module: string; kind: string; ts: number; value: number; unit: string }[] = []
  /* Twelve months of practice: ~4 sessions/week early, near-daily lately,
     vacation gaps — and every day of the two most recent closed weeks carries
     ≥10 minutes, so the linked CADENCE habit ticks on truth. */
  for (let day = 1; day <= 335; day++) {
    const d = shiftDay(dayKey(now), -day)
    const vacation = (day >= 148 && day <= 156) || (day >= 272 && day <= 278)
    const inFortnight = d >= fortnightFrom && d < cw
    let sessions = 0
    if (inFortnight) sessions = 1
    else if (!vacation) {
      const recency = day < 60 ? 0.62 : day < 180 ? 0.55 : 0.45
      if (rng() < recency) sessions = 1
      if (rng() < 0.08) sessions += 1
    }
    for (let k = 0; k < sessions; k++) {
      const minutes = inFortnight ? 10 + Math.floor(rng() * 7) : 5 + Math.floor(rng() * 14)
      const hour = k === 0 ? 7 + Math.floor(rng() * 3) : 21
      const ts = new Date(d + 'T00:00:00').getTime() + hour * 3_600_000 + Math.floor(rng() * 50) * 60_000
      if (ts > now) continue
      fresh.push({ id: uid() + '-demo', module: 'respiro', kind: 'session', ts, value: minutes, unit: 'min' })
    }
  }
  /* Growth guarantee for the crown weeks: week −1 clears week −2 by ≥2%. */
  const sum = (from: string, to: string) =>
    fresh.reduce((a, e) => { const dd = dayKey(e.ts); return dd >= from && dd < to ? a + e.value : a }, 0)
  const wk1 = sum(shiftDay(cw, -7), cw)
  const wk2 = sum(fortnightFrom, shiftDay(cw, -7))
  const need = Math.ceil(wk2 * 1.02) + 1
  if (wk1 < need) {
    const boost = fresh.filter((e) => { const dd = dayKey(e.ts); return dd >= shiftDay(cw, -7) && dd < cw })
      .sort((a, b) => b.value - a.value)[0]
    if (boost) boost.value += need - wk1
  }
  eventsStore.set((evs) => [...fresh, ...evs].sort((a, b) => b.ts - a.ts))
  resetLedger()
}

export function removeDemo(): void {
  eventsStore.set((evs) => evs.filter((e) => !(e.module === 'respiro' && e.id.endsWith('-demo'))))
  resetLedger()
}

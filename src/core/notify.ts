/**
 * Notifications, centralized. One master switch, one toggle per module, and a
 * single choke point every module routes through — so Settings is the one
 * place that decides who may speak.
 *
 * TWO BACKENDS, ONE API
 * - Web (browser tab / installed PWA): the Notification API. It can only
 *   speak while the page is alive, and on iOS only once installed to the
 *   Home Screen (16.4+).
 * - Native (Capacitor): LocalNotifications. These can be SCHEDULED ahead, so
 *   a focus session or a fasting stage alerts even with the app closed —
 *   something the web API cannot do at all.
 *
 * The plugin is reached through the runtime `Capacitor.Plugins` global rather
 * than an import, deliberately: adding @capacitor/local-notifications to
 * package.json would break the GitHub Pages build, which runs `npm ci`
 * against the committed lockfile. Zero build dependencies; the native project
 * installs it with `npm i @capacitor/local-notifications && npx cap sync ios`
 * (see CAPACITOR.md). On the web the global is simply absent and every native
 * path no-ops.
 */
import { createPersistedStore } from './store'
import { isNative } from './native'

interface NotifyState {
  enabled: boolean
  /** Per-module opt-outs; missing key = allowed. */
  mods: Record<string, boolean>
  /** Native permission, cached so the status check can stay synchronous. */
  nativePerm?: 'granted' | 'denied' | 'default'
}

export const notifyStore = createPersistedStore<NotifyState>('core.notify', { enabled: false, mods: {} }, 1, (d) => {
  if (d !== null && typeof d === 'object' && 'enabled' in (d as object)) return d as NotifyState
  return { enabled: false, mods: {} }
})

export type NotifyStatus = 'unsupported' | 'default' | 'granted' | 'denied'

interface LocalNotificationsPlugin {
  checkPermissions: () => Promise<{ display: string }>
  requestPermissions: () => Promise<{ display: string }>
  schedule: (opts: { notifications: Record<string, unknown>[] }) => Promise<unknown>
  cancel: (opts: { notifications: { id: number }[] }) => Promise<unknown>
}

function plugin(): LocalNotificationsPlugin | null {
  if (typeof window === 'undefined') return null
  const cap = (window as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor
  const ln = cap?.Plugins?.LocalNotifications
  return ln ? (ln as unknown as LocalNotificationsPlugin) : null
}

/** Stable positive 31-bit id from a key — the native plugin wants integers. */
function nid(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 1) % 2000000000
}

function normalizePerm(v: string): 'granted' | 'denied' | 'default' {
  return v === 'granted' ? 'granted' : v === 'denied' ? 'denied' : 'default'
}

export function notifyStatus(): NotifyStatus {
  if (isNative()) {
    if (!plugin()) return 'unsupported'
    return notifyStore.get().nativePerm ?? 'default'
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as NotifyStatus
}

/** Re-read the native permission (it can change in iOS Settings). */
export async function refreshNativePermission(): Promise<void> {
  const ln = plugin()
  if (!ln) return
  try {
    const r = await ln.checkPermissions()
    notifyStore.set((s) => ({ ...s, nativePerm: normalizePerm(r.display) }))
  } catch {
    /* plugin not installed in this build */
  }
}

/** Master enable: asks once, remembers the intent. */
export async function enableNotifications(): Promise<NotifyStatus> {
  const ln = plugin()
  if (isNative() && ln) {
    try {
      const r = await ln.requestPermissions()
      const perm = normalizePerm(r.display)
      notifyStore.set((s) => ({ ...s, nativePerm: perm, enabled: perm === 'granted' }))
      return perm
    } catch {
      return 'unsupported'
    }
  }
  if (typeof Notification === 'undefined') return 'unsupported'
  let perm = Notification.permission
  if (perm === 'default') {
    try { perm = await Notification.requestPermission() } catch { /* dismissed */ }
  }
  notifyStore.set((s) => ({ ...s, enabled: perm === 'granted' }))
  return perm as NotifyStatus
}

export function disableNotifications(): void {
  notifyStore.set((s) => ({ ...s, enabled: false }))
  cancelAll()
}

export function setModuleNotify(id: string, on: boolean): void {
  notifyStore.set((s) => ({ ...s, mods: { ...s.mods, [id]: on } }))
  if (!on) cancelModule(id)
}

export function moduleNotifyOn(id: string): boolean {
  const st = notifyStore.get()
  return st.enabled && st.mods[id] !== false && notifyStatus() === 'granted'
}

/** True when alerts can survive the app being closed. */
export function canScheduleAhead(): boolean {
  return isNative() && plugin() !== null
}

/** Speak now. Returns whether anything fired. */
export function send(moduleId: string, title: string, body: string, onClick?: () => void): boolean {
  if (!moduleNotifyOn(moduleId)) return false
  const ln = plugin()
  if (isNative() && ln) {
    void ln
      .schedule({
        notifications: [
          {
            id: nid('now:' + moduleId + ':' + title),
            title,
            body,
            schedule: { at: new Date(Date.now() + 250) },
          },
        ],
      })
      .catch(() => undefined)
    return true
  }
  try {
    const n = new Notification(title, { body, silent: true, tag: '1p-' + moduleId })
    if (onClick) {
      n.onclick = () => {
        try { window.focus() } catch { /* best effort */ }
        onClick()
        n.close()
      }
    }
    return true
  } catch {
    return false
  }
}

/* ---------------------------------------------------------------
   Scheduled alerts. Keys are deterministic strings ("grove:end",
   "ora:stage:3") so anything scheduled can be cancelled later
   without persisting a registry.
   --------------------------------------------------------------- */

/** Schedule one alert for a future moment. No-op on the web. */
export function scheduleAt(moduleId: string, key: string, title: string, body: string, at: number): boolean {
  const ln = plugin()
  if (!ln || !isNative() || !moduleNotifyOn(moduleId)) return false
  if (at <= Date.now() + 1000) return false
  void ln
    .schedule({
      notifications: [{ id: nid(key), title, body, schedule: { at: new Date(at) } }],
    })
    .catch(() => undefined)
  return true
}

export function cancelKeys(keys: string[]): void {
  const ln = plugin()
  if (!ln || keys.length === 0) return
  void ln.cancel({ notifications: keys.map((k) => ({ id: nid(k) })) }).catch(() => undefined)
}

/** Every key a module can own. Kept here so cancellation is total. */
const MODULE_KEYS: Record<string, string[]> = {
  grove: ['grove:end'],
  ora: ['ora:target', ...Array.from({ length: 12 }, (_, i) => `ora:stage:${i}`)],
}

export function cancelModule(id: string): void {
  cancelKeys(MODULE_KEYS[id] ?? [])
}

export function cancelAll(): void {
  cancelKeys(Object.values(MODULE_KEYS).flat())
}

/* Native permission can be changed in iOS Settings while the app sleeps —
   re-read it on load and whenever the app returns to the foreground. */
if (typeof window !== 'undefined' && isNative()) {
  void refreshNativePermission()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshNativePermission()
  })
}

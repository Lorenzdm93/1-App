/**
 * Notifications, centralized. One master switch, one toggle per module, and a
 * single `send()` every module routes through — so Settings is the one place
 * that decides who may speak.
 *
 * Honest scope: these are Web Notifications from a living page (open tab or
 * installed PWA in the foreground/background). True push with the app fully
 * closed needs the Firebase backend and ships with cloud sync. On iOS,
 * notifications require the app to be installed to the Home Screen (16.4+).
 */
import { createPersistedStore } from './store'

interface NotifyState {
  enabled: boolean
  /** Per-module opt-outs; missing key = allowed. */
  mods: Record<string, boolean>
}

export const notifyStore = createPersistedStore<NotifyState>('core.notify', { enabled: false, mods: {} }, 1, (d) => {
  if (d !== null && typeof d === 'object' && 'enabled' in (d as object)) return d as NotifyState
  return { enabled: false, mods: {} }
})

export type NotifyStatus = 'unsupported' | 'default' | 'granted' | 'denied'

export function notifyStatus(): NotifyStatus {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission as NotifyStatus
}

/** Master enable: asks the browser once, remembers the intent. */
export async function enableNotifications(): Promise<NotifyStatus> {
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
}

export function setModuleNotify(id: string, on: boolean): void {
  notifyStore.set((s) => ({ ...s, mods: { ...s.mods, [id]: on } }))
}

export function moduleNotifyOn(id: string): boolean {
  const st = notifyStore.get()
  return st.enabled && st.mods[id] !== false && notifyStatus() === 'granted'
}

/** Route every module notification through here. Returns whether it fired. */
export function send(moduleId: string, title: string, body: string, onClick?: () => void): boolean {
  if (!moduleNotifyOn(moduleId)) return false
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

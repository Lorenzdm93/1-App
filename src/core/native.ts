/**
 * The native shell, reached through the runtime `Capacitor.Plugins` global —
 * never an import, because adding these packages to package.json would break
 * the GitHub Pages build (`npm ci` against the committed lockfile). On the web
 * every function here is a no-op.
 *
 * Native install (see CAPACITOR.md):
 *   npm i @capacitor/splash-screen @capacitor/status-bar
 */

export function isNative(): boolean {
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return typeof cap?.isNativePlatform === 'function' ? cap.isNativePlatform() : false
}

function plugin<T>(name: string): T | null {
  if (typeof window === 'undefined') return null
  const cap = (window as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor
  const p = cap?.Plugins?.[name]
  return p ? (p as T) : null
}

interface StatusBarPlugin {
  setStyle: (o: { style: string }) => Promise<void>
  setBackgroundColor: (o: { color: string }) => Promise<void>
  setOverlaysWebView: (o: { overlay: boolean }) => Promise<void>
}
interface SplashPlugin {
  hide: (o?: { fadeOutDuration?: number }) => Promise<void>
}

/**
 * Keep the native status bar legible against whichever theme is showing.
 * Capacitor's 'DARK' means light glyphs for a dark background, and vice versa.
 */
export function syncNativeStatusBar(mode: 'dark' | 'light'): void {
  const sb = plugin<StatusBarPlugin>('StatusBar')
  if (!sb) return
  void sb.setStyle({ style: mode === 'dark' ? 'DARK' : 'LIGHT' }).catch(() => undefined)
  /* Android draws behind the bar only when told to; harmless on iOS. */
  void sb.setBackgroundColor({ color: mode === 'dark' ? '#0b0c0f' : '#f3f1ea' }).catch(() => undefined)
}

/**
 * Called once the shell has painted: dismiss the native splash with a short
 * fade so the handoff to the app is seamless rather than a white blink. The
 * splash is configured not to auto-hide, so this is what ends it — if the app
 * somehow failed to boot, the splash staying up is the honest signal.
 */
export function initNative(): void {
  if (!isNative()) return
  const splash = plugin<SplashPlugin>('SplashScreen')
  if (splash) {
    /* two frames: let the first real paint land before the curtain lifts */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void splash.hide({ fadeOutDuration: 220 }).catch(() => undefined)
      })
    })
  }
}

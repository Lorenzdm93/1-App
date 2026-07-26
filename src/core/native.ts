/** Capacitor detection — lets the same bundle behave natively when wrapped. */
export function isNative(): boolean {
  return typeof (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform === 'function'
    ? (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform()
    : false
}

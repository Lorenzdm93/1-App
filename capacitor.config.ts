import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor wraps the SAME `dist/` the web deploy uses — one codebase, two
 * targets. GitHub Pages keeps serving the PWA untouched; `npx cap sync ios`
 * copies dist into the native shell. See CAPACITOR.md for the full path from
 * zero to App Store.
 */
const config: CapacitorConfig = {
  appId: 'app.onepercent.mobile',
  appName: '1%',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0c0d10',
  },
}

export default config

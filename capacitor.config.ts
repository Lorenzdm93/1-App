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
  plugins: {
    /* Show timer and fasting alerts even while the app is in the foreground —
       iOS suppresses them by default. */
    LocalNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    /* The splash never auto-hides: src/core/native.ts dismisses it once the
       shell has actually painted, so there is no white blink between the two
       and a failed boot stays visibly on the splash instead of a blank page. */
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0b0c0f',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b0c0f',
      overlaysWebView: false,
    },
  },
}

export default config

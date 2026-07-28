# 1% → App Store: the complete path

You know the web side; this is everything else, in order. Total cost: **$99/year**
(Apple Developer Program) + a Mac with Xcode.

## 1. What Capacitor is (30 seconds)
Capacitor puts your **exact web build** (`dist/`) inside a native iOS shell — a
WKWebView plus a bridge to native APIs (haptics, push, HealthKit, StoreKit).
One codebase, two targets. **GitHub Pages keeps working untouched**: the web
deploy and the App Store build are the same `vite build`, just delivered
differently. Your hash router, service-worker-free native mode, safe areas —
all already handled in code.

## 2. Accounts (do these first — review takes days)
- **Apple ID for the product** (see the "dedicated account" note in chat) →
  enroll at developer.apple.com ($99/yr, can take 24–48h to approve).
- App Store Connect access appears automatically once enrolled.

## 3. Local setup (on your Mac)
```bash
xcode-select --install          # command-line tools
# install Xcode from the App Store (big download), open once, accept license
cd 1-App-main
npm install
npm i -D @capacitor/core @capacitor/cli @capacitor/ios
npm i @capacitor/local-notifications   # timer + fasting alerts while closed
npm i @capacitor/splash-screen @capacitor/status-bar
npm i -D @capacitor/assets
npm run build                   # produces dist/
npx cap add ios                 # creates ios/ native project (commit it)
npx cap sync ios                # copies dist/ into the shell
npx cap open ios                # opens Xcode
```
`capacitor.config.ts` is already in the repo (appId `app.onepercent.mobile` —
change it if you register a different bundle id).

## 4. In Xcode (one-time)
- Signing & Capabilities → Team: select your developer account; Xcode manages
  certificates automatically.
- App Icons and launch screen: run `npx @capacitor/assets generate --ios` from
  the repo root. It reads `assets/icon.png` (1024²) and `assets/splash.png` +
  `assets/splash-dark.png` (2732², light and dark) — all four are committed —
  and writes every iOS size into the native project. No manual dragging.
- The splash is configured NOT to auto-hide: `src/core/native.ts` dismisses it
  with a short fade once the shell has actually painted, so there is no white
  blink, and a failed boot stays visibly on the splash instead of a blank page.
- Display name: 1%. Deployment target: iOS 16+ is a sane floor.
- Run on your own iPhone via cable first (free, no review).

## 5. TestFlight (your beta channel)
Product → Archive → Distribute → App Store Connect → Upload. In App Store
Connect → TestFlight, add yourself + friends by email. Builds are live in
minutes; external testers need one lightweight review (~1 day).

## 6. Submission (what review actually checks)
- **Guideline 4.2 (minimum functionality)**: thin website wrappers get
  rejected. 1% is a real offline app with native-feel UX — you're fine, but
  say so in the review notes: "fully offline, local-first, no account
  required."
- Privacy: App Store Connect asks for a privacy label. Truthfully: no data
  collected (until cloud sync ships — then "Data linked to you: user content,
  optional").
- You'll need: screenshots (6.7" and 5.5" sets — take them in the Simulator),
  a description, keywords, a support URL (the GitHub Pages site works), and a
  privacy policy URL (one static page; required even for no-collection apps).
- First review: typically 24–72h. Rejections come with exact reasons; fix and
  resubmit — everyone gets one eventually, it's normal.

## 7. Firebase + the native shell (when you activate sync)
Add `capacitor://localhost` to Firebase Auth → Authorized domains, and prefer
`signInWithRedirect` fallback if popup misbehaves in the WKWebView (the
scaffold uses popup, which works in most modern setups).

## 8. Each release after that
```bash
npm run build && npx cap sync ios && npx cap open ios   # Archive → Upload
```
Web users get it instantly via Pages; App Store users after review. Keep
versions aligned (`package.json` version → Xcode marketing version).

## Native niceties worth adding later (one plugin each)
Haptics (`@capacitor/haptics`) for set-ticks and week-won; Push
(`@capacitor/push-notifications`) for the Sunday ritual; StoreKit
(`@revenuecat/purchases-capacitor`) when sync becomes the paid tier;
HealthKit via community plugin for body metrics.

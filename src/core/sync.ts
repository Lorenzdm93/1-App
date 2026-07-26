/**
 * Cloud backup — Firebase scaffold, dormant until configured.
 *
 * DESIGN
 * - Zero build-time dependencies: the Firebase SDK loads at runtime from
 *   Google's CDN via dynamic ESM import, only when the person taps Connect.
 *   GitHub Pages' `npm ci` never learns Firebase exists.
 * - Data model: one document per user — users/{uid}/backup/latest holding the
 *   exact same JSON payload as the local Export file. Restore = import + reload.
 *   Last write wins; the local file remains the always-works path.
 *
 * TO ACTIVATE (5 minutes, see also the walkthrough in CAPACITOR.md §7):
 * 1. console.firebase.google.com → Add project (use the dedicated account).
 * 2. Build → Authentication → Sign-in method → enable Google.
 * 3. Build → Firestore Database → create (production mode), then Rules:
 *      rules_version = '2';
 *      service cloud.firestore {
 *        match /databases/{database}/documents {
 *          match /users/{uid}/{document=**} {
 *            allow read, write: if request.auth != null && request.auth.uid == uid;
 *          }
 *        }
 *      }
 * 4. Project settings → Your apps → Web app → copy the config object.
 * 5. Paste it below as FIREBASE_CONFIG and add your Pages origin (and
 *    capacitor://localhost for the iOS wrap) to Auth → Authorized domains.
 */
import { createStore } from './store'
import { exportAll, importAll } from './storage'

export const FIREBASE_CONFIG: Record<string, string> | null = null
// Example shape:
// export const FIREBASE_CONFIG = {
//   apiKey: '…', authDomain: '…', projectId: '…',
//   storageBucket: '…', messagingSenderId: '…', appId: '…',
// }

const FB_VER = '10.14.1'
const cdn = (m: string) => `https://www.gstatic.com/firebasejs/${FB_VER}/${m}`

export interface SyncState {
  status: 'unconfigured' | 'idle' | 'loading' | 'signedin' | 'working'
  email: string | null
  lastBackupTs: number | null
  error: string | null
}

export const syncStore = createStore<SyncState>({
  status: FIREBASE_CONFIG ? 'idle' : 'unconfigured',
  email: null,
  lastBackupTs: null,
  error: null,
})

type FirebaseBits = {
  auth: unknown
  db: unknown
  fns: Record<string, (...a: unknown[]) => unknown>
}
let bits: FirebaseBits | null = null

async function load(): Promise<FirebaseBits> {
  if (bits) return bits
  if (!FIREBASE_CONFIG) throw new Error('Firebase not configured')
  const [appM, authM, fsM] = await Promise.all([
    import(/* @vite-ignore */ cdn('firebase-app.js')),
    import(/* @vite-ignore */ cdn('firebase-auth.js')),
    import(/* @vite-ignore */ cdn('firebase-firestore.js')),
  ])
  const app = appM.initializeApp(FIREBASE_CONFIG)
  const auth = authM.getAuth(app)
  const db = fsM.getFirestore(app)
  bits = {
    auth,
    db,
    fns: {
      signInWithPopup: authM.signInWithPopup,
      GoogleAuthProvider: authM.GoogleAuthProvider,
      signOut: authM.signOut,
      onAuthStateChanged: authM.onAuthStateChanged,
      doc: fsM.doc,
      setDoc: fsM.setDoc,
      getDoc: fsM.getDoc,
    },
  }
  const on = bits.fns.onAuthStateChanged as (a: unknown, cb: (u: { email?: string } | null) => void) => void
  on(auth, (u) => {
    syncStore.set((s) => ({
      ...s,
      status: u ? 'signedin' : 'idle',
      email: u?.email ?? null,
    }))
  })
  return bits
}

export async function connect(): Promise<void> {
  syncStore.set((s) => ({ ...s, status: 'loading', error: null }))
  try {
    const b = await load()
    const Provider = b.fns.GoogleAuthProvider as new () => unknown
    await (b.fns.signInWithPopup as (a: unknown, p: unknown) => Promise<unknown>)(b.auth, new Provider())
  } catch (e) {
    syncStore.set((s) => ({ ...s, status: FIREBASE_CONFIG ? 'idle' : 'unconfigured', error: String((e as Error)?.message ?? e) }))
  }
}

export async function disconnect(): Promise<void> {
  if (!bits) return
  await (bits.fns.signOut as (a: unknown) => Promise<void>)(bits.auth)
}

function uid(): string | null {
  const a = bits?.auth as { currentUser?: { uid?: string } } | undefined
  return a?.currentUser?.uid ?? null
}

export async function backupNow(): Promise<void> {
  const b = await load()
  const id = uid()
  if (!id) throw new Error('Not signed in')
  syncStore.set((s) => ({ ...s, status: 'working' }))
  try {
    const ref = (b.fns.doc as (...a: unknown[]) => unknown)(b.db, 'users', id, 'backup', 'latest')
    await (b.fns.setDoc as (r: unknown, d: unknown) => Promise<void>)(ref, { ts: Date.now(), payload: exportAll() })
    syncStore.set((s) => ({ ...s, status: 'signedin', lastBackupTs: Date.now() }))
  } catch (e) {
    syncStore.set((s) => ({ ...s, status: 'signedin', error: String((e as Error)?.message ?? e) }))
    throw e
  }
}

export async function restoreLatest(): Promise<boolean> {
  const b = await load()
  const id = uid()
  if (!id) throw new Error('Not signed in')
  const ref = (b.fns.doc as (...a: unknown[]) => unknown)(b.db, 'users', id, 'backup', 'latest')
  const snap = (await (b.fns.getDoc as (r: unknown) => Promise<{ exists: () => boolean; data: () => { payload?: string } }>)(ref))
  if (!snap.exists() || !snap.data().payload) return false
  importAll(snap.data().payload as string)
  location.reload()
  return true
}

/**
 * Lightweight i18n for a retrofit. Strings are keyed by their English source, so
 * wrapping a string is just `t('Today')` and any untranslated string falls back
 * to English automatically — no key invention, no broken UI while translation
 * rolls out screen by screen.
 *
 * Reactivity: App subscribes to localeStore and includes the language in the
 * view key, so switching language remounts the current screen and every t()
 * re-evaluates. Component state is fine to lose on switch — real state lives in
 * persisted stores.
 *
 * Phase 1 covers the app chrome (navigation, titles, section headers, buttons,
 * Settings, quick-log, the This-week header) and locale-aware dates/numbers.
 * Long-form coaching/insight prose and deep module screens follow, and read as
 * English until then.
 */
import { createPersistedStore } from './store'

export type Locale = 'en' | 'de' | 'it' | 'es'

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'it', label: 'Italiano' },
  { id: 'es', label: 'Español' },
]

export const localeStore = createPersistedStore<{ lang: Locale }>('i18n', { lang: 'en' }, 1)

export function setLocale(lang: Locale): void {
  localeStore.set(() => ({ lang }))
}

const TAG: Record<Locale, string> = { en: 'en-US', de: 'de-DE', it: 'it-IT', es: 'es-ES' }

/** BCP-47 tag for Intl date/number formatting in the current language. */
export function localeTag(): string {
  return TAG[localeStore.get().lang]
}

/** Number in the current locale (decimal comma for de/it/es). */
export function fmtNum(n: number): string {
  return n.toLocaleString(localeTag())
}

type Dict = Record<string, string>

/* ---- German ---- */
const DE: Dict = {
  // nav + common
  Today: 'Heute', Profile: 'Profil', Settings: 'Einstellungen',
  'this week': 'diese Woche', 'This week': 'Diese Woche',
  Restart: 'Neu starten', 'Update ready': 'Update bereit',
  Start: "Los geht's", Cancel: 'Abbrechen', Remove: 'Entfernen', Save: 'Speichern',
  'Skip to content': 'Zum Inhalt springen', Loading: 'Lädt',
  'Back to Today': 'Zurück zu Heute',
  // Today + quick log
  'Log what you did…': 'Notiere, was du getan hast …',
  'Quick log': 'Schnell-Log', Read: 'Lesen',
  'e.g. squat 5x5 100kg, meditated 10 min': 'z. B. Kniebeuge 5x5 100kg, 10 Min meditiert',
  "Couldn't read that. Try “25 min focus”, “squat 5x5 100kg”, or the name of a habit or supplement you track.":
    'Konnte das nicht lesen. Versuche „25 Min Fokus", „Kniebeuge 5x5 100kg" oder den Namen einer Gewohnheit oder eines Supplements.',
  'Tap a card to include or skip it. Nothing is saved until you log.':
    'Tippe eine Karte an, um sie ein- oder auszuschließen. Nichts wird gespeichert, bis du loggst.',
  'Log one entry': 'Einen Eintrag speichern', 'Log {n} entries': '{n} Einträge speichern',
  // insight type labels + This week
  'Worth your attention': 'Der Blick wert', Opportunity: 'Chance', Watch: 'Achtung',
  'On a run': 'Im Lauf', Trend: 'Trend', Pattern: 'Muster', Goal: 'Ziel',
  Refresh: 'Aktualisieren',
  // Settings sections
  Appearance: 'Erscheinungsbild', Backup: 'Sicherung', Notifications: 'Benachrichtigungen',
  Display: 'Anzeige', Insights: 'Einsichten', 'Sample data': 'Beispieldaten',
  'Danger zone': 'Gefahrenzone', Language: 'Sprache',
  // Settings — insights controls
  'AI insights': 'KI-Einsichten', 'On-device': 'Auf dem Gerät', Cloud: 'Cloud', 'My key': 'Eigener Schlüssel',
  'Save URL': 'URL speichern', 'Save key': 'Schlüssel speichern',
  'Notices trends, regressions and your biggest weekly opportunity — read from your own data.':
    'Erkennt Trends, Rückschritte und deine größte Chance der Woche — aus deinen eigenen Daten.',
  // Profile
  'The long game': 'Das lange Spiel', 'Your week, read back': 'Deine Woche, vorgelesen',
  'The ledger': 'Das Hauptbuch', 'Modules over time': 'Module im Zeitverlauf',
  'This week vs last': 'Diese Woche vs. letzte', 'Per module — all time': 'Pro Modul — gesamt',
  'weeks won': 'Wochen gewonnen', compounded: 'kumuliert', 'best week': 'beste Woche',
}

/* ---- Italian ---- */
const IT: Dict = {
  Today: 'Oggi', Profile: 'Profilo', Settings: 'Impostazioni',
  'this week': 'questa settimana', 'This week': 'Questa settimana',
  Restart: 'Riavvia', 'Update ready': 'Aggiornamento pronto',
  Start: 'Inizia', Cancel: 'Annulla', Remove: 'Rimuovi', Save: 'Salva',
  'Skip to content': 'Vai al contenuto', Loading: 'Caricamento',
  'Back to Today': 'Torna a Oggi',
  'Log what you did…': 'Registra cosa hai fatto…',
  'Quick log': 'Log rapido', Read: 'Leggi',
  'e.g. squat 5x5 100kg, meditated 10 min': 'es. squat 5x5 100kg, meditato 10 min',
  "Couldn't read that. Try “25 min focus”, “squat 5x5 100kg”, or the name of a habit or supplement you track.":
    'Non ho capito. Prova “25 min focus", “squat 5x5 100kg", o il nome di un\'abitudine o integratore che segui.',
  'Tap a card to include or skip it. Nothing is saved until you log.':
    'Tocca una scheda per includerla o saltarla. Niente viene salvato finché non registri.',
  'Log one entry': 'Registra una voce', 'Log {n} entries': 'Registra {n} voci',
  'Worth your attention': 'Da tenere d\'occhio', Opportunity: 'Opportunità', Watch: 'Attenzione',
  'On a run': 'In crescita', Trend: 'Andamento', Pattern: 'Schema', Goal: 'Obiettivo',
  Refresh: 'Aggiorna',
  Appearance: 'Aspetto', Backup: 'Backup', Notifications: 'Notifiche',
  Display: 'Visualizzazione', Insights: 'Insight', 'Sample data': 'Dati di esempio',
  'Danger zone': 'Zona pericolosa', Language: 'Lingua',
  'AI insights': 'Insight AI', 'On-device': 'Sul dispositivo', Cloud: 'Cloud', 'My key': 'Chiave personale',
  'Save URL': 'Salva URL', 'Save key': 'Salva chiave',
  'Notices trends, regressions and your biggest weekly opportunity — read from your own data.':
    'Nota andamenti, cali e la tua opportunità più grande della settimana — dai tuoi stessi dati.',
  'The long game': 'Il gioco lungo', 'Your week, read back': 'La tua settimana, riletta',
  'The ledger': 'Il registro', 'Modules over time': 'Moduli nel tempo',
  'This week vs last': 'Questa settimana vs scorsa', 'Per module — all time': 'Per modulo — sempre',
  'weeks won': 'settimane vinte', compounded: 'composto', 'best week': 'settimana migliore',
}

/* ---- Spanish ---- */
const ES: Dict = {
  Today: 'Hoy', Profile: 'Perfil', Settings: 'Ajustes',
  'this week': 'esta semana', 'This week': 'Esta semana',
  Restart: 'Reiniciar', 'Update ready': 'Actualización lista',
  Start: 'Empezar', Cancel: 'Cancelar', Remove: 'Quitar', Save: 'Guardar',
  'Skip to content': 'Saltar al contenido', Loading: 'Cargando',
  'Back to Today': 'Volver a Hoy',
  'Log what you did…': 'Registra lo que hiciste…',
  'Quick log': 'Registro rápido', Read: 'Leer',
  'e.g. squat 5x5 100kg, meditated 10 min': 'ej. sentadilla 5x5 100kg, medité 10 min',
  "Couldn't read that. Try “25 min focus”, “squat 5x5 100kg”, or the name of a habit or supplement you track.":
    'No pude leer eso. Prueba “25 min de foco", “sentadilla 5x5 100kg", o el nombre de un hábito o suplemento que sigas.',
  'Tap a card to include or skip it. Nothing is saved until you log.':
    'Toca una tarjeta para incluirla u omitirla. Nada se guarda hasta que registres.',
  'Log one entry': 'Registrar una entrada', 'Log {n} entries': 'Registrar {n} entradas',
  'Worth your attention': 'Merece tu atención', Opportunity: 'Oportunidad', Watch: 'Atención',
  'On a run': 'En racha', Trend: 'Tendencia', Pattern: 'Patrón', Goal: 'Meta',
  Refresh: 'Actualizar',
  Appearance: 'Apariencia', Backup: 'Copia de seguridad', Notifications: 'Notificaciones',
  Display: 'Visualización', Insights: 'Insights', 'Sample data': 'Datos de ejemplo',
  'Danger zone': 'Zona de peligro', Language: 'Idioma',
  'AI insights': 'Insights con IA', 'On-device': 'En el dispositivo', Cloud: 'Nube', 'My key': 'Mi clave',
  'Save URL': 'Guardar URL', 'Save key': 'Guardar clave',
  'Notices trends, regressions and your biggest weekly opportunity — read from your own data.':
    'Detecta tendencias, retrocesos y tu mayor oportunidad de la semana — a partir de tus propios datos.',
  'The long game': 'El juego largo', 'Your week, read back': 'Tu semana, releída',
  'The ledger': 'El registro', 'Modules over time': 'Módulos en el tiempo',
  'This week vs last': 'Esta semana vs anterior', 'Per module — all time': 'Por módulo — histórico',
  'weeks won': 'semanas ganadas', compounded: 'compuesto', 'best week': 'mejor semana',
}

const DICTS: Record<Locale, Dict> = { en: {}, de: DE, it: IT, es: ES }

/**
 * Translate an English source string to the current language. Unknown strings
 * return the English as-is. {placeholder} tokens are filled from params.
 */
export function t(en: string, params?: Record<string, string | number>): string {
  const lang = localeStore.get().lang
  let s = lang === 'en' ? en : DICTS[lang][en] ?? en
  if (params) {
    for (const k in params) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]))
  }
  return s
}

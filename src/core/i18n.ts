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



/* ---- content strings (Today card, coaching, insights, advice, narrative) ---- */
const DE2: Dict = {
  "Won. It’s in the ledger now — nothing can take it back, and it compounds.": "Gewonnen. Jetzt im Hauptbuch — nichts nimmt es zurück, und es verzinst sich.",
  "Your 1% starts with one log.": "Dein 1% beginnt mit einem Log.",
  "Finish anything — a set, a session, a habit tick — and this becomes your weekly score: beat your own recent pace by {r}% and the week is won. Tap to see how the engine works.": "Schließe irgendetwas ab — einen Satz, eine Session, ein Häkchen — und das wird dein Wochen-Score: schlage dein eigenes jüngstes Tempo um {r}% und die Woche ist gewonnen. Tippe, um zu sehen, wie die Engine arbeitet.",
  "Coaching": "Coaching",
  " You're {r}% past your own pace — the week is banked. Anything more is compound interest.": " Du bist {r}% über deinem Tempo — die Woche ist im Kasten. Alles Weitere ist Zinseszins.",
  " Week one — this week sets your pace. No bar to beat yet: everything you log writes its own starting line.": " Woche eins — diese Woche legt dein Tempo fest. Noch keine Marke zu schlagen: alles, was du loggst, schreibt seine eigene Startlinie.",
  " {left}% left to beat your 4-week pace by {r}%. The next moves below close it.": " Noch {left}%, um dein 4-Wochen-Tempo um {r}% zu schlagen. Die nächsten Schritte unten schließen die Lücke.",
  "{n}d streak": "{n} Tage Serie",
  "{n} weeks won": "{n} Wochen gewonnen",
  "one week won": "eine Woche gewonnen",
  "This week is banked — it holds on the ledger for good. The compounding above is the sum of every week you've won.": "Diese Woche ist im Kasten — sie bleibt für immer im Hauptbuch. Der Zinseszins oben ist die Summe jeder gewonnenen Woche.",
  "An honest miss. Nothing is taken from you — the ledger only ever adds, and this week’s bar still follows your own pace.": "Ein ehrliches Verfehlen. Dir wird nichts genommen — das Hauptbuch addiert nur, und die Marke dieser Woche folgt weiter deinem Tempo.",
  "Bank it": "Sichern",
  "On to this week": "Weiter zu dieser Woche",
  "Week closed": "Woche abgeschlossen",
  "Held at your {label} goal for {n} weeks — raise it in the engine if there's genuinely room, or enjoy the plateau. Holding a ceiling is winning.": "Seit {n} Wochen auf deinem {label}-Ziel gehalten — heb es in der Engine an, wenn wirklich Luft ist, oder genieß das Plateau. Eine Decke zu halten ist Gewinnen.",
  "Your biggest opportunity this week": "Deine größte Chance diese Woche",
  "Room in {name}": "Luft bei {name}",
  "{name} is slipping": "{name} lässt nach",
  "{name} is on a run": "{name} läuft",
  "{n} weeks won in a row": "{n} Wochen in Folge gewonnen",
  "Two areas are pulling apart": "Zwei Bereiche driften auseinander",
  "One focused {label} session this week closes most of the gap.": "Eine fokussierte {label}-Session diese Woche schließt die Lücke fast ganz.",
  "A single {label} session this week is usually enough to reverse it.": "Eine einzige {label}-Session diese Woche kehrt das meist um.",
  "Keep it going — even a short session holds the run.": "Bleib dran — schon eine kurze Session hält den Lauf.",
  "Keep the streak alive; no need to force a bigger week.": "Halte die Serie am Leben; du musst keine größere Woche erzwingen.",
  "A small {name} session this week rebalances the two.": "Eine kleine {name}-Session diese Woche bringt beide wieder ins Gleichgewicht.",
  "{n} kg of volume to go — one honest session usually covers it.": "Noch {n} kg Volumen — eine ehrliche Session reicht meist.",
  "{n} focus minutes to go — a {b}-minute session fits inside today.": "Noch {n} Fokus-Minuten — eine {b}-Minuten-Session passt heute rein.",
  "{n} breath minutes to go — one Coherent Breathing sitting clears it.": "Noch {n} Atem-Minuten — eine Coherent-Breathing-Sitzung schafft das.",
  "You're past your pace this week — it's banked.": "Du bist diese Woche über deinem Tempo — im Kasten.",
  "The week landed at {p}% of your own pace.": "Die Woche landete bei {p}% deines eigenen Tempos.",
  "Partway through the week, you're at {p}% of your pace.": "Mitten in der Woche bist du bei {p}% deines Tempos.",
  "{up} keeps climbing while {down} has drifted the other way — worth noticing, if not necessarily connected.": "{up} steigt weiter, während {down} in die andere Richtung driftet — bemerkenswert, wenn auch nicht zwangsläufig verbunden.",
  "{name} is the bright spot: {label} has been climbing for weeks.": "{name} ist der Lichtblick: {label} steigt seit Wochen.",
  "{name} has been sliding off its recent average.": "{name} rutscht unter seinen jüngsten Schnitt.",
  "If one thing deserves the effort, it's {name} — {behind}.": "Wenn eine Sache den Einsatz verdient, dann {name} — {behind}.",
  "down {p}% from last week": "{p}% weniger als letzte Woche",
  "the furthest from pace": "am weitesten vom Tempo entfernt",
  "{n} weeks won in a row now — compounding is +{c}%.": "Jetzt {n} Wochen in Folge gewonnen — Zinseszins ist +{c}%.",
  "{n} weeks banked so far, compounding +{c}%.": "Bisher {n} Wochen im Kasten, Zinseszins +{c}%.",
  "{n} week banked so far, compounding +{c}%.": "Bisher {n} Woche im Kasten, Zinseszins +{c}%.",
}

const IT2: Dict = {
  "Won. It’s in the ledger now — nothing can take it back, and it compounds.": "Vinta. Ora è nel registro — niente può riprendersela, e si compone.",
  "Your 1% starts with one log.": "Il tuo 1% inizia con un log.",
  "Finish anything — a set, a session, a habit tick — and this becomes your weekly score: beat your own recent pace by {r}% and the week is won. Tap to see how the engine works.": "Completa qualcosa — una serie, una sessione, la spunta di un'abitudine — e questo diventa il tuo punteggio settimanale: batti il tuo passo recente dell'{r}% e la settimana è vinta. Tocca per vedere come funziona il motore.",
  "Coaching": "Coaching",
  " You're {r}% past your own pace — the week is banked. Anything more is compound interest.": " Sei {r}% oltre il tuo passo — la settimana è in cassa. Tutto il resto è interesse composto.",
  " Week one — this week sets your pace. No bar to beat yet: everything you log writes its own starting line.": " Settimana uno — questa settimana fissa il tuo passo. Nessun record da battere ancora: ogni log scrive la propria linea di partenza.",
  " {left}% left to beat your 4-week pace by {r}%. The next moves below close it.": " Manca il {left}% per battere il tuo passo di 4 settimane dell'{r}%. Le prossime mosse qui sotto lo colmano.",
  "{n}d streak": "{n}g di fila",
  "{n} weeks won": "{n} settimane vinte",
  "one week won": "una settimana vinta",
  "This week is banked — it holds on the ledger for good. The compounding above is the sum of every week you've won.": "Questa settimana è in cassa — resta nel registro per sempre. Il composto qui sopra è la somma di ogni settimana che hai vinto.",
  "An honest miss. Nothing is taken from you — the ledger only ever adds, and this week’s bar still follows your own pace.": "Un mancato onesto. Non ti viene tolto niente — il registro aggiunge soltanto, e l'asticella di questa settimana segue comunque il tuo passo.",
  "Bank it": "Incassala",
  "On to this week": "Avanti con questa settimana",
  "Week closed": "Settimana chiusa",
  "Held at your {label} goal for {n} weeks — raise it in the engine if there's genuinely room, or enjoy the plateau. Holding a ceiling is winning.": "Fermo al tuo obiettivo di {label} da {n} settimane — alzalo nel motore se c'è davvero spazio, o goditi il plateau. Tenere un tetto è vincere.",
  "Your biggest opportunity this week": "La tua opportunità più grande della settimana",
  "Room in {name}": "Spazio in {name}",
  "{name} is slipping": "{name} sta calando",
  "{name} is on a run": "{name} è in crescita",
  "{n} weeks won in a row": "{n} settimane vinte di fila",
  "Two areas are pulling apart": "Due aree si stanno divaricando",
  "One focused {label} session this week closes most of the gap.": "Una sessione mirata di {label} questa settimana colma quasi tutto il divario.",
  "A single {label} session this week is usually enough to reverse it.": "Una sola sessione di {label} questa settimana di solito basta a invertirla.",
  "Keep it going — even a short session holds the run.": "Continua così — anche una sessione breve mantiene la crescita.",
  "Keep the streak alive; no need to force a bigger week.": "Tieni viva la serie; non serve forzare una settimana più grande.",
  "A small {name} session this week rebalances the two.": "Una piccola sessione di {name} questa settimana riequilibra le due.",
  "{n} kg of volume to go — one honest session usually covers it.": "{n} kg di volume da fare — una sessione onesta di solito basta.",
  "{n} focus minutes to go — a {b}-minute session fits inside today.": "{n} minuti di focus da fare — una sessione da {b} minuti ci sta oggi.",
  "{n} breath minutes to go — one Coherent Breathing sitting clears it.": "{n} minuti di respiro da fare — una seduta di Coherent Breathing li completa.",
  "You're past your pace this week — it's banked.": "Questa settimana sei oltre il tuo passo — in cassa.",
  "The week landed at {p}% of your own pace.": "La settimana si è chiusa al {p}% del tuo passo.",
  "Partway through the week, you're at {p}% of your pace.": "A metà settimana sei al {p}% del tuo passo.",
  "{up} keeps climbing while {down} has drifted the other way — worth noticing, if not necessarily connected.": "{up} continua a salire mentre {down} è andato dall'altra parte — da notare, anche se non per forza collegati.",
  "{name} is the bright spot: {label} has been climbing for weeks.": "{name} è la nota positiva: {label} sale da settimane.",
  "{name} has been sliding off its recent average.": "{name} sta scivolando sotto la sua media recente.",
  "If one thing deserves the effort, it's {name} — {behind}.": "Se una cosa merita l'impegno, è {name} — {behind}.",
  "down {p}% from last week": "{p}% in meno rispetto alla scorsa settimana",
  "the furthest from pace": "il più lontano dal passo",
  "{n} weeks won in a row now — compounding is +{c}%.": "Ora {n} settimane vinte di fila — il composto è +{c}%.",
  "{n} weeks banked so far, compounding +{c}%.": "Finora {n} settimane in cassa, composto +{c}%.",
  "{n} week banked so far, compounding +{c}%.": "Finora {n} settimana in cassa, composto +{c}%.",
}

const ES2: Dict = {
  "Won. It’s in the ledger now — nothing can take it back, and it compounds.": "Ganada. Ya está en el registro — nada puede quitarla, y se acumula.",
  "Your 1% starts with one log.": "Tu 1% empieza con un registro.",
  "Finish anything — a set, a session, a habit tick — and this becomes your weekly score: beat your own recent pace by {r}% and the week is won. Tap to see how the engine works.": "Completa cualquier cosa — una serie, una sesión, un hábito — y esto se vuelve tu puntuación semanal: supera tu propio ritmo reciente en un {r}% y ganas la semana. Toca para ver cómo funciona el motor.",
  "Coaching": "Coaching",
  " You're {r}% past your own pace — the week is banked. Anything more is compound interest.": " Vas {r}% por encima de tu ritmo — la semana está asegurada. Lo demás es interés compuesto.",
  " Week one — this week sets your pace. No bar to beat yet: everything you log writes its own starting line.": " Semana uno — esta semana marca tu ritmo. Aún no hay marca que superar: cada registro escribe su propia línea de salida.",
  " {left}% left to beat your 4-week pace by {r}%. The next moves below close it.": " Falta {left}% para superar tu ritmo de 4 semanas en un {r}%. Los próximos pasos de abajo lo cierran.",
  "{n}d streak": "racha de {n}d",
  "{n} weeks won": "{n} semanas ganadas",
  "one week won": "una semana ganada",
  "This week is banked — it holds on the ledger for good. The compounding above is the sum of every week you've won.": "Esta semana está asegurada — permanece en el registro para siempre. El interés compuesto de arriba es la suma de cada semana ganada.",
  "An honest miss. Nothing is taken from you — the ledger only ever adds, and this week’s bar still follows your own pace.": "Un fallo honesto. No se te quita nada — el registro solo suma, y la marca de esta semana sigue tu propio ritmo.",
  "Bank it": "Guardarla",
  "On to this week": "A por esta semana",
  "Week closed": "Semana cerrada",
  "Held at your {label} goal for {n} weeks — raise it in the engine if there's genuinely room, or enjoy the plateau. Holding a ceiling is winning.": "En tu meta de {label} durante {n} semanas — súbela en el motor si de verdad hay margen, o disfruta la meseta. Mantener un techo es ganar.",
  "Your biggest opportunity this week": "Tu mayor oportunidad esta semana",
  "Room in {name}": "Margen en {name}",
  "{name} is slipping": "{name} está bajando",
  "{name} is on a run": "{name} va en racha",
  "{n} weeks won in a row": "{n} semanas ganadas seguidas",
  "Two areas are pulling apart": "Dos áreas se están separando",
  "One focused {label} session this week closes most of the gap.": "Una sesión enfocada de {label} esta semana cierra casi todo el hueco.",
  "A single {label} session this week is usually enough to reverse it.": "Una sola sesión de {label} esta semana suele bastar para revertirlo.",
  "Keep it going — even a short session holds the run.": "Sigue así — incluso una sesión corta mantiene la racha.",
  "Keep the streak alive; no need to force a bigger week.": "Mantén la racha viva; no hace falta forzar una semana mayor.",
  "A small {name} session this week rebalances the two.": "Una pequeña sesión de {name} esta semana reequilibra las dos.",
  "{n} kg of volume to go — one honest session usually covers it.": "Faltan {n} kg de volumen — una sesión honesta suele bastar.",
  "{n} focus minutes to go — a {b}-minute session fits inside today.": "Faltan {n} minutos de foco — una sesión de {b} minutos cabe hoy.",
  "{n} breath minutes to go — one Coherent Breathing sitting clears it.": "Faltan {n} minutos de respiración — una sesión de Coherent Breathing lo completa.",
  "You're past your pace this week — it's banked.": "Esta semana vas por encima de tu ritmo — asegurada.",
  "The week landed at {p}% of your own pace.": "La semana terminó al {p}% de tu propio ritmo.",
  "Partway through the week, you're at {p}% of your pace.": "A mitad de semana vas al {p}% de tu ritmo.",
  "{up} keeps climbing while {down} has drifted the other way — worth noticing, if not necessarily connected.": "{up} sigue subiendo mientras {down} se fue al otro lado — digno de notar, aunque no necesariamente conectados.",
  "{name} is the bright spot: {label} has been climbing for weeks.": "{name} es el punto brillante: {label} lleva semanas subiendo.",
  "{name} has been sliding off its recent average.": "{name} viene bajando de su media reciente.",
  "If one thing deserves the effort, it's {name} — {behind}.": "Si algo merece el esfuerzo, es {name} — {behind}.",
  "down {p}% from last week": "{p}% menos que la semana pasada",
  "the furthest from pace": "lo más lejos del ritmo",
  "{n} weeks won in a row now — compounding is +{c}%.": "Ya {n} semanas ganadas seguidas — el compuesto es +{c}%.",
  "{n} weeks banked so far, compounding +{c}%.": "Hasta ahora {n} semanas aseguradas, compuesto +{c}%.",
  "{n} week banked so far, compounding +{c}%.": "Hasta ahora {n} semana asegurada, compuesto +{c}%.",
}

const DICTS: Record<Locale, Dict> = { en: {}, de: { ...DE, ...DE2 }, it: { ...IT, ...IT2 }, es: { ...ES, ...ES2 } }

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

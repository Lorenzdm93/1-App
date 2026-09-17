/**
 * Natural-language quick capture. Turns a line like
 *   "squat 5x5 100kg, meditated 10 min, took creatine"
 * into reviewable drafts the user confirms before anything is written.
 *
 * v1 covers the five modules with a safe, unambiguous write path:
 *   grove / respiro / ghisa — one event on the unified stream (logEvent)
 *   cadence / sana          — tick a habit / log a dose, matched by NAME against
 *                             what actually exists (never invents one)
 * (ORA's stateful fasting and CALIBER's structured tests come next.)
 *
 * Lives in the app layer, not core, because it writes into module stores —
 * the same dependency direction Today and Profile already use. The parser is a
 * deterministic on-device pass; an LLM parser rides the same seam later for
 * fuzzier phrasing, exactly like the insights layer.
 */
import { logEvent } from '../core/events'
import { todayKey } from '../core/dates'
import { moduleById } from '../core/registry'
import { settingsStore } from '../core/settings'
import { e1rm } from '../core/strength'
import { activeHabits, setCheck, cadenceStore } from '../modules/cadence/model'
import { sanaStore, takeDose } from '../modules/sana/model'
import { caliberStore, logTest } from '../modules/caliber/model'
import { runLLM } from '../core/insights/cloud'
import { insightsConfigStore, hasOwnKey } from '../core/insights/config'
import { uid } from '../core/id'

export type CaptureModule = 'grove' | 'respiro' | 'ghisa' | 'cadence' | 'sana' | 'caliber'

export interface CaptureDraft {
  id: string
  module: CaptureModule
  /** Concise line shown in the review chip, e.g. "25 min focus", "2,500 kg". */
  detail: string
  /** grove/respiro/ghisa: the numeric value to log. */
  value?: number
  /** cadence/sana: the resolved habit/compound id. */
  refId?: string
}

/* ---------------- parsing helpers ---------------- */

const GROVE_KW = /\b(focus|focused|focusing|deep\s*work|study|studied|studying|concentrat\w*|pomodoro|work\s*session)\b/i
const RESPIRO_KW = /\b(meditat\w*|breath\w*|breathe|breathing|breathwork|respiro|pranayama|coherent|box\s*breathing|wim\s*hof)\b/i
const GHISA_KW = /\b(gym|lift\w*|workout|work\s*out|train\w*|squat\w*|bench|deadlift\w*|press|rows?|curls?|pull[-\s]?ups?|push[-\s]?ups?|ohp)\b/i

function toMinutes(s: string): number | null {
  let min = 0
  let found = false
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i)
  if (h) { min += parseFloat(h[1].replace(',', '.')) * 60; found = true }
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:m|min|mins|minute|minutes)\b/i)
  if (m) { min += parseFloat(m[1].replace(',', '.')); found = true }
  return found ? Math.round(min) : null
}

/** sets×reps×weight → total volume, plus the components for e1RM. */
interface VolParse { volume: number; sets: number; reps: number; weight: number }
function toVolume(s: string): VolParse | null {
  const sr = s.match(/(\d+)\s*[x×]\s*(\d+)/i)
  if (!sr) {
    const vol = s.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
    if (vol && /\b(volume|total)\b/i.test(s)) {
      return { volume: Math.round(parseFloat(vol[1].replace(',', '.'))), sets: 0, reps: 0, weight: 0 }
    }
    return null
  }
  const sets = parseInt(sr[1], 10)
  const reps = parseInt(sr[2], 10)
  let w = 0
  const kg = s.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
  const at = s.match(/@\s*(\d+(?:[.,]\d+)?)/)
  if (kg) w = parseFloat(kg[1].replace(',', '.'))
  else if (at) w = parseFloat(at[1].replace(',', '.'))
  else {
    const nums = (s.match(/\d+(?:[.,]\d+)?/g) || []).filter((n) => n !== sr[1] && n !== sr[2])
    if (nums.length) w = parseFloat(nums[nums.length - 1].replace(',', '.'))
  }
  if (w <= 0) return null
  return { volume: Math.round(sets * reps * w), sets, reps, weight: w }
}

/** Common lifts → clean name + CALIBER lift id (null = volume-only, no strength lift). */
const LIFTS: { re: RegExp; id: string | null; name: string }[] = [
  { re: /\b(dead\s*lift\w*|deadlift\w*|dl)\b/i, id: 'deadlift', name: 'deadlift' },
  { re: /\b(back\s*squat\w*|front\s*squat\w*|squat\w*)\b/i, id: 'squat', name: 'squat' },
  { re: /\b(bench(\s*press)?\w*|bp)\b/i, id: 'bench', name: 'bench' },
  { re: /\b(pull[-\s]?ups?|chin[-\s]?ups?)\b/i, id: 'pullup', name: 'pull-up' },
  { re: /\b(overhead\s*press\w*|shoulder\s*press\w*|military\s*press\w*|ohp)\b/i, id: null, name: 'overhead press' },
  { re: /\b(barbell\s*row\w*|bent[-\s]?over\s*row\w*|rows?\b|rowing)\b/i, id: null, name: 'row' },
  { re: /\b(bicep\s*curl\w*|curls?\b|curling)\b/i, id: null, name: 'curl' },
  { re: /\b(leg\s*press\w*)\b/i, id: null, name: 'leg press' },
]
function detectLift(s: string): { id: string | null; name: string } | null {
  for (const l of LIFTS) if (l.re.test(s)) return { id: l.id, name: l.name }
  return null
}

/** Fallback exercise label when no known lift matched — strip numbers and filler. */
function cleanExercise(s: string): string {
  return s
    .replace(/\d+(?:[.,]\d+)?/g, '')
    .replace(/[x×@]/gi, '')
    .replace(/\b(kg|reps?|sets?|at|for|the|a|did|done|of|my)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Does the clause mention this vocabulary term as a whole word? */
function mentions(clause: string, term: string): boolean {
  if (term.trim().length < 3) return false
  return new RegExp('\\b' + escapeRe(term.trim()) + '\\b', 'i').test(clause)
}

function fmtKg(n: number): string {
  return n.toLocaleString()
}

/** Time-of-day for bulk supplement logging. */
function detectSlot(s: string): 'morning' | 'midday' | 'evening' | 'night' | null {
  if (/\bmorning\b/i.test(s)) return 'morning'
  if (/\b(midday|noon|lunch|afternoon)\b/i.test(s)) return 'midday'
  if (/\b(night|bedtime|before\s*bed)\b/i.test(s)) return 'night'
  if (/\bevening\b/i.test(s)) return 'evening'
  return null
}

function num(v: unknown): number {
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) return Number(v)
  return 0
}

/* ---------------- the local parser ---------------- */

export function localParse(text: string): CaptureDraft[] {
  const clauses = text
    .split(/\band\b|[,;\n]|\s\+\s|&/i)
    .map((c) => c.trim())
    .filter(Boolean)

  const habits = activeHabits(cadenceStore.get()).filter((h) => h.type === 'build')
  const compounds = sanaStore.get().compounds

  const out: CaptureDraft[] = []
  const seenSana = new Set<string>()
  const seenHabit = new Set<string>()

  for (const clause of clauses) {
    // 1 — GHISA volume (+ CALIBER strength for a known barbell lift)
    const vol = toVolume(clause)
    const lift = detectLift(clause)
    if (vol && (GHISA_KW.test(clause) || lift || /[x×]/i.test(clause))) {
      const name = lift?.name ?? cleanExercise(clause)
      out.push({ id: uid(), module: 'ghisa', value: vol.volume, detail: `${fmtKg(vol.volume)} kg${name ? ` · ${name}` : ''}` })
      if (lift?.id && vol.weight > 0 && vol.reps > 0 && caliberStore.get().lifts.includes(lift.id)) {
        const est = Math.round(e1rm(vol.weight, vol.reps))
        out.push({ id: uid(), module: 'caliber', refId: lift.id, value: est, detail: `${lift.name} · e1RM ~${est} kg` })
      }
      continue
    }
    // 2 — GROVE focus (keyword + duration)
    const mins = toMinutes(clause)
    if (mins && mins > 0 && GROVE_KW.test(clause)) {
      out.push({ id: uid(), module: 'grove', value: mins, detail: `${mins} min focus` })
      continue
    }
    // 3 — RESPIRO breathwork (keyword + duration)
    if (mins && mins > 0 && RESPIRO_KW.test(clause)) {
      out.push({ id: uid(), module: 'respiro', value: mins, detail: `${mins} min breathwork` })
      continue
    }
    // 4 — SANA: specific compounds by name, then a bulk "all/morning supplements"
    let matchedSana = false
    for (const c of compounds) {
      if (seenSana.has(c.id)) continue
      if (mentions(clause, c.name) || (c.chem && mentions(clause, c.chem))) {
        seenSana.add(c.id)
        out.push({ id: uid(), module: 'sana', refId: c.id, detail: `${c.name} — dose` })
        matchedSana = true
      }
    }
    if (matchedSana) continue
    if (/\b(supp(lement)?s?|vitamins?|pills?|stack)\b/i.test(clause)) {
      const slot = detectSlot(clause)
      const picks = slot ? compounds.filter((c) => c.slot === slot) : compounds
      let any = false
      for (const c of picks) {
        if (seenSana.has(c.id)) continue
        seenSana.add(c.id)
        out.push({ id: uid(), module: 'sana', refId: c.id, detail: `${c.name} — dose` })
        any = true
      }
      if (any) continue
    }
    // 5 — CADENCE: a named habit, then a bulk "all my tasks/habits"
    let matchedHabit = false
    for (const h of habits) {
      if (seenHabit.has(h.id)) continue
      if (mentions(clause, h.name)) {
        seenHabit.add(h.id)
        out.push({ id: uid(), module: 'cadence', refId: h.id, detail: `${h.name} — done today` })
        matchedHabit = true
        break
      }
    }
    if (matchedHabit) continue
    if (
      /\b(tasks?|habits?|routines?|to[-\s]?dos?|checklist)\b/i.test(clause) &&
      /\b(all|every|my|daily|completed?|did|done|finished|hit)\b/i.test(clause)
    ) {
      for (const h of habits) {
        if (seenHabit.has(h.id)) continue
        seenHabit.add(h.id)
        out.push({ id: uid(), module: 'cadence', refId: h.id, detail: `${h.name} — done today` })
      }
    }
  }
  const enabled = new Set(settingsStore.get().enabled)
  return out.filter((d) => enabled.has(d.module))
}

/* ---------------- LLM parser (own-key, optional) ---------------- */

function captureSystemPrompt(compoundNames: string[], habitNames: string[]): string {
  return `You convert a short activity log into structured entries for a personal-tracking app. Output ONLY a JSON array (no prose, no markdown fences).

Each entry is exactly one of:
{"module":"grove","minutes":N}            // focus / deep work
{"module":"respiro","minutes":N}           // meditation / breathwork
{"module":"ghisa","volume":N,"exercise":"name"}   // weight-training total volume = sets*reps*weight
{"module":"caliber","lift":"squat|bench|deadlift|pullup","e1rm":N}  // one strength top set; ONLY these four lifts
{"module":"sana","supplement":"<exact name>"}      // one entry per supplement taken
{"module":"cadence","habit":"<exact name>"}        // one entry per habit completed

Known supplements: ${compoundNames.join(', ') || '(none)'}.
Known habits: ${habitNames.join(', ') || '(none)'}.

Rules:
- Use ONLY numbers present in the text. NEVER invent reps, weights, minutes or volume.
- "all supplements" / "my supplements" -> one sana entry per known supplement. "morning supplements" -> only the morning ones if known, else all.
- "all my tasks" / "all habits" -> one cadence entry per known habit.
- For a barbell lift written as sets x reps x weight, output BOTH a ghisa entry (volume = sets*reps*weight, exercise = the lift name) AND, if the lift is squat/bench/deadlift/pullup, a caliber entry with e1rm = round(weight*(1+reps/30)).
- supplement and habit values MUST be exact names from the lists above; drop anything not listed.
- If you cannot determine concrete entries (missing numbers, vague), output [].`
}

export function coerceCapture(
  raw: string,
  compounds: { id: string; name: string }[],
  habits: { id: string; name: string }[],
): CaptureDraft[] {
  let arr: unknown
  try {
    arr = JSON.parse(raw.replace(/```json\s*|\s*```/g, '').trim())
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  const compByName = new Map(compounds.map((c) => [c.name.toLowerCase(), c]))
  const habitByName = new Map(habits.map((h) => [h.name.toLowerCase(), h]))
  const caliberLifts = new Set(caliberStore.get().lifts)
  const out: CaptureDraft[] = []
  for (const it of arr.slice(0, 20)) {
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    const m = o.module
    if (m === 'grove' && num(o.minutes) > 0) {
      const v = Math.round(num(o.minutes))
      out.push({ id: uid(), module: 'grove', value: v, detail: `${v} min focus` })
    } else if (m === 'respiro' && num(o.minutes) > 0) {
      const v = Math.round(num(o.minutes))
      out.push({ id: uid(), module: 'respiro', value: v, detail: `${v} min breathwork` })
    } else if (m === 'ghisa' && num(o.volume) > 0) {
      const v = Math.round(num(o.volume))
      const ex = typeof o.exercise === 'string' ? o.exercise : ''
      out.push({ id: uid(), module: 'ghisa', value: v, detail: `${fmtKg(v)} kg${ex ? ` · ${ex}` : ''}` })
    } else if (m === 'caliber' && num(o.e1rm) > 0 && typeof o.lift === 'string' && caliberLifts.has(o.lift)) {
      const v = Math.round(num(o.e1rm))
      out.push({ id: uid(), module: 'caliber', refId: o.lift, value: v, detail: `${o.lift} · e1RM ~${v} kg` })
    } else if (m === 'sana' && typeof o.supplement === 'string') {
      const c = compByName.get(o.supplement.toLowerCase())
      if (c) out.push({ id: uid(), module: 'sana', refId: c.id, detail: `${c.name} — dose` })
    } else if (m === 'cadence' && typeof o.habit === 'string') {
      const h = habitByName.get(o.habit.toLowerCase())
      if (h) out.push({ id: uid(), module: 'cadence', refId: h.id, detail: `${h.name} — done today` })
    }
  }
  const seen = new Set<string>()
  const enabled = new Set(settingsStore.get().enabled)
  return out.filter((d) => {
    const k = d.module + ':' + (d.refId ?? String(d.value))
    if (seen.has(k)) return false
    seen.add(k)
    return enabled.has(d.module)
  })
}

async function llmParse(text: string): Promise<CaptureDraft[] | null> {
  const compounds = sanaStore.get().compounds
  const habits = activeHabits(cadenceStore.get()).filter((h) => h.type === 'build')
  const raw = await runLLM(
    captureSystemPrompt(compounds.map((c) => c.name), habits.map((h) => h.name)),
    text,
  )
  if (raw === null) return null
  return coerceCapture(raw, compounds, habits)
}

/* ---------------- orchestration + apply ---------------- */

/** Tries the LLM parser when the user has enabled own-key insights (it handles
    free-form phrasing); otherwise, and on any failure, the deterministic local
    pass. */
export async function parseCapture(text: string): Promise<CaptureDraft[]> {
  const cfg = insightsConfigStore.get()
  if (cfg.enabled && cfg.providerId === 'ownkey' && hasOwnKey()) {
    const llm = await llmParse(text)
    if (llm && llm.length) return llm
  }
  return localParse(text)
}

export function applyDraft(d: CaptureDraft): void {
  switch (d.module) {
    case 'grove':
      logEvent({ module: 'grove', kind: 'focus', value: d.value, unit: 'min', meta: { src: 'quicklog' } })
      break
    case 'respiro':
      logEvent({ module: 'respiro', kind: 'session', value: d.value, unit: 'min', meta: { src: 'quicklog' } })
      break
    case 'ghisa':
      logEvent({ module: 'ghisa', kind: 'session', value: d.value, unit: 'kg', meta: { src: 'quicklog', note: d.detail } })
      break
    case 'cadence':
      if (d.refId) setCheck(d.refId, todayKey(), true)
      break
    case 'sana':
      if (d.refId) takeDose(d.refId)
      break
    case 'caliber':
      if (d.refId && d.value) logTest(d.refId, d.value)
      break
  }
}

export function applyDrafts(ds: CaptureDraft[]): void {
  for (const d of ds) applyDraft(d)
}

/** Module display name + accent for a draft chip. */
export function draftChrome(d: CaptureDraft): { name: string; accent: string } {
  const mod = moduleById(d.module)
  return { name: mod?.name ?? d.module.toUpperCase(), accent: mod?.accentVar ?? 'var(--accent)' }
}

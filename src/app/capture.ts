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
import { activeHabits, setCheck, cadenceStore } from '../modules/cadence/model'
import { sanaStore, takeDose } from '../modules/sana/model'
import { uid } from '../core/id'

export type CaptureModule = 'grove' | 'respiro' | 'ghisa' | 'cadence' | 'sana'

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

/** sets×reps×weight → total volume, plus the exercise name if present. */
function toVolume(s: string): { volume: number; note: string } | null {
  const sr = s.match(/(\d+)\s*[x×]\s*(\d+)/i)
  if (!sr) {
    const vol = s.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
    if (vol && /\b(volume|total)\b/i.test(s)) {
      return { volume: Math.round(parseFloat(vol[1].replace(',', '.'))), note: '' }
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
  const note = s
    .replace(/\d+(?:[.,]\d+)?/g, '')
    .replace(/[x×@]|kg/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return { volume: Math.round(sets * reps * w), note }
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
    // 1 — GHISA volume (needs numbers, so it's unambiguous)
    const vol = toVolume(clause)
    if (vol && (GHISA_KW.test(clause) || /[x×]/i.test(clause))) {
      out.push({ id: uid(), module: 'ghisa', value: vol.volume, detail: `${fmtKg(vol.volume)} kg${vol.note ? ` · ${vol.note}` : ''}` })
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
    // 4 — SANA doses (any known compound named in the clause; may be several)
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
    // 5 — CADENCE habit tick (first known build habit named in the clause)
    for (const h of habits) {
      if (seenHabit.has(h.id)) continue
      if (mentions(clause, h.name)) {
        seenHabit.add(h.id)
        out.push({ id: uid(), module: 'cadence', refId: h.id, detail: `${h.name} — done today` })
        break
      }
    }
  }
  return out
}

/* ---------------- orchestration + apply ---------------- */

/** Async so an LLM parser can slot in behind the same call later. Today it's
    the deterministic local pass. */
export async function parseCapture(text: string): Promise<CaptureDraft[]> {
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

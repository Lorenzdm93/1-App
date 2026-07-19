/**
 * SANA v2 — the prototype architecture. Regimens ("stacks") group compounds;
 * you follow any combination per day; shared compounds appear once on Today.
 * Still strictly an organisational aid: it remembers your decisions,
 * it never makes them.
 */
import { uid } from '../../core/id'
import { createPersistedStore } from '../../core/store'
import { logEvent, eventsStore } from '../../core/events'
import { dayKey, todayKey, shiftDay } from '../../core/dates'

export type Slot = 'morning' | 'midday' | 'evening' | 'night'
export type Form = 'capsule' | 'softgel' | 'tablet' | 'powder' | 'liquid'

export const SLOTS: readonly { id: Slot; label: string; glyph: string }[] = [
  { id: 'morning', label: 'Morning', glyph: '☀' },
  { id: 'midday', label: 'Midday', glyph: '◐' },
  { id: 'evening', label: 'Evening', glyph: '☾' },
  { id: 'night', label: 'Night', glyph: '✦' },
]

export const FORMS: readonly { id: Form; label: string }[] = [
  { id: 'capsule', label: 'Capsule' },
  { id: 'softgel', label: 'Softgel' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'powder', label: 'Powder' },
  { id: 'liquid', label: 'Liquid' },
]

export interface Compound {
  id: string
  name: string
  /** Secondary line, e.g. the chemical name — 'Cholecalciferol'. */
  chem: string
  /** '2000', '5', '½' — freeform amount, unit separate. */
  amount: string
  unit: string
  form: Form
  slot: Slot
  /** The italic advice line — 'With a meal that has fat'. */
  note: string
  createdTs: number
}

export interface Stack {
  id: string
  name: string
  emoji: string
  color: string
  compoundIds: string[]
  createdTs: number
  /** JS getDay() values (0 = Sunday). Absent or all seven = every day. */
  days?: number[]
}

export interface SanaState {
  /** Quick-log mental model: whole stacks, or time-of-day slots. */
  logMethod?: 'stack' | 'slot'
  compounds: Compound[]
  stacks: Stack[]
  /** dayKey → stack ids followed that day. Absent day = all stacks. */
  followOverrides: Record<string, string[]>
  /** dayKey → compound ids taken. */
  taken: Record<string, string[]>
}

export const STACK_COLORS: readonly string[] = [
  '#d9a24f', '#8aa88f', '#c07a5b', '#7f95b8', '#a58fc9', '#5fb0a5', '#c2ae4e', '#b98f74',
]
export const STACK_EMOJIS: readonly string[] = ['💊', '💪', '🧠', '😴', '🛡', '⚡', '❤️', '🌿', '☀️', '🦴', '🩸', '🧬']

const DEFAULTS: SanaState = { compounds: [], stacks: [], followOverrides: {}, taken: {} }

interface V1Item {
  id: string
  name: string
  doseLabel?: string
  kind?: string
  slots?: Slot[]
  withFood?: 'with' | 'empty' | null
  notes?: string
  createdTs?: number
  archived?: boolean
}
interface V1State {
  items?: V1Item[]
  taken?: Record<string, string[]>
}

/** v1 (flat items) → v2 (stacks + compounds). Multi-slot items collapse to their first slot. */
export function migrateSana(data: unknown, fromVersion: number): SanaState {
  if (fromVersion === 1 && data !== null && typeof data === 'object') {
    const d = data as V1State
    const items = (d.items ?? []).filter((i) => !i.archived)
    if (items.length === 0) return DEFAULTS
    const compounds: Compound[] = items.map((i) => ({
      id: i.id,
      name: i.name,
      chem: '',
      amount: i.doseLabel ?? '',
      unit: '',
      form: i.kind === 'medicine' ? 'tablet' : 'capsule',
      slot: i.slots?.[0] ?? 'morning',
      note:
        i.withFood === 'with'
          ? 'With food'
          : i.withFood === 'empty'
            ? 'On an empty stomach'
            : (i.notes ?? ''),
      createdTs: i.createdTs ?? Date.now(),
    }))
    const stack: Stack = {
      id: uid(),
      name: 'My stack',
      emoji: '💊',
      color: STACK_COLORS[0],
      compoundIds: compounds.map((c) => c.id),
      createdTs: Date.now(),
    }
    // v1 marks were `${itemId}@${slot}` — keep the itemId part.
    const taken: Record<string, string[]> = {}
    for (const [day, marks] of Object.entries(d.taken ?? {})) {
      taken[day] = [...new Set(marks.map((m) => m.split('@')[0]))]
    }
    return { compounds, stacks: [stack], followOverrides: {}, taken }
  }
  return DEFAULTS
}

export const sanaStore = createPersistedStore<SanaState>('sana', DEFAULTS, 2, migrateSana)

/* ---------- derived ---------- */

export function compoundById(st: SanaState, id: string): Compound | undefined {
  return st.compounds.find((c) => c.id === id)
}

export function followedOn(st: SanaState, day: string): string[] {
  const ids = st.stacks.map((s) => s.id)
  const o = st.followOverrides[day]
  return o ? o.filter((id) => ids.includes(id)) : ids
}

export function setFollowing(day: string, stackIds: string[]): void {
  sanaStore.set((s) => ({ ...s, followOverrides: { ...s.followOverrides, [day]: stackIds } }))
}

export function toggleFollow(day: string, stackId: string): void {
  const st = sanaStore.get()
  const cur = followedOn(st, day)
  setFollowing(day, cur.includes(stackId) ? cur.filter((i) => i !== stackId) : [...cur, stackId])
}

/** Unique compounds due on a day (union of followed stacks), with their stack memberships. */
export function stackActiveOn(stack: Stack, day: string): boolean {
  if (!stack.days || stack.days.length === 0 || stack.days.length === 7) return true
  return stack.days.includes(new Date(day + 'T12:00:00').getDay())
}

export function setStackDays(stackId: string, days: number[] | undefined): void {
  sanaStore.set((s) => ({
    ...s,
    stacks: s.stacks.map((x) => (x.id === stackId ? { ...x, days: days && days.length < 7 ? days : undefined } : x)),
  }))
}

export function dueOn(
  st: SanaState,
  day: string,
): { compound: Compound; stacks: Stack[] }[] {
  const followed = st.stacks.filter((s) => followedOn(st, day).includes(s.id))
  const map = new Map<string, Stack[]>()
  for (const stk of followed) {
    for (const cid of stk.compoundIds) {
      if (!map.has(cid)) map.set(cid, [])
      map.get(cid)!.push(stk)
    }
  }
  const out: { compound: Compound; stacks: Stack[] }[] = []
  for (const [cid, stacks] of map) {
    const c = compoundById(st, cid)
    if (c && dayKey(c.createdTs) <= day) out.push({ compound: c, stacks })
  }
  const order: Record<Slot, number> = { morning: 0, midday: 1, evening: 2, night: 3 }
  return out.sort((a, b) => order[a.compound.slot] - order[b.compound.slot] || a.compound.name.localeCompare(b.compound.name))
}

export function isTaken(st: SanaState, compoundId: string, day = todayKey()): boolean {
  return (st.taken[day] ?? []).includes(compoundId)
}

function removeDoseEvent(compoundId: string, day: string): void {
  const events = eventsStore.get()
  const idx = events.findIndex(
    (e) => e.module === 'sana' && e.kind === 'dose' && dayKey(e.ts) === day && e.meta?.compoundId === compoundId,
  )
  if (idx >= 0) eventsStore.set(events.filter((_, i) => i !== idx))
}

function tsFor(day: string): number {
  if (day === todayKey()) return Date.now()
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}

/** Toggle one dose; the event stream mirrors it exactly. Returns the new taken state. */
export function takeDose(compoundId: string, day = todayKey()): boolean {
  const st = sanaStore.get()
  const taking = !isTaken(st, compoundId, day)
  sanaStore.set((s) => ({
    ...s,
    taken: {
      ...s.taken,
      [day]: taking
        ? [...(s.taken[day] ?? []), compoundId]
        : (s.taken[day] ?? []).filter((i) => i !== compoundId),
    },
  }))
  if (taking) {
    logEvent({ module: 'sana', kind: 'dose', value: 1, unit: 'dose', ts: tsFor(day), meta: { compoundId } })
  } else {
    removeDoseEvent(compoundId, day)
  }
  return taking
}

/** TAKE ALL — every listed compound not yet taken. Returns how many were taken. */
export function takeMany(compoundIds: string[], day = todayKey()): number {
  let n = 0
  for (const id of compoundIds) {
    if (!isTaken(sanaStore.get(), id, day)) {
      takeDose(id, day)
      n++
    }
  }
  return n
}

/* ---------- stacks & compounds CRUD ---------- */

export function addStack(input: { name: string; emoji: string; color: string }): Stack {
  const stack: Stack = { id: uid(), compoundIds: [], createdTs: Date.now(), ...input }
  sanaStore.set((s) => ({ ...s, stacks: [...s.stacks, stack] }))
  return stack
}

export function updateStack(id: string, patch: Partial<Omit<Stack, 'id' | 'createdTs'>>): void {
  sanaStore.set((s) => ({ ...s, stacks: s.stacks.map((k) => (k.id === id ? { ...k, ...patch } : k)) }))
}

/** Deletes a stack; compounds referenced by no other stack go with it. */
export function deleteStack(id: string): void {
  sanaStore.set((s) => {
    const stacks = s.stacks.filter((k) => k.id !== id)
    const referenced = new Set(stacks.flatMap((k) => k.compoundIds))
    return { ...s, stacks, compounds: s.compounds.filter((c) => referenced.has(c.id)) }
  })
}

export function addCompound(
  stackId: string,
  input: Omit<Compound, 'id' | 'createdTs'>,
): Compound {
  const c: Compound = { id: uid(), createdTs: Date.now(), ...c_trim(input) }
  sanaStore.set((s) => ({
    ...s,
    compounds: [...s.compounds, c],
    stacks: s.stacks.map((k) => (k.id === stackId ? { ...k, compoundIds: [...k.compoundIds, c.id] } : k)),
  }))
  return c
}

function c_trim<T extends { name: string; chem: string; amount: string; unit: string; note: string }>(x: T): T {
  return { ...x, name: x.name.trim(), chem: x.chem.trim(), amount: x.amount.trim(), unit: x.unit.trim(), note: x.note.trim() }
}

export function updateCompound(id: string, patch: Partial<Omit<Compound, 'id' | 'createdTs'>>): void {
  sanaStore.set((s) => ({ ...s, compounds: s.compounds.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
}

/** Links an existing compound into a stack (shared compounds are the point). */
export function linkCompound(stackId: string, compoundId: string): void {
  sanaStore.set((s) => ({
    ...s,
    stacks: s.stacks.map((k) =>
      k.id === stackId && !k.compoundIds.includes(compoundId)
        ? { ...k, compoundIds: [...k.compoundIds, compoundId] }
        : k,
    ),
  }))
}

/** Removes from one stack; deletes the compound entirely if nothing references it anymore. */
export function unlinkCompound(stackId: string, compoundId: string): void {
  sanaStore.set((s) => {
    const stacks = s.stacks.map((k) =>
      k.id === stackId ? { ...k, compoundIds: k.compoundIds.filter((i) => i !== compoundId) } : k,
    )
    const referenced = new Set(stacks.flatMap((k) => k.compoundIds))
    return { ...s, stacks, compounds: s.compounds.filter((c) => referenced.has(c.id)) }
  })
}

/* ---------- history math ---------- */

export interface DayCount {
  day: string
  taken: number
  due: number
}

export function dayCount(st: SanaState, day: string): DayCount {
  const due = dueOn(st, day)
  const taken = due.filter(({ compound }) => isTaken(st, compound.id, day)).length
  return { day, taken, due: due.length }
}

function earliestDay(st: SanaState): string {
  let min = todayKey()
  for (const c of st.compounds) {
    const k = dayKey(c.createdTs)
    if (k < min) min = k
  }
  for (const d of Object.keys(st.taken)) if (d < min) min = d
  return min
}

export interface HistoryStats {
  streak: number
  bestRun: number
  rate30: number
}

/** Streak = consecutive complete days ending today/yesterday; bestRun = longest ever; rate30 = doses taken/due. */
export function historyStats(st: SanaState, today = todayKey()): HistoryStats {
  const start = earliestDay(st)
  let streak = 0
  let bestRun = 0
  let run = 0
  const horizon = Math.min(365, Math.max(1, daySpan(start, today)))
  const completes: boolean[] = []
  for (let i = horizon - 1; i >= 0; i--) {
    const day = shiftDay(today, -i)
    const c = dayCount(st, day)
    const complete = c.due > 0 && c.taken >= c.due
    completes.push(complete)
    if (c.due === 0) {
      run = 0
      continue
    }
    run = complete ? run + 1 : 0
    if (run > bestRun) bestRun = run
  }
  for (let i = completes.length - 1; i >= 0; i--) {
    const idx = completes.length - 1 - i // 0 = today
    if (idx === 0 && !completes[i]) continue // today may still be in progress
    if (completes[i]) streak++
    else break
  }
  let taken = 0
  let due = 0
  for (let i = 0; i < 30; i++) {
    const c = dayCount(st, shiftDay(today, -i))
    taken += c.taken
    due += c.due
  }
  return { streak, bestRun, rate30: due > 0 ? Math.round((taken / due) * 100) : 0 }
}

function daySpan(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((new Date(yb, mb - 1, db, 12).getTime() - new Date(ya, ma - 1, da, 12).getTime()) / 86400000) + 1
}

/** Doses taken / due across the week's elapsed days. Null when nothing was due. */
export function weekAdherence(st: SanaState, weekStart: string, today = todayKey()): number | null {
  let taken = 0
  let due = 0
  for (let i = 0; i < 7; i++) {
    const day = shiftDay(weekStart, i)
    if (day > today) break
    const c = dayCount(st, day)
    taken += c.taken
    due += c.due
  }
  if (due === 0) return null
  return taken / due
}

export function setLogMethod(m: 'stack' | 'slot'): void {
  sanaStore.set((s) => ({ ...s, logMethod: m }))
}

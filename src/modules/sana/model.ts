/**
 * SANA — the supplement & medicine cabinet, rebuilt for the platform.
 * Purely an organisational aid: it remembers what you decided to take
 * and when — it never suggests what or how much. That line is load-bearing.
 */
import { uid } from '../../core/id'
import { createPersistedStore } from '../../core/store'
import { logEvent, eventsStore } from '../../core/events'
import { dayKey, todayKey, shiftDay } from '../../core/dates'

export type Slot = 'morning' | 'midday' | 'evening' | 'night'

export const SLOTS: readonly { id: Slot; label: string; glyph: string }[] = [
  { id: 'morning', label: 'Morning', glyph: '☀' },
  { id: 'midday', label: 'Midday', glyph: '◐' },
  { id: 'evening', label: 'Evening', glyph: '☾' },
  { id: 'night', label: 'Night', glyph: '✦' },
]

export type Kind = 'supplement' | 'medicine'

export interface Item {
  id: string
  name: string
  /** Freeform dose label — '5000 IU', '2 × 500 mg', 'half tab'. */
  doseLabel: string
  kind: Kind
  slots: Slot[]
  /** Weekdays taken, 0 = Monday … 6 = Sunday. */
  days: number[]
  withFood: 'with' | 'empty' | null
  /** Units remaining, null = not tracking stock. */
  stock: number | null
  notes: string
  createdTs: number
  archived?: boolean
}

export interface SanaState {
  items: Item[]
  /** dayKey → list of `${itemId}@${slot}` taken marks. */
  taken: Record<string, string[]>
}

const DEFAULTS: SanaState = { items: [], taken: {} }

export function migrateSana(_data: unknown, _fromVersion: number): SanaState {
  return DEFAULTS
}

export const sanaStore = createPersistedStore<SanaState>('sana', DEFAULTS, 1, migrateSana)

/** Monday-first weekday index for a dayKey. */
export function weekdayIndex(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return (new Date(y, m - 1, d, 12).getDay() + 6) % 7
}

export const ALL_DAYS: number[] = [0, 1, 2, 3, 4, 5, 6]

export function addItem(input: {
  name: string
  doseLabel: string
  kind: Kind
  slots: Slot[]
  days?: number[]
  withFood?: 'with' | 'empty' | null
  stock?: number | null
  notes?: string
}): Item {
  const item: Item = {
    id: uid(),
    name: input.name.trim(),
    doseLabel: input.doseLabel.trim(),
    kind: input.kind,
    slots: input.slots.length > 0 ? input.slots : ['morning'],
    days: input.days && input.days.length > 0 ? [...input.days].sort() : [...ALL_DAYS],
    withFood: input.withFood ?? null,
    stock: input.stock ?? null,
    notes: input.notes?.trim() ?? '',
    createdTs: Date.now(),
  }
  sanaStore.set((s) => ({ ...s, items: [...s.items, item] }))
  return item
}

export function updateItem(id: string, patch: Partial<Omit<Item, 'id' | 'createdTs'>>): void {
  sanaStore.set((s) => ({
    ...s,
    items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
  }))
}

export function archiveItem(id: string): void {
  updateItem(id, { archived: true })
}

export function activeItems(st: SanaState): Item[] {
  return st.items.filter((it) => !it.archived)
}

export function isDue(item: Item, day: string): boolean {
  return item.days.includes(weekdayIndex(day))
}

/** Every (item, slot) pair due on `day`. */
export function dueOn(st: SanaState, day: string): { item: Item; slot: Slot }[] {
  const out: { item: Item; slot: Slot }[] = []
  for (const s of SLOTS) {
    for (const item of activeItems(st)) {
      if (isDue(item, day) && item.slots.includes(s.id)) out.push({ item, slot: s.id })
    }
  }
  return out
}

const mark = (id: string, slot: Slot) => `${id}@${slot}`

export function isTaken(st: SanaState, itemId: string, slot: Slot, day = todayKey()): boolean {
  return (st.taken[day] ?? []).includes(mark(itemId, slot))
}

function removeDoseEvent(itemId: string, slot: Slot, day: string): void {
  const events = eventsStore.get()
  const idx = events.findIndex(
    (e) =>
      e.module === 'sana' &&
      e.kind === 'dose' &&
      dayKey(e.ts) === day &&
      e.meta?.itemId === itemId &&
      e.meta?.slot === slot,
  )
  if (idx >= 0) eventsStore.set(events.filter((_, i) => i !== idx))
}

/** Toggle a dose. Taking decrements stock (if tracked) and logs the event; untaking reverses both. */
export function takeDose(itemId: string, slot: Slot, day = todayKey()): boolean {
  const st = sanaStore.get()
  const item = st.items.find((i) => i.id === itemId)
  if (!item) return false
  const key = mark(itemId, slot)
  const list = st.taken[day] ?? []
  const taking = !list.includes(key)
  sanaStore.set((s) => ({
    ...s,
    taken: {
      ...s.taken,
      [day]: taking ? [...(s.taken[day] ?? []), key] : (s.taken[day] ?? []).filter((k) => k !== key),
    },
    items: s.items.map((it) =>
      it.id === itemId && it.stock !== null
        ? { ...it, stock: Math.max(0, it.stock + (taking ? -1 : 1)) }
        : it,
    ),
  }))
  if (taking) {
    const [y, m, d] = day.split('-').map(Number)
    logEvent({
      module: 'sana',
      kind: 'dose',
      value: 1,
      unit: 'dose',
      ts: day === todayKey() ? Date.now() : new Date(y, m - 1, d, 12).getTime(),
      meta: { itemId, slot },
    })
  } else {
    removeDoseEvent(itemId, slot, day)
  }
  return taking
}

export function refill(itemId: string, by: number): void {
  sanaStore.set((s) => ({
    ...s,
    items: s.items.map((it) =>
      it.id === itemId ? { ...it, stock: Math.max(0, (it.stock ?? 0) + by) } : it,
    ),
  }))
}

/** Average scheduled doses per day → days of stock left. Null when not tracked or unscheduled. */
export function daysLeft(item: Item): number | null {
  if (item.stock === null) return null
  const perWeek = item.slots.length * item.days.length
  if (perWeek === 0) return null
  return Math.floor(item.stock / (perWeek / 7))
}

export const LOW_STOCK_DAYS = 5

export interface Adherence {
  taken: number
  due: number
  pct: number
}

/** Adherence over the trailing `n` days (including today). Only counts days after the item existed. */
export function adherence(st: SanaState, n: number, today = todayKey(), itemId?: string): Adherence {
  let taken = 0
  let due = 0
  for (let i = 0; i < n; i++) {
    const day = shiftDay(today, -i)
    for (const { item, slot } of dueOn(st, day)) {
      if (itemId !== undefined && item.id !== itemId) continue
      if (dayKey(item.createdTs) > day) continue
      due++
      if (isTaken(st, item.id, slot, day)) taken++
    }
  }
  return { taken, due, pct: due > 0 ? Math.round((taken / due) * 100) : 100 }
}

/** Days in the trailing `n` where everything due was taken (only days with something due). */
export function perfectDayStreak(st: SanaState, today = todayKey()): number {
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const day = shiftDay(today, -i)
    const due = dueOn(st, day).filter(({ item }) => dayKey(item.createdTs) <= day)
    if (due.length === 0) {
      if (i === 0) continue
      break
    }
    const all = due.every(({ item, slot }) => isTaken(st, item.id, slot, day))
    if (all) streak++
    else if (i === 0) continue
    else break
  }
  return streak
}

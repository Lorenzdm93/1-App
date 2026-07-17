/**
 * The metric event log. Modules append; the platform reads.
 *
 * This one stream powers the daily ring, streaks and weekly stats today,
 * and is the substrate for cross-module insights and sync later. Keeping
 * it append-only and module-agnostic is what makes "1%" a platform
 * instead of a folder of apps.
 */
import { createPersistedStore } from './store'
import { uid } from './id'
import { dayKey, todayKey, shiftDay } from './dates'
import type { MetricEvent } from './types'

/** Soft cap: ~13 years of 1 event/day, or ~1 year of heavy multi-module use. */
const MAX_EVENTS = 5000

/** Newest first. */
export const eventsStore = createPersistedStore<MetricEvent[]>('core.events', [])

export function logEvent(input: {
  module: string
  kind: string
  value?: number
  unit?: string
  meta?: Record<string, unknown>
  ts?: number
}): MetricEvent {
  const event: MetricEvent = {
    id: uid(),
    module: input.module,
    kind: input.kind,
    ts: input.ts ?? Date.now(),
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.meta !== undefined ? { meta: input.meta } : {}),
  }
  eventsStore.set((list) => [event, ...list].slice(0, MAX_EVENTS))
  return event
}

export function eventsOnDay(events: MetricEvent[], key: string): MetricEvent[] {
  return events.filter((e) => dayKey(e.ts) === key)
}

export function activeModulesOnDay(events: MetricEvent[], key: string): Set<string> {
  const active = new Set<string>()
  for (const e of events) if (dayKey(e.ts) === key) active.add(e.module)
  return active
}

/**
 * Consecutive active days ending today — or ending yesterday, so the streak
 * isn't shown as broken before today is over.
 */
export function currentStreak(events: MetricEvent[], today = todayKey()): number {
  const active = new Set<string>()
  for (const e of events) active.add(dayKey(e.ts))
  let cursor = active.has(today) ? today : shiftDay(today, -1)
  let streak = 0
  while (active.has(cursor)) {
    streak++
    cursor = shiftDay(cursor, -1)
  }
  return streak
}

/** Sum of `value` for a module+kind across a set of day keys. */
export function sumValue(
  events: MetricEvent[],
  module: string,
  kind: string,
  days: readonly string[],
): number {
  const set = new Set(days)
  let total = 0
  for (const e of events) {
    if (e.module === module && e.kind === kind && set.has(dayKey(e.ts))) {
      total += e.value ?? 0
    }
  }
  return total
}

export function countEvents(
  events: MetricEvent[],
  module: string,
  kind: string,
  days: readonly string[],
): number {
  const set = new Set(days)
  let n = 0
  for (const e of events) {
    if (e.module === module && e.kind === kind && set.has(dayKey(e.ts))) n++
  }
  return n
}

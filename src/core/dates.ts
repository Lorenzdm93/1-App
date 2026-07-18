/** Local-time day keys ('YYYY-MM-DD') — the unit of streaks and daily stats. */

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayKey(): string {
  return dayKey(Date.now())
}

/** The day key `delta` days away from `key` (negative = past). DST-safe via noon anchor. */
export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const anchor = new Date(y, m - 1, d, 12, 0, 0)
  anchor.setDate(anchor.getDate() + delta)
  return dayKey(anchor.getTime())
}

/** Today and the n-1 days before it, oldest first. */
export function lastNDayKeys(n: number): string[] {
  const today = todayKey()
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) keys.push(shiftDay(today, -i))
  return keys
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${pad(s)}`
}

/** Whole days from `fromKey` to `toKey` (noon-anchored, DST-safe). */
export function dayDiff(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  const a = new Date(fy, fm - 1, fd, 12).getTime()
  const b = new Date(ty, tm - 1, td, 12).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** Monday key of the week containing `day`. */
export function weekStartKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  const back = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - back)
  return dayKey(date.getTime())
}

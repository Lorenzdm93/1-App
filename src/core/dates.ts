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

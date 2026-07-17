/**
 * Namespaced, versioned persistence.
 *
 * Every module owns exactly one namespace: `op:v1:<moduleId>`.
 * Payloads are wrapped as { v, data } so schema migrations run on load.
 * localStorage failures (private mode, quota) degrade to an in-memory map,
 * so the app never crashes on a storage error — it just loses persistence.
 */

const PREFIX = 'op:v1:'
const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    const v = localStorage.getItem(key)
    if (v !== null) return v
  } catch {
    /* fall through to memory */
  }
  return memory.get(key) ?? null
}

function write(key: string, value: string): void {
  memory.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    /* memory copy already holds it */
  }
}

function remove(key: string): void {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export type Migrate<T> = (data: unknown, fromVersion: number) => T

export function loadNS<T>(ns: string, fallback: T, version = 1, migrate?: Migrate<T>): T {
  const raw = read(PREFIX + ns)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'v' in parsed &&
      'data' in parsed
    ) {
      const wrapped = parsed as { v: number; data: unknown }
      if (wrapped.v === version) return (wrapped.data as T) ?? fallback
      if (migrate) return migrate(wrapped.data, wrapped.v)
      return fallback
    }
    return fallback
  } catch {
    return fallback
  }
}

export function saveNS<T>(ns: string, data: T, version = 1): void {
  write(PREFIX + ns, JSON.stringify({ v: version, data }))
}

/** Every key currently stored under the app prefix. */
export function ownKeys(): string[] {
  const keys = new Set<string>()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.add(k)
    }
  } catch {
    /* private mode — memory only */
  }
  for (const k of memory.keys()) if (k.startsWith(PREFIX)) keys.add(k)
  return [...keys].sort()
}

export interface BackupFile {
  app: '1%'
  version: number
  exportedAt: string
  entries: Record<string, unknown>
}

export function exportAll(): string {
  const entries: Record<string, unknown> = {}
  for (const key of ownKeys()) {
    const raw = read(key)
    if (raw === null) continue
    try {
      entries[key] = JSON.parse(raw)
    } catch {
      entries[key] = raw
    }
  }
  const backup: BackupFile = {
    app: '1%',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  }
  return JSON.stringify(backup, null, 2)
}

/** Restores a backup. Returns the number of entries written. Throws on invalid files. */
export function importAll(json: string): number {
  const parsed: unknown = JSON.parse(json)
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    (parsed as BackupFile).app !== '1%' ||
    typeof (parsed as BackupFile).entries !== 'object'
  ) {
    throw new Error('Not a 1% backup file')
  }
  const entries = (parsed as BackupFile).entries
  let count = 0
  for (const [key, value] of Object.entries(entries)) {
    if (!key.startsWith(PREFIX)) continue
    write(key, typeof value === 'string' ? value : JSON.stringify(value))
    count++
  }
  return count
}

export function clearAll(): void {
  for (const key of ownKeys()) remove(key)
}

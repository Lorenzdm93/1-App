#!/usr/bin/env node
/**
 * Verifies every GHISA exercise-media URL against free-exercise-db.
 * Run locally (needs internet):  node scripts/verify-ghisa-media.mjs
 * Prints OK/MISS per exercise and a copy-paste summary of misses.
 */
const src = await (await import('node:fs/promises')).readFile(
  new URL('../src/modules/ghisa/media.ts', import.meta.url), 'utf8')
const map = Object.fromEntries(
  [...src.matchAll(/'([\w-]+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]))
const base = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const misses = []
for (const [id, folder] of Object.entries(map)) {
  const url = `${base}${folder}/0.jpg`
  try {
    const r = await fetch(url, { method: 'HEAD' })
    console.log(r.ok ? `OK   ${id}` : `MISS ${id} -> ${folder} (${r.status})`)
    if (!r.ok) misses.push(`${id} -> ${folder}`)
  } catch (e) {
    console.log(`ERR  ${id} (${e.message})`)
    misses.push(`${id} -> ${folder} (network)`)
  }
}
console.log(misses.length ? `\n${misses.length} MISSES:\n` + misses.join('\n') : '\nALL VERIFIED ✓')

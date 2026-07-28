/**
 * Pulls the free-exercise-db photo pairs once, at build-authoring time, and
 * writes optimised local WebP into public/ex/. Run manually, not in CI —
 * the output is committed so the app never touches a third party at runtime.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

// sharp resolves through CommonJS here (global install, no local node_modules).
const sharp = createRequire(import.meta.url)('sharp')

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const OUT = 'public/ex'
const map = JSON.parse(fs.readFileSync('/tmp/exmap.json', 'utf8'))

// Two mappings that 404 in production today; correct folders from the dataset index.
const FIX = { lunge: 'Dumbbell_Lunges', 'cable-lateral-raise': 'Cable_Seated_Lateral_Raise' }
for (const e of map) if (FIX[e.id]) e.folder = FIX[e.id]

fs.mkdirSync(OUT, { recursive: true })

let bytesIn = 0
let bytesOut = 0
const ok = []
const failed = []

for (const e of map) {
  const frames = []
  for (const f of [0, 1]) {
    const url = BASE + encodeURIComponent(e.folder) + '/' + f + '.jpg'
    const res = await fetch(url)
    if (!res.ok) {
      failed.push(`${e.id}/${f} (${res.status})`)
      frames.length = 0
      break
    }
    frames.push(Buffer.from(await res.arrayBuffer()))
  }
  if (frames.length !== 2) continue

  for (let f = 0; f < 2; f++) {
    bytesIn += frames[f].length
    const out = await sharp(frames[f])
      .resize({ width: 480, height: 480, fit: 'cover', position: 'centre' })
      .webp({ quality: 76, effort: 6 })
      .toBuffer()
    bytesOut += out.length
    fs.writeFileSync(path.join(OUT, `${e.id}-${f}.webp`), out)
  }
  ok.push(e.id)
}

console.log(`ok:     ${ok.length} exercises (${ok.length * 2} frames)`)
console.log(`failed: ${failed.length ? failed.join(', ') : 'none'}`)
console.log(`size:   ${(bytesIn / 1e6).toFixed(1)} MB jpeg -> ${(bytesOut / 1e6).toFixed(2)} MB webp`)
fs.writeFileSync('/tmp/ex-ok.json', JSON.stringify(ok))

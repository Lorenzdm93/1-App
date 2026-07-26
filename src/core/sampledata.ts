/**
 * One switch for the whole showroom. Seeds every module's sample history
 * (twelve months, deterministic, seam-linked) or removes all of it — each
 * module's own tagged loader does the work, so removal is exactly as surgical
 * as it always was. Lives in core but imports downward into modules the same
 * way the registry does; nothing imports this file except the Settings screen.
 */
import * as ghisa from '../modules/ghisa/model'
import * as cadence from '../modules/cadence/model'
import * as sana from '../modules/sana/model'
import * as caliber from '../modules/caliber/model'
import * as respiro from '../modules/respiro/model'
import * as ora from '../modules/ora/model'
import * as grove from '../modules/grove/model'

const MODS = [
  ['GHISA', ghisa],
  ['CADENCE', cadence],
  ['SANA', sana],
  ['CALIBER', caliber],
  ['RESPIRO', respiro],
  ['ORA', ora],
  ['GROVE', grove],
] as const

export function seedAllSampleData(): number {
  let n = 0
  for (const [, m] of MODS) {
    try {
      m.seedDemo()
      n++
    } catch (e) {
      console.error('[sample]', e)
    }
  }
  return n
}

export function removeAllSampleData(): number {
  let n = 0
  for (const [, m] of MODS) {
    try {
      m.removeDemo()
      n++
    } catch (e) {
      console.error('[sample]', e)
    }
  }
  return n
}

export function anySampleData(): boolean {
  return MODS.some(([, m]) => {
    try {
      return typeof (m as { hasDemo?: () => boolean }).hasDemo === 'function'
        ? (m as { hasDemo: () => boolean }).hasDemo()
        : false
    } catch {
      return false
    }
  })
}

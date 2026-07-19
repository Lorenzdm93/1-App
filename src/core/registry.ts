/**
 * The single place modules are wired into the platform.
 * Adding a future module = one folder + one line here.
 */
import type { ModuleDefinition } from './types'
import ghisa from '../modules/ghisa'
import respiro from '../modules/respiro'
import caliber from '../modules/caliber'
import cadence from '../modules/cadence'
import grove from '../modules/grove'
import sana from '../modules/sana'
import ora from '../modules/ora'

export const MODULES: readonly ModuleDefinition[] = [ghisa, cadence, grove, respiro, sana, ora, caliber]

export function moduleById(id: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === id)
}

export function enabledModules(enabledIds: readonly string[]): ModuleDefinition[] {
  // The enabled array is ordered — the user's arrangement is the truth.
  return enabledIds
    .map((id) => MODULES.find((m) => m.id === id))
    .filter((m): m is ModuleDefinition => m !== undefined)
}

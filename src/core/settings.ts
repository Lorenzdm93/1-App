/** Core app settings — which modules the person has enabled. */
import { createPersistedStore } from './store'

export interface CoreSettings {
  enabled: string[]
}

export const settingsStore = createPersistedStore<CoreSettings>('core.settings', {
  enabled: ['ghisa', 'respiro', 'caliber', 'cadence'],
})

export function toggleModule(id: string): void {
  settingsStore.set((s) => ({
    ...s,
    enabled: s.enabled.includes(id)
      ? s.enabled.filter((m) => m !== id)
      : [...s.enabled, id],
  }))
}

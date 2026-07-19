/** Core app settings — enabled modules, theme, onboarding state. Schema v2. */
import { createPersistedStore } from './store'

export type Theme = 'system' | 'dark' | 'light'

export interface CoreSettings {
  enabled: string[]
  theme: Theme
  onboarded: boolean
}

const DEFAULTS: CoreSettings = {
  enabled: [],
  theme: 'system',
  onboarded: false,
}

/** v1 had only { enabled }. Existing installs keep their modules and meet the intro once. */
export function migrateSettings(data: unknown, fromVersion: number): CoreSettings {
  if (fromVersion === 1 && data !== null && typeof data === 'object' && 'enabled' in data) {
    const enabled = (data as { enabled: unknown }).enabled
    return {
      ...DEFAULTS,
      enabled: Array.isArray(enabled) ? enabled.filter((x): x is string => typeof x === 'string') : [],
    }
  }
  return DEFAULTS
}

export const settingsStore = createPersistedStore<CoreSettings>(
  'core.settings',
  DEFAULTS,
  2,
  migrateSettings,
)

export function toggleModule(id: string): void {
  settingsStore.set((s) => ({
    ...s,
    enabled: s.enabled.includes(id)
      ? s.enabled.filter((m) => m !== id)
      : [...s.enabled, id],
  }))
}

export function setTheme(theme: Theme): void {
  settingsStore.set((s) => ({ ...s, theme }))
}

export function completeOnboarding(enabled: string[]): void {
  settingsStore.set((s) => ({ ...s, enabled, onboarded: true }))
}

export function setModuleOrder(ids: string[]): void {
  settingsStore.set((st) => ({ ...st, enabled: ids.filter((id) => st.enabled.includes(id)) }))
}

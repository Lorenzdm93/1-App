import { createPersistedStore } from '../../core/store'

export interface RespiroState {
  protocolId: string
  /** Set by a quick action on Today: the screen starts a session on mount. */
  autostart: boolean
}

export const respiroStore = createPersistedStore<RespiroState>('respiro', {
  protocolId: 'box',
  autostart: false,
})

export function selectProtocol(id: string): void {
  respiroStore.set((s) => ({ ...s, protocolId: id }))
}

export function requestAutostart(id: string): void {
  respiroStore.set(() => ({ protocolId: id, autostart: true }))
}

export function consumeAutostart(): boolean {
  const wants = respiroStore.get().autostart
  if (wants) respiroStore.set((s) => ({ ...s, autostart: false }))
  return wants
}

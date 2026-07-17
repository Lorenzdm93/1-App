/** Tiny toast bus. The host element is always pointer-events: none. */
import { createStore } from './store'

export interface ToastState {
  id: number
  message: string
}

export const toastStore = createStore<ToastState | null>(null)
let counter = 0
let timer: ReturnType<typeof setTimeout> | undefined

export function toast(message: string): void {
  counter += 1
  toastStore.set({ id: counter, message })
  if (timer !== undefined) clearTimeout(timer)
  timer = setTimeout(() => toastStore.set(null), 2200)
}

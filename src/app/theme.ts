/**
 * Applies the chosen theme to <html data-theme> and keeps the browser
 * chrome color in sync. 'system' follows the OS live.
 */
import { useEffect } from 'react'
import type { Theme } from '../core/settings'

const BG = { dark: '#0b0c0f', light: '#f3f1ea' } as const

function effective(theme: Theme, systemDark: boolean): 'dark' | 'light' {
  if (theme === 'system') return systemDark ? 'dark' : 'light'
  return theme
}

function apply(mode: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = mode
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', BG[mode])
}

export function useTheme(theme: Theme): void {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    apply(effective(theme, mq.matches))
    if (theme !== 'system') return
    const onChange = (e: MediaQueryListEvent) => apply(effective(theme, e.matches))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])
}

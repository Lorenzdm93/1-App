/**
 * The gradient ring gauge — the platform's hero element (Bevel-school).
 * Track in quiet gray; value arc in a synthesized two-stop gradient of the
 * accent; rounded caps; animates in on mount. value null → idle dashed track.
 */
import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'

export default function Ring({
  value,
  accent,
  size = 132,
  stroke = 11,
  children,
}: {
  value: number | null
  accent: string
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const gid = useId().replace(/:/g, '')
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const frac = value === null ? 0 : Math.min(1, Math.max(0, value / 100))
  const shown = mounted ? frac : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`rg-${gid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={`color-mix(in srgb, ${accent} 45%, #ffffff)`} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--ring-track)" strokeWidth={stroke}
          strokeLinecap="round"
        />
        {value !== null && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={`url(#rg-${gid})`} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - shown)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 0.9s cubic-bezier(0.3, 0.9, 0.35, 1)',
              filter: `drop-shadow(0 0 ${stroke * 0.7}px color-mix(in srgb, ${accent} 40%, transparent))`,
            }}
          />
        )}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

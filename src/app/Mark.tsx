/**
 * The 1% brand mark, in-app. Same geometry as the PWA icons and the App Store
 * artwork — one source of truth, drawn as vectors so it's crisp at 28px and
 * 280px. The numeral inherits `currentColor` so it reads correctly in both
 * themes; the swoosh keeps its blue→jade gradient at every size.
 */
import { useRef } from 'react'

export default function Mark({
  size = 64,
  title = '1%',
}: {
  size?: number
  /** Empty string renders it decorative (aria-hidden). */
  title?: string
}) {
  const gid = useRef('mk' + Math.random().toString(36).slice(2, 8)).current
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="brandmark"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6FA8DC" />
          <stop offset="100%" stopColor="var(--jade, #35c78f)" />
        </linearGradient>
      </defs>
      <path
        d="M 10 78 C 38 76, 58 66, 80 36"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="82.5" cy="32" r="4.6" fill="var(--jade, #35c78f)" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22 30 L 33 20 L 33 62" strokeWidth="9" />
        <circle cx="50" cy="30" r="6.4" strokeWidth="5" />
        <circle cx="68" cy="52" r="6.4" strokeWidth="5" />
        <line x1="69" y1="26" x2="49" y2="56" strokeWidth="5" />
      </g>
    </svg>
  )
}

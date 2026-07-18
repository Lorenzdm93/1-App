import type { ReactNode } from 'react'
import type { Species } from './model'

/**
 * A tree drawn in the module accent, grown by `growth` 0..1.
 * Species differ in silhouette: birch (round), pine (spire), oak (broad).
 */
export default function TreeSVG({
  species,
  growth,
  size,
  sway = false,
}: {
  species: Species
  growth: number
  size: number
  sway?: boolean
}) {
  const g = Math.min(1, Math.max(0, growth))
  const acc = 'var(--m-grove)'
  const trunk = 'var(--gr-trunk)'
  const trunkH = 14 + 30 * g
  const crownScale = 0.25 + 0.75 * g
  const baseY = 96

  let crown: ReactNode = null
  if (species === 'birch') {
    crown = (
      <g transform={`translate(50 ${baseY - trunkH}) scale(${crownScale})`}>
        <circle cx="0" cy="-16" r="17" fill={acc} opacity="0.9" />
        <circle cx="-13" cy="-6" r="12" fill={acc} opacity="0.7" />
        <circle cx="13" cy="-7" r="13" fill={acc} opacity="0.78" />
      </g>
    )
  } else if (species === 'pine') {
    crown = (
      <g transform={`translate(50 ${baseY - trunkH}) scale(${crownScale})`}>
        <polygon points="0,-46 16,-14 -16,-14" fill={acc} opacity="0.9" />
        <polygon points="0,-32 20,-2 -20,-2" fill={acc} opacity="0.8" />
        <polygon points="0,-18 24,10 -24,10" fill={acc} opacity="0.7" />
      </g>
    )
  } else {
    crown = (
      <g transform={`translate(50 ${baseY - trunkH}) scale(${crownScale})`}>
        <ellipse cx="0" cy="-14" rx="24" ry="17" fill={acc} opacity="0.85" />
        <ellipse cx="-16" cy="-5" rx="13" ry="10" fill={acc} opacity="0.65" />
        <ellipse cx="16" cy="-4" rx="14" ry="10" fill={acc} opacity="0.7" />
      </g>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={sway ? 'gr-sway' : undefined}
      style={{ overflow: 'visible' }}
    >
      <line x1="30" y1={baseY} x2="70" y2={baseY} stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <rect
        x={50 - 2.6}
        y={baseY - trunkH}
        width="5.2"
        height={trunkH}
        rx="2.2"
        fill={trunk}
      />
      {crown}
    </svg>
  )
}

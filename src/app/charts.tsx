/** Minimal SVG charts — Bevel-school: thin, smooth, quiet. */
import { useId } from 'react'

export function Bars({
  data,
  accentVar,
  height = 92,
}: {
  data: { label: string; value: number }[]
  accentVar: string
  height?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const w = 100 / data.length
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 6)
          return (
            <rect
              key={i}
              x={i * w + w * 0.22}
              y={height - h}
              width={w * 0.56}
              height={Math.max(h, d.value > 0 ? 2.5 : 0)}
              rx="2.5"
              fill={accentVar}
              opacity={d.value > 0 ? 0.55 + 0.4 * (d.value / max) : 0}
            />
          )
        })}
      </svg>
      <div className="chart-labels">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

/** Catmull-Rom → cubic bézier for a calm, continuous line. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

export function Line({
  values,
  accentVar,
  height = 76,
}: {
  values: number[]
  accentVar: string
  height?: number
}) {
  const gid = useId().replace(/:/g, '')
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 96 + 2
    const y = height - 9 - ((v - min) / span) * (height - 18)
    return [x, y] as const
  })
  const path = smoothPath(pts)
  const last = pts[pts.length - 1]
  const area = `${path} L ${last[0].toFixed(1)} ${height} L ${pts[0][0].toFixed(1)} ${height} Z`
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={`lg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentVar} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accentVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length >= 2 && <path d={area} fill={`url(#lg-${gid})`} />}
      <path d={path} fill="none" stroke={accentVar} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={accentVar} />
      <circle cx={last[0]} cy={last[1]} r="4.6" fill="none" stroke={accentVar} strokeWidth="1" opacity="0.45" />
    </svg>
  )
}

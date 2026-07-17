/** Minimal SVG charts — no dependency, themed via CSS variables. */

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
              x={i * w + w * 0.18}
              y={height - h}
              width={w * 0.64}
              height={Math.max(h, d.value > 0 ? 2 : 0)}
              rx="1.5"
              fill={accentVar}
              opacity={0.4 + 0.6 * (d.value / max)}
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

export function Line({
  values,
  accentVar,
  height = 76,
}: {
  values: number[]
  accentVar: string
  height?: number
}) {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 96 + 2
    const y = height - 8 - ((v - min) / span) * (height - 16)
    return [x, y] as const
  })
  const path = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polyline points={path} fill="none" stroke={accentVar} strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.7" fill={accentVar} />
      ))}
      <circle cx={last[0]} cy={last[1]} r="3" fill="none" stroke={accentVar} strokeWidth="1" />
    </svg>
  )
}

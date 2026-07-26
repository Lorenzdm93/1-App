/**
 * The house chart. One bar component for the whole app — GHISA volume, the
 * Profile ledger, the engine's week-by-week — so axes, spacing, and motion
 * are identical everywhere.
 *
 * The premium grammar (the Whoop/Hevy school):
 *  - a faint full-height rail behind every bar, so empty periods still read
 *  - gradient bars with soft-rounded tops
 *  - at most `maxLabels` axis labels, first and last always present, evenly
 *    spaced — labels can never collide again
 *  - a rolling-mean trend line drawn over the bars with an endpoint dot: the
 *    direction of travel at a glance
 */
import { useRef } from 'react'

/** Evenly spaced label indices including both ends. */
export function pickLabels(n: number, k = 5): Set<number> {
  if (n <= k) return new Set(Array.from({ length: n }, (_, i) => i))
  const out = new Set<number>()
  for (let i = 0; i < k; i++) out.add(Math.round((i * (n - 1)) / (k - 1)))
  return out
}

function rollingMean(vals: number[], w = 3): number[] {
  return vals.map((_, i) => {
    const a = Math.max(0, i - Math.floor(w / 2))
    const b = Math.min(vals.length, a + w)
    const slice = vals.slice(Math.max(0, b - w), b)
    return slice.reduce((x, y) => x + y, 0) / slice.length
  })
}

/** Quadratic-midpoint smoothing — cheap, stable, no overshoot. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    d += ` Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`
  }
  const last = pts[pts.length - 1]
  d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`
  return d
}

export function Bars({
  data,
  accentVar,
  height = 92,
  trend = true,
  maxLabels = 5,
  goodAt,
  ariaLabel = 'Bar chart',
}: {
  data: { label: string; value: number }[]
  accentVar: string
  height?: number
  /** Rolling-mean trend line over the bars (needs ≥4 points). */
  trend?: boolean
  maxLabels?: number
  /** Values at or above this render in the "good" tint (won weeks). */
  goodAt?: number
  ariaLabel?: string
}) {
  const gid = useRef('cb' + Math.random().toString(36).slice(2, 8)).current
  const W = 320
  const H = height
  const pad = { t: 8, b: 16, l: 3, r: 3 }
  const plotH = H - pad.t - pad.b
  const n = Math.max(1, data.length)
  const max = Math.max(1, ...data.map((d) => d.value))
  const iw = (W - pad.l - pad.r) / n
  const bw = Math.min(24, iw * 0.6)
  const labels = pickLabels(data.length, maxLabels)
  const cx = (i: number) => pad.l + i * iw + iw / 2
  const trendPts = trend && data.length >= 4
    ? rollingMean(data.map((d) => d.value)).map((v, i) => ({ x: cx(i), y: pad.t + plotH * (1 - v / max) }))
    : null
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="cbar"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentVar} stopOpacity="0.95" />
          <stop offset="100%" stopColor={accentVar} stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={gid + 'g'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--good, #4E9E86)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--good, #4E9E86)" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const x = pad.l + i * iw + (iw - bw) / 2
        const h = Math.max(d.value > 0 ? 3 : 0, plotH * (d.value / max))
        const good = goodAt !== undefined && d.value >= goodAt
        return (
          <g key={i}>
            <rect x={x} y={pad.t} width={bw} height={plotH} rx={4.5} fill={accentVar} opacity={0.07} />
            {h > 0 && (
              <rect
                x={x}
                y={pad.t + plotH - h}
                width={bw}
                height={h}
                rx={4.5}
                fill={`url(#${gid}${good ? 'g' : ''})`}
                opacity={goodAt !== undefined && !good ? 0.45 : 1}
                className="cbar-bar"
                style={{ animationDelay: `${Math.min(i * 18, 420)}ms` }}
              />
            )}
          </g>
        )
      })}
      {trendPts && (
        <>
          <path
            d={smoothPath(trendPts)}
            fill="none"
            stroke={accentVar}
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="cbar-trend"
          />
          <circle
            cx={trendPts[trendPts.length - 1].x}
            cy={trendPts[trendPts.length - 1].y}
            r={3}
            fill={accentVar}
            stroke="var(--bg, #0c0d10)"
            strokeWidth={1.5}
          />
        </>
      )}
      {data.map((d, i) =>
        labels.has(i) ? (
          <text key={'t' + i} x={cx(i)} y={H - 3.5} textAnchor="middle" className="cbar-lbl">
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}

/** The house sparkline — CALIBER progressions and any small trend. Same
    grammar as Bars: smooth line, soft area, endpoint dot. No axes. */
export function Line({
  values,
  accentVar,
  height = 64,
  ariaLabel = 'Trend',
}: {
  values: number[]
  accentVar: string
  height?: number
  ariaLabel?: string
}) {
  const gid = useRef('cl' + Math.random().toString(36).slice(2, 8)).current
  const W = 320
  const H = height
  const pad = { t: 6, b: 6, l: 4, r: 6 }
  if (values.length < 2) {
    return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="cbar" role="img" aria-label={ariaLabel} />
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => ({
    x: pad.l + (i * (W - pad.l - pad.r)) / (values.length - 1),
    y: pad.t + (H - pad.t - pad.b) * (1 - (v - min) / span),
  }))
  const d = smoothPath(pts)
  const last = pts[pts.length - 1]
  const area = `${d} L${last.x.toFixed(1)},${H - pad.b} L${pts[0].x.toFixed(1)},${H - pad.b} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="cbar" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentVar} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accentVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={accentVar} strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="cbar-trend" />
      <circle cx={last.x} cy={last.y} r={3} fill={accentVar} stroke="var(--bg, #0c0d10)" strokeWidth={1.5} />
    </svg>
  )
}

/** The house area chart — smooth progression with soft fill, endpoint value,
    and the same ≤5 horizontal labels as Bars. No rotated text, ever. */
export function AreaLine({
  data,
  accentVar,
  height = 160,
  fmt,
  ariaLabel = 'Progression',
}: {
  data: { label: string; value: number }[]
  accentVar: string
  height?: number
  fmt?: (v: number) => string
  ariaLabel?: string
}) {
  const gid = useRef('ca' + Math.random().toString(36).slice(2, 8)).current
  const W = 320
  const H = height
  const pad = { t: 16, b: 18, l: 6, r: 10 }
  if (data.length < 2) {
    return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="cbar" role="img" aria-label={ariaLabel} />
  }
  const vals = data.map((d) => d.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const pts = data.map((d, i) => ({
    x: pad.l + (i * (W - pad.l - pad.r)) / (data.length - 1),
    y: pad.t + (H - pad.t - pad.b) * (1 - (d.value - min) / span),
  }))
  const d = smoothPath(pts)
  const last = pts[pts.length - 1]
  const area = `${d} L${last.x.toFixed(1)},${H - pad.b} L${pts[0].x.toFixed(1)},${H - pad.b} Z`
  const lastVal = data[data.length - 1].value
  const valTxt = fmt ? fmt(lastVal) : String(Math.round(lastVal * 10) / 10)
  const labels = pickLabels(data.length, 5)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="cbar" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentVar} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accentVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={accentVar} strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="cbar-trend" />
      <circle cx={last.x} cy={last.y} r={3.2} fill={accentVar} stroke="var(--bg, #0c0d10)" strokeWidth={1.5} />
      <text x={Math.min(last.x, W - pad.r - 2)} y={Math.max(10, last.y - 8)} textAnchor="end" className="cbar-val tnum">{valTxt}</text>
      {data.map((dd, i) =>
        labels.has(i) ? (
          <text key={'t' + i} x={pts[i].x} y={H - 3.5} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="cbar-lbl">
            {dd.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}

/** Several modules, one frame: thin smooth lines in each module's accent,
    a dashed guide at 100 (the bar every week tries to clear), gaps honored.
    Same label rules as everything else. */
export function MultiLine({
  series,
  labels,
  height = 140,
  ariaLabel = 'Module progress',
}: {
  series: { id: string; label: string; color: string; values: (number | null)[] }[]
  labels: string[]
  height?: number
  ariaLabel?: string
}) {
  const W = 320
  const H = height
  const pad = { t: 10, b: 18, l: 6, r: 8 }
  const n = labels.length
  if (n < 2 || series.length === 0) {
    return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="cbar" role="img" aria-label={ariaLabel} />
  }
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  const lo = Math.min(100, ...all)
  const hi = Math.max(100, ...all)
  const span = hi - lo || 1
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (n - 1)
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / span)
  const guideY = y(100)
  const lblIdx = pickLabels(n, 5)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="cbar" role="img" aria-label={ariaLabel}>
      <line x1={pad.l} y1={guideY} x2={W - pad.r} y2={guideY} stroke="var(--faint)" strokeWidth={1} strokeDasharray="3 5" opacity={0.55} vectorEffect="non-scaling-stroke" />
      <text x={W - pad.r} y={Math.max(9, guideY - 4)} textAnchor="end" className="cbar-lbl">100</text>
      {series.map((s) => {
        /* split around nulls so gaps stay gaps */
        const runs: { x: number; y: number }[][] = []
        let cur: { x: number; y: number }[] = []
        s.values.forEach((v, i) => {
          if (v === null) {
            if (cur.length > 1) runs.push(cur)
            cur = []
          } else {
            cur.push({ x: x(i), y: y(v) })
          }
        })
        if (cur.length > 1) runs.push(cur)
        const lastRun = runs[runs.length - 1]
        const end = lastRun ? lastRun[lastRun.length - 1] : null
        return (
          <g key={s.id}>
            {runs.map((r, k) => (
              <path key={k} d={smoothPath(r)} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.92} />
            ))}
            {end && <circle cx={end.x} cy={end.y} r={2.4} fill={s.color} stroke="var(--bg, #0c0d10)" strokeWidth={1.2} />}
          </g>
        )
      })}
      {labels.map((l, i) =>
        lblIdx.has(i) ? (
          <text key={'t' + i} x={x(i)} y={H - 3.5} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="cbar-lbl">{l}</text>
        ) : null,
      )}
    </svg>
  )
}

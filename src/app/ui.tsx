import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useStore } from '../core/hooks'
import { toastStore } from '../core/toast'
import type { ModuleDefinition } from '../core/types'

/* ---------- primitives ---------- */

export function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      className={'toggle' + (on ? ' on' : '')}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
    />
  )
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={o.id === value}
          className={o.id === value ? 'on' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="flabel">{label}</span>
      {children}
    </div>
  )
}

/** Accepts both '82.5' and '82,5' — German keyboards send decimal commas. */
export function parseNum(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/* ---------- sheet (custom modal — native dialogs are banned) ---------- */

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="grab" />
        <button className="sheet-x" onClick={onClose} aria-label="Close">✕</button>
        <div className="sheet-title">{title}</div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}

/** Two-step confirmation rendered as a sheet. */
export function ConfirmSheet({
  open,
  title,
  body,
  actionLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  actionLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <p style={{ color: 'var(--dim)', fontSize: 14, marginBottom: 16 }}>{body}</p>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {actionLabel}
        </button>
      </div>
    </Sheet>
  )
}

/* ---------- insight stat box ---------- */

/** Small aggregate tile used by module insight grids. `delta` renders a ▲/▼ vs the previous period. */
export function StatBox({
  label,
  value,
  sub,
  delta,
}: {
  label: string
  value: string
  sub?: string
  delta?: number | null
}) {
  return (
    <div className="ins-box">
      <div className="v num">{value}</div>
      <div className="k">{label}</div>
      {sub !== undefined && <div className="s">{sub}</div>}
      {delta !== undefined && delta !== null && Number.isFinite(delta) && (
        <div className={'d num ' + (delta >= 0 ? 'up' : 'down')}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}%
        </div>
      )}
      {delta === null && <div className="d new">new</div>}
    </div>
  )
}

/* ---------- toast host (pointer-events: none, always) ---------- */

export function ToastHost() {
  const t = useStore(toastStore)
  return <div className="toast-host">{t && <div className="toast" key={t.id}>{t.message}</div>}</div>
}

/* ---------- the signature: 1% ring ---------- */

/**
 * Outer hairline "day track" carrying a literal 1%-of-circumference ember
 * notch at twelve o'clock — the brand mark. Inner ring is split into equal
 * arcs, one per enabled module, lit in the module accent once it has
 * contributed an event today.
 */
export function OnePercentRing({
  size = 190,
  modules,
  activeIds,
  children,
}: {
  size?: number
  modules: ModuleDefinition[]
  activeIds: Set<string>
  children?: ReactNode
}) {
  const cx = size / 2
  const trackR = size / 2 - 3
  const trackC = 2 * Math.PI * trackR
  const notch = trackC * 0.01

  const stroke = 10
  const segR = size / 2 - 14
  const segC = 2 * Math.PI * segR
  const n = modules.length
  const gap = n > 1 ? 12 : 0
  const segLen = n > 0 ? (segC - n * gap) / n : 0

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          {/* day track */}
          <circle cx={cx} cy={cx} r={trackR} fill="none" stroke="var(--line)" strokeWidth="1.5" />
          {/* the 1% notch */}
          <circle
            cx={cx}
            cy={cx}
            r={trackR}
            fill="none"
            stroke="var(--ember)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${notch} ${trackC - notch}`}
            strokeDashoffset={notch / 2}
          />
          {/* module segments */}
          {modules.map((m, i) => (
            <circle
              key={m.id}
              cx={cx}
              cy={cx}
              r={segR}
              fill="none"
              stroke={m.accentVar}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(segLen, 0)} ${segC - Math.max(segLen, 0)}`}
              strokeDashoffset={-(i * (segLen + gap))}
              opacity={activeIds.has(m.id) ? 1 : 0.16}
            />
          ))}
        </g>
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

/* ---------- misc ---------- */

export function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="empty">
      <b>{title}</b>
      {sub}
    </div>
  )
}

export function Chevron() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Standardized quick-action chip — modules render these in their QuickActions slot. */
export function ActionChip({
  label,
  accentVar,
  onClick,
}: {
  label: string
  accentVar?: string
  onClick: () => void
}) {
  const style = accentVar ? ({ ['--chip-accent' as string]: accentVar } as CSSProperties) : undefined
  return (
    <button className="action-chip" style={style} onClick={onClick}>
      {label}
    </button>
  )
}

/** Local state helper for controlled numeric text inputs. */
export function useNumField(initial: string) {
  const [raw, setRaw] = useState(initial)
  return { raw, setRaw, value: parseNum(raw) }
}

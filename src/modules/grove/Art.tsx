/**
 * GROVE art — the prototype's plant and animal silhouettes, rebuilt with
 * depth: split-lit faces on pine tiers, radial-lit canopies with rim light,
 * gradient trunks, soft contact shadows. All colors flow through --gv-*
 * custom properties, so dark theme reads prototype-exact and light theme
 * maps onto app tokens.
 *
 * Geometry contract (from the prototype): every plant lives in a 30×46 box,
 * ground line y=46, growth p ∈ [0,1] scales from origin (15,46) as
 * 0.18 + 0.82p, canopy opacity fades in over p 0.22→0.57.
 */
import type { PlantKind } from './model'

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** Shared gradient definitions. Render ONCE per <svg>, pass the same prefix to inners. */
export function ArtDefs({ prefix }: { prefix: string }) {
  const id = (n: string) => `${prefix}-${n}`
  return (
    <defs>
      {/* foliage */}
      <linearGradient id={id('pineL')} x1="0" y1="0" x2="1" y2="0.2">
        <stop offset="0%" stopColor="var(--gv-leaf-hi)" />
        <stop offset="100%" stopColor="var(--gv-leaf1)" />
      </linearGradient>
      <linearGradient id={id('pineR')} x1="0" y1="0" x2="1" y2="0.15">
        <stop offset="0%" stopColor="var(--gv-leaf2)" />
        <stop offset="100%" stopColor="var(--gv-leaf-lo)" />
      </linearGradient>
      <radialGradient id={id('canopy')} cx="0.36" cy="0.3" r="0.85">
        <stop offset="0%" stopColor="var(--gv-leaf-hi)" />
        <stop offset="55%" stopColor="var(--gv-leaf1)" />
        <stop offset="100%" stopColor="var(--gv-leaf-lo)" />
      </radialGradient>
      <radialGradient id={id('canopy2')} cx="0.38" cy="0.32" r="0.9">
        <stop offset="0%" stopColor="var(--gv-leaf1)" />
        <stop offset="100%" stopColor="var(--gv-leaf2)" />
      </radialGradient>
      <radialGradient id={id('birchC')} cx="0.4" cy="0.3" r="0.9">
        <stop offset="0%" stopColor="var(--gv-leaf3)" />
        <stop offset="70%" stopColor="var(--gv-leaf1)" />
        <stop offset="100%" stopColor="var(--gv-leaf2)" />
      </radialGradient>
      {/* trunks */}
      <linearGradient id={id('trunk')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--gv-bark-hi)" />
        <stop offset="55%" stopColor="var(--gv-bark)" />
        <stop offset="100%" stopColor="var(--gv-bark-lo)" />
      </linearGradient>
      <linearGradient id={id('birchT')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--gv-barklight-hi)" />
        <stop offset="60%" stopColor="var(--gv-barklight)" />
        <stop offset="100%" stopColor="var(--gv-barklight-lo)" />
      </linearGradient>
      {/* animals */}
      <radialGradient id={id('furLight')} cx="0.35" cy="0.3" r="0.95">
        <stop offset="0%" stopColor="var(--gv-barklight-hi)" />
        <stop offset="100%" stopColor="var(--gv-barklight)" />
      </radialGradient>
      <radialGradient id={id('furFox')} cx="0.35" cy="0.3" r="0.95">
        <stop offset="0%" stopColor="var(--gv-fox-hi)" />
        <stop offset="100%" stopColor="var(--gv-fox)" />
      </radialGradient>
      <radialGradient id={id('furDeer')} cx="0.35" cy="0.3" r="0.95">
        <stop offset="0%" stopColor="var(--gv-deer-hi)" />
        <stop offset="100%" stopColor="var(--gv-deer)" />
      </radialGradient>
      <radialGradient id={id('furBear')} cx="0.35" cy="0.3" r="0.95">
        <stop offset="0%" stopColor="var(--gv-bear-hi)" />
        <stop offset="100%" stopColor="var(--gv-bear)" />
      </radialGradient>
      <radialGradient id={id('furOwl')} cx="0.35" cy="0.3" r="0.95">
        <stop offset="0%" stopColor="var(--gv-owl-hi)" />
        <stop offset="100%" stopColor="var(--gv-owl)" />
      </radialGradient>
    </defs>
  )
}

/* ------------------------------ plants ------------------------------ */

export function PlantInner({ kind, p, prefix }: { kind: PlantKind; p: number; prefix: string }) {
  const u = (n: string) => `url(#${prefix}-${n})`
  const cOp = clamp01((p - 0.22) / 0.35)

  if (kind === 'pine') {
    // three tiers, each split into a lit left face and a shaded right face
    const tier = (ax: number, ay: number, lx: number, rx: number, by: number, k: string) => (
      <g key={k}>
        <polygon points={`${ax},${ay} ${lx},${by} 15,${by}`} fill={u('pineL')} />
        <polygon points={`${ax},${ay} 15,${by} ${rx},${by}`} fill={u('pineR')} />
      </g>
    )
    return (
      <>
        <rect x="13.4" y="33" width="3.2" height="13" rx="1" fill={u('trunk')} />
        <g opacity={cOp}>
          {tier(15, 20, 3.5, 26.5, 36, 't1')}
          {tier(15, 12, 5.5, 24.5, 27, 't2')}
          {tier(15, 5, 7.5, 22.5, 18, 't3')}
          <path d="M15 5 L9.6 15.4" stroke="var(--gv-leaf-hi)" strokeWidth="0.9" opacity="0.55" fill="none" />
        </g>
      </>
    )
  }

  if (kind === 'oak') {
    return (
      <>
        <rect x="13" y="27" width="4" height="19" rx="1.4" fill={u('trunk')} />
        <path d="M13.6 33 C12 35.5 10.8 36.4 9.6 37" stroke="var(--gv-bark-lo)" strokeWidth="1" fill="none" opacity="0.7" />
        <g opacity={cOp}>
          <circle cx="8.5" cy="22" r="6.5" fill={u('canopy2')} />
          <circle cx="21.5" cy="22" r="6.5" fill={u('canopy2')} />
          <circle cx="15" cy="22.5" r="7" fill="var(--gv-leaf2)" />
          <circle cx="15" cy="15.5" r="9" fill={u('canopy')} />
          <path d="M8.4 11.2 A9 9 0 0 1 15 6.6" stroke="var(--gv-leaf-rim)" strokeWidth="1.1" fill="none" opacity="0.7" strokeLinecap="round" />
          <ellipse cx="15" cy="27.5" rx="10.5" ry="3" fill="var(--gv-leaf-lo)" opacity="0.35" />
        </g>
      </>
    )
  }

  if (kind === 'birch') {
    return (
      <>
        <rect x="13.9" y="22" width="2.4" height="24" rx="1.1" fill={u('birchT')} />
        <rect x="13.9" y="30" width="2.4" height="1.6" fill="var(--gv-bg)" opacity="0.55" />
        <rect x="13.9" y="37" width="2.4" height="1.6" fill="var(--gv-bg)" opacity="0.55" />
        <g opacity={cOp}>
          <ellipse cx="15" cy="15" rx="8" ry="11" fill={u('birchC')} />
          <ellipse cx="15" cy="18.5" rx="6.4" ry="7" fill="var(--gv-leaf2)" opacity="0.35" />
          <path d="M9.4 9.4 A8 11 0 0 1 15 4.2" stroke="var(--gv-leaf-rim)" strokeWidth="1" fill="none" opacity="0.65" strokeLinecap="round" />
        </g>
      </>
    )
  }

  if (kind === 'fern') {
    return (
      <g opacity={Math.max(0.35, cOp)} strokeLinecap="round" fill="none">
        <path d="M15 46 C15 38 9 34 4 33" stroke="var(--gv-leaf2)" strokeWidth="2.4" />
        <path d="M15 46 C15 36 21 32 26 31" stroke="var(--gv-leaf1)" strokeWidth="2.4" />
        <path d="M15 46 C14 34 12 30 8 26" stroke="var(--gv-leaf1)" strokeWidth="2.2" />
        <path d="M15 46 C16 34 18 29 22 25" stroke="var(--gv-leaf3)" strokeWidth="2.2" />
        <path d="M15 46 C15 34 15 28 15 23" stroke="var(--gv-leaf2)" strokeWidth="2.4" />
      </g>
    )
  }

  if (kind === 'flower') {
    return (
      <g opacity={Math.max(0.35, cOp)}>
        <path d="M9 46 C9 41 8.4 38.5 8 37" stroke="var(--gv-leaf2)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M15 46 C15 40 15 37 15 34" stroke="var(--gv-leaf1)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M21 46 C21 42 21.6 39.5 22 38" stroke="var(--gv-leaf2)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="8" cy="35.5" r="2.6" fill="var(--gv-petal2)" />
        <circle cx="15" cy="32.5" r="3" fill="var(--gv-petal1)" />
        <circle cx="22" cy="36.5" r="2.6" fill="var(--gv-petal3)" />
        <circle cx="8" cy="35.5" r="1" fill="var(--gv-bg)" opacity="0.5" />
        <circle cx="15" cy="32.5" r="1.1" fill="var(--gv-bg)" opacity="0.5" />
        <circle cx="22" cy="36.5" r="1" fill="var(--gv-bg)" opacity="0.5" />
      </g>
    )
  }

  /* shrub */
  return (
    <g opacity={Math.max(0.35, cOp)}>
      <circle cx="9.5" cy="39" r="6.5" fill={u('canopy2')} />
      <circle cx="20.5" cy="39" r="7" fill={u('canopy')} />
      <circle cx="15" cy="34.5" r="6.5" fill={u('birchC')} />
      <path d="M10.6 30.4 A6.5 6.5 0 0 1 15 28" stroke="var(--gv-leaf-rim)" strokeWidth="0.9" fill="none" opacity="0.6" strokeLinecap="round" />
    </g>
  )
}

/** Standalone plant sprite (today's grove strip, widget) — carries its own defs. */
export function PlantSprite({ kind, p = 1, h = 46, title, prefix }: {
  kind: PlantKind
  p?: number
  h?: number
  title?: string
  prefix: string
}) {
  const w = Math.round(h * 0.68)
  const s = 0.18 + 0.82 * clamp01(p)
  return (
    <svg viewBox="0 0 30 46" width={w} height={h} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <ArtDefs prefix={prefix} />
      <g style={{ transform: `scale(${s.toFixed(3)})`, transformOrigin: '15px 46px' }}>
        <PlantInner kind={kind} p={p} prefix={prefix} />
      </g>
    </svg>
  )
}

/* ------------------------------ animals ------------------------------ */

export type AnimalId = 'rabbit' | 'fox' | 'deer' | 'bear' | 'owl'

export function AnimalInner({ id, prefix }: { id: AnimalId; prefix: string }) {
  const u = (n: string) => `url(#${prefix}-${n})`
  if (id === 'rabbit') {
    return (
      <>
        <ellipse cx="10" cy="10" rx="6" ry="4.4" fill={u('furLight')} />
        <circle cx="16.5" cy="7.5" r="3.2" fill={u('furLight')} />
        <path d="M15.5 5 C15 1.5 16 .2 16.8 .5 C17.6 .8 17.4 3.4 17.2 5 Z" fill={u('furLight')} />
        <path d="M18 5 C18.2 1.8 19.3 .6 20 1 C20.7 1.4 19.9 4 19.4 5.4 Z" fill={u('furLight')} />
        <path d="M16 4.4 C15.8 2.6 16.2 1.4 16.7 1.2" stroke="var(--gv-petal2)" strokeWidth="0.8" fill="none" opacity="0.6" strokeLinecap="round" />
        <circle cx="4.6" cy="8.6" r="1.7" fill={u('furLight')} />
        <ellipse cx="9" cy="12.6" rx="4" ry="1.4" fill="var(--gv-barklight-lo)" opacity="0.5" />
        <circle cx="17.6" cy="7" r="0.55" fill="var(--gv-ink-dot)" />
      </>
    )
  }
  if (id === 'fox') {
    return (
      <>
        <path d="M3 10 C5 6.5 12 6 15 7.5 L19 5.5 L18.6 9 C19.6 10 19.4 11.6 17.8 12.4 C13 14.6 6 13.8 3 10 Z" fill={u('furFox')} />
        <path d="M19 5.5 L20.8 3.4 L20.6 6.4 Z" fill="var(--gv-fox)" />
        <path d="M2.8 10.2 C.6 9.4 -.2 11.4 1.4 12.6 C2.6 13.5 4.4 13 4.8 12 Z" fill={u('furFox')} />
        <path d="M1 12.4 L3 12.9 L2.2 13.6 Z" fill="var(--gv-cream)" />
        <path d="M15.4 12.6 C13 13.6 9.4 13.7 6.8 13" stroke="var(--gv-cream)" strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />
        <circle cx="18.2" cy="7.4" r="0.55" fill="var(--gv-ink-dot)" />
      </>
    )
  }
  if (id === 'deer') {
    return (
      <>
        <ellipse cx="10" cy="9" rx="6.2" ry="3.6" fill={u('furDeer')} />
        <rect x="5.4" y="11.5" width="1.5" height="5" rx="0.7" fill="var(--gv-deer)" />
        <rect x="12.6" y="11.5" width="1.5" height="5" rx="0.7" fill="var(--gv-deer-lo)" />
        <path d="M15.5 8 L18.4 4.6" stroke="var(--gv-deer)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="19.2" cy="3.6" r="2.4" fill={u('furDeer')} />
        <path d="M19.6 1.8 C19.2 .4 20 -.4 20.6 0 M20.8 2.4 C21.8 1.4 22.6 1.8 22.4 2.8" stroke="var(--gv-antler)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <ellipse cx="9" cy="7.6" rx="2.6" ry="1.1" fill="var(--gv-cream)" opacity="0.35" />
        <circle cx="20" cy="3.2" r="0.5" fill="var(--gv-ink-dot)" />
      </>
    )
  }
  if (id === 'bear') {
    return (
      <>
        <ellipse cx="10.5" cy="9.5" rx="8" ry="5.4" fill={u('furBear')} />
        <circle cx="18.8" cy="6.6" r="3.6" fill={u('furBear')} />
        <circle cx="17" cy="3.6" r="1.3" fill="var(--gv-bear)" />
        <circle cx="20.8" cy="3.8" r="1.3" fill="var(--gv-bear)" />
        <rect x="4.5" y="13" width="2.4" height="3.6" rx="1" fill="var(--gv-bear)" />
        <rect x="13" y="13" width="2.4" height="3.6" rx="1" fill="var(--gv-bear-lo)" />
        <ellipse cx="9" cy="6.8" rx="3.4" ry="1.5" fill="var(--gv-bear-hi)" opacity="0.4" />
        <circle cx="20" cy="6.4" r="0.6" fill="var(--gv-ink-dot)" />
      </>
    )
  }
  /* owl */
  return (
    <>
      <ellipse cx="11" cy="9" rx="5.4" ry="6.4" fill={u('furOwl')} />
      <path d="M6.4 4.2 L8.2 6 M15.6 4.2 L13.8 6" stroke="var(--gv-owl)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 12.6 C9.6 13.8 12.4 13.8 14 12.6" stroke="var(--gv-owl-lo)" strokeWidth="1" fill="none" opacity="0.6" strokeLinecap="round" />
      <circle cx="8.8" cy="7.4" r="2" fill="var(--gv-cream)" />
      <circle cx="13.2" cy="7.4" r="2" fill="var(--gv-cream)" />
      <circle cx="8.8" cy="7.4" r="0.8" fill="var(--gv-ink-dot)" />
      <circle cx="13.2" cy="7.4" r="0.8" fill="var(--gv-ink-dot)" />
      <path d="M11 9 L10 10.6 L12 10.6 Z" fill="var(--gv-petal1)" />
    </>
  )
}

/** Standalone animal sprite (companion badges) — carries its own defs. */
export function AnimalSprite({ id, prefix, w = 18, h = 14 }: { id: AnimalId; prefix: string; w?: number; h?: number }) {
  return (
    <svg viewBox="0 0 23 17" width={w} height={h} aria-hidden="true">
      <ArtDefs prefix={prefix} />
      <AnimalInner id={id} prefix={prefix} />
    </svg>
  )
}

import type { PlantKind } from './model'

/**
 * The forest's inhabitants — hand-tuned little SVGs. `size` is the box edge;
 * `sway` staggers the idle animation so the grove breathes instead of marching.
 */
export default function PlantSVG({
  kind,
  size,
  sway = 0,
}: {
  kind: PlantKind
  size: number
  sway?: number
}) {
  const style = { animationDelay: `${sway}s` }
  switch (kind) {
    case 'shrub':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" className="gv-plant" style={style}>
          <ellipse cx="20" cy="35" rx="11" ry="3" fill="rgba(0,0,0,0.25)" />
          <circle cx="14" cy="27" r="7.5" fill="#4a6b4f" />
          <circle cx="24" cy="25" r="8.5" fill="#557a58" />
          <circle cx="19" cy="30" r="7" fill="#3f5c44" />
        </svg>
      )
    case 'birch':
      return (
        <svg width={size} height={size} viewBox="0 0 40 52" className="gv-plant" style={style}>
          <ellipse cx="20" cy="48" rx="10" ry="2.6" fill="rgba(0,0,0,0.25)" />
          <rect x="18.6" y="26" width="2.8" height="21" rx="1.2" fill="#cfc7b4" />
          <rect x="18.6" y="30" width="2.8" height="2" fill="#6b6455" />
          <rect x="18.6" y="37" width="2.8" height="2" fill="#6b6455" />
          <ellipse cx="20" cy="18" rx="10" ry="13" fill="#6f9a68" />
          <ellipse cx="16" cy="14" rx="5" ry="6" fill="#83ad78" />
        </svg>
      )
    case 'pine':
      return (
        <svg width={size} height={size} viewBox="0 0 40 56" className="gv-plant" style={style}>
          <ellipse cx="20" cy="52" rx="10" ry="2.8" fill="rgba(0,0,0,0.25)" />
          <rect x="18.4" y="42" width="3.2" height="9" rx="1.2" fill="#6b4f3a" />
          <path d="M20 4 30 22H10z" fill="#3e6b4f" />
          <path d="M20 14 32 34H8z" fill="#345c44" />
          <path d="M20 26 34 46H6z" fill="#2c4f3a" />
        </svg>
      )
    case 'oak':
      return (
        <svg width={size} height={size} viewBox="0 0 48 58" className="gv-plant" style={style}>
          <ellipse cx="24" cy="54" rx="13" ry="3" fill="rgba(0,0,0,0.25)" />
          <path d="M22 34c-1 6-1 12-1 19h6c0-7 0-13-1-19z" fill="#5d4632" />
          <path d="M24 34c-4-2-9-2-12-6 2 1 5 1 7-1-5-1-9-5-10-10 3 3 6 4 9 3-3-3-4-7-3-11 2 4 5 6 8 7 0-3 1-6 3-8 2 2 3 5 3 8 3-1 6-3 8-7 1 4 0 8-3 11 3 1 6 0 9-3-1 5-5 9-10 10 2 2 5 2 7 1-3 4-8 4-12 6z" fill="#4d7a52" />
          <circle cx="17" cy="20" r="5" fill="#5c8a5e" />
          <circle cx="30" cy="18" r="6" fill="#568355" />
          <circle cx="24" cy="13" r="5" fill="#649267" />
        </svg>
      )
    case 'flower':
      return (
        <svg width={size} height={size} viewBox="0 0 32 36" className="gv-plant" style={style}>
          <ellipse cx="16" cy="33" rx="6" ry="1.8" fill="rgba(0,0,0,0.22)" />
          <path d="M16 20v12" stroke="#4f7a52" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 26c-3 0-5-2-5-4 3 0 5 2 5 4z" fill="#5c8a5e" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="16" cy="11" rx="3.4" ry="5" fill="#d9a24f" transform={`rotate(${a} 16 15)`} />
          ))}
          <circle cx="16" cy="15" r="3" fill="#b3701e" />
        </svg>
      )
    case 'fern':
      return (
        <svg width={size} height={size} viewBox="0 0 36 40" className="gv-plant" style={style}>
          <ellipse cx="18" cy="37" rx="8" ry="2.2" fill="rgba(0,0,0,0.22)" />
          {[-28, -10, 8, 26].map((a, i) => (
            <path
              key={a}
              d="M18 36C18 24 18 16 18 8"
              stroke={i % 2 ? '#4f7a52' : '#5c8a5e'}
              strokeWidth="2.6"
              strokeLinecap="round"
              transform={`rotate(${a} 18 36)`}
            />
          ))}
          {[-28, -10, 8, 26].map((a) =>
            [12, 18, 24].map((y) => (
              <g key={a + '-' + y} transform={`rotate(${a} 18 36)`}>
                <path d={`M18 ${y}l-4 -2`} stroke="#6d9a6e" strokeWidth="1.6" strokeLinecap="round" />
                <path d={`M18 ${y}l4 -2`} stroke="#6d9a6e" strokeWidth="1.6" strokeLinecap="round" />
              </g>
            )),
          )}
        </svg>
      )
  }
}

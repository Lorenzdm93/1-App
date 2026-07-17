import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { toast } from '../../core/toast'
import { Seg, Field, parseNum } from '../../app/ui'
import {
  LIFTS,
  LEVELS,
  STANDARDS,
  epley,
  brzycki,
  e1rm,
  levelFor,
  percentileFor,
  repsForTarget,
  weightForTarget,
  liftById,
  type Sex,
} from './formulas'
import { caliberStore, patchCaliber, logTest } from './model'
import { Line } from '../../app/charts'

const SEX_OPTIONS = [
  { id: 'm', label: 'Male' },
  { id: 'f', label: 'Female' },
] as const

const ZONE_SHORT = ['UNT', 'BEG', 'NOV', 'INT', 'ADV', 'ELI']


/** Semicircular instrument gauge: 6 graduated zones, needle at the lifter's position. */
function Gauge({ position, lit }: { position: number; lit: number }) {
  const cx = 120
  const cy = 118
  const r = 92
  const zoneSweep = 180 / LEVELS.length
  const gapDeg = 2

  function point(deg: number, radius: number): [number, number] {
    const rad = (deg * Math.PI) / 180
    return [cx - Math.cos(rad) * radius, cy - Math.sin(rad) * radius]
  }

  function arc(fromDeg: number, toDeg: number, radius: number): string {
    const [x1, y1] = point(fromDeg, radius)
    const [x2, y2] = point(toDeg, radius)
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }

  const needleDeg = Math.min(180, Math.max(0, position * 180))
  const [nx, ny] = point(needleDeg, 66)

  return (
    <div className="cb-dial">
      <svg viewBox="0 0 240 138" aria-hidden="true">
        {LEVELS.map((name, i) => {
          const from = i * zoneSweep + (i === 0 ? 0 : gapDeg / 2)
          const to = (i + 1) * zoneSweep - (i === LEVELS.length - 1 ? 0 : gapDeg / 2)
          const isLit = i <= lit
          return (
            <path
              key={name}
              d={arc(from, to, r)}
              fill="none"
              stroke={isLit ? 'var(--m-caliber)' : 'var(--line)'}
              strokeOpacity={isLit ? 0.35 + (i / (LEVELS.length - 1)) * 0.65 : 1}
              strokeWidth="13"
              strokeLinecap="butt"
            />
          )
        })}
        {LEVELS.map((_, i) =>
          i === 0 ? null : (
            (() => {
              const [tx1, ty1] = point(i * zoneSweep, r + 9)
              const [tx2, ty2] = point(i * zoneSweep, r + 15)
              return (
                <line
                  key={'t' + i}
                  x1={tx1}
                  y1={ty1}
                  x2={tx2}
                  y2={ty2}
                  stroke="var(--faint)"
                  strokeWidth="1.4"
                />
              )
            })()
          ),
        )}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5.5" fill="var(--ink)" />
        <circle cx={cx} cy={cy} r="2.2" fill="var(--m-caliber)" />
      </svg>
    </div>
  )
}

export default function CaliberScreen() {
  const st = useStore(caliberStore)
  const [bw, setBw] = useState(String(st.bodyweight))
  const [weight, setWeight] = useState(String(st.weight))
  const [reps, setReps] = useState(String(st.reps))

  const bwN = parseNum(bw)
  const weightN = parseNum(weight)
  const repsN = parseNum(reps)

  const valid = bwN !== null && bwN > 0 && weightN !== null && weightN > 0 && repsN !== null && repsN >= 1
  const estimate = valid ? e1rm(weightN, Math.round(repsN)) : null
  const ratio = valid && estimate !== null ? estimate / bwN : null
  const level = ratio !== null ? levelFor(st.liftId, st.sex, ratio) : null

  function commitNumbers() {
    patchCaliber({
      ...(bwN !== null && bwN > 0 ? { bodyweight: bwN } : {}),
      ...(weightN !== null && weightN > 0 ? { weight: weightN } : {}),
      ...(repsN !== null && repsN >= 1 ? { reps: Math.round(repsN) } : {}),
    })
  }

  return (
    <>
      <div className="card">
        <Seg<Sex> options={SEX_OPTIONS} value={st.sex} onChange={(sex) => patchCaliber({ sex })} />
        <div className="frow">
          <Field label="Bodyweight · kg">
            <input
              className="tinput"
              inputMode="decimal"
              value={bw}
              onChange={(e) => setBw(e.target.value)}
              onBlur={commitNumbers}
            />
          </Field>
        </div>
        <div className="section-label" style={{ margin: '14px 2px 8px' }}>
          Lift
        </div>
        <div className="chips">
          {LIFTS.map((l) => (
            <button
              key={l.id}
              className={'chip' + (l.id === st.liftId ? ' on' : '')}
              style={{ ['--chip-accent' as string]: 'var(--m-caliber)' } as CSSProperties}
              onClick={() => patchCaliber({ liftId: l.id })}
            >
              {l.name}
            </button>
          ))}
        </div>
        <div className="frow" style={{ marginTop: 14 }}>
          <Field label="Weight · kg">
            <input
              className="tinput"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={commitNumbers}
            />
          </Field>
          <Field label="Reps">
            <input
              className="tinput"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              onBlur={commitNumbers}
            />
          </Field>
        </div>
      </div>

      <div className="card cb-result">
        {estimate !== null && level !== null && ratio !== null ? (
          <>
            <div className="cb-e1rm num">
              {Math.round(estimate * 2) / 2}
              <span className="u">kg</span>
            </div>
            <div className="cb-formula num">
              Epley {epley(weightN as number, Math.round(repsN as number)).toFixed(1)} · Brzycki{' '}
              {brzycki(weightN as number, Math.round(repsN as number)).toFixed(1)} · {ratio.toFixed(2)}× BW
            </div>
            <Gauge position={(level.index + level.frac) / LEVELS.length} lit={level.index} />
            <div className="cb-level">{level.name}</div>
            <div className="cb-pct num">
              Stronger than ~{percentileFor(level)}% — top {Math.max(1, 100 - percentileFor(level))}%
            </div>
            <div className="cb-zone-labels">
              {ZONE_SHORT.map((z) => (
                <span key={z}>{z}</span>
              ))}
            </div>
            {Math.round(repsN as number) > 10 && (
              <div className="cb-note">Estimates get fuzzy past 10 reps — trust heavier sets more.</div>
            )}
            <div style={{ marginTop: 16 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  commitNumbers()
                  const isPr = logTest(st.liftId, estimate)
                  toast(isPr ? 'New PR — filed.' : 'Test logged')
                }}
              >
                Log test
              </button>
            </div>
          </>
        ) : (
          <div className="empty" style={{ padding: '10px 4px' }}>
            <b>Enter a set</b>
            Bodyweight, weight and reps — the gauge does the rest.
          </div>
        )}
        <div className="cb-note">Standards are approximations calibrated per sex — a compass, not a scale.</div>
      </div>

      {bwN !== null && bwN > 0 && (
        <div className="card">
          <div className="card-head">
            <span className="label" style={{ color: 'var(--m-caliber)' }}>Target</span>
          </div>
          <div className="chips">
            {LEVELS.map((name, i) =>
              i === 0 ? null : (
                <button
                  key={name}
                  className={'chip' + (i === st.targetLevel ? ' on' : '')}
                  style={{ ['--chip-accent' as string]: 'var(--m-caliber)' } as CSSProperties}
                  onClick={() => patchCaliber({ targetLevel: i })}
                >
                  {name}
                </button>
              ),
            )}
          </div>
          {(() => {
            const ratio = STANDARDS[st.liftId][st.sex][st.targetLevel - 1]
            const targetKg = Math.round(ratio * bwN * 2) / 2
            const lift = liftById(st.liftId).name
            const reached = estimate !== null && estimate >= targetKg
            return (
              <>
                <div className="kv">
                  <span className="k">{LEVELS[st.targetLevel]} {lift}</span>
                  <span className="num">{targetKg} kg e1RM · {ratio}× BW</span>
                </div>
                {reached ? (
                  <div className="cb-target-line">Already there — this bracket is yours.</div>
                ) : (
                  <>
                    {weightN !== null && weightN > 0 && (
                      <div className="kv">
                        <span className="k">At {weightN} kg</span>
                        <span className="num">
                          {repsForTarget(weightN, targetKg) > 15
                            ? 'add weight first'
                            : `${repsForTarget(weightN, targetKg)} reps`}
                        </span>
                      </div>
                    )}
                    {repsN !== null && repsN >= 1 && (
                      <div className="kv">
                        <span className="k">At {Math.round(repsN)} reps</span>
                        <span className="num">{Math.round(weightForTarget(Math.round(repsN), targetKg) * 2) / 2} kg</span>
                      </div>
                    )}
                  </>
                )}
              </>
            )
          })()}
        </div>
      )}

      {(st.tests[st.liftId] ?? []).length >= 2 && (
        <div className="card">
          <div className="card-head">
            <span className="label" style={{ color: 'var(--m-caliber)' }}>
              {liftById(st.liftId).name} · test history
            </span>
          </div>
          <Line values={(st.tests[st.liftId] ?? []).map((t) => t.e1rm)} accentVar="var(--m-caliber)" />
          <div className="cd-heat-label num">
            {(st.tests[st.liftId] ?? []).length} tests · best {Math.max(...(st.tests[st.liftId] ?? []).map((t) => t.e1rm))} kg
          </div>
        </div>
      )}
    </>
  )
}

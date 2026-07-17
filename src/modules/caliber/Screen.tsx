import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { toast } from '../../core/toast'
import { Seg, Field, parseNum } from '../../app/ui'
import { LIFTS, LEVELS, epley, brzycki, e1rm, levelFor, type Sex } from './formulas'
import { caliberStore, patchCaliber, logTest } from './model'

const SEX_OPTIONS = [
  { id: 'm', label: 'Male' },
  { id: 'f', label: 'Female' },
] as const

const ZONE_SHORT = ['UNT', 'BEG', 'NOV', 'INT', 'ADV', 'ELI']

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
  const needlePct = level ? ((level.index + level.frac) / LEVELS.length) * 100 : 0

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
            <div className="cb-level">{level.name}</div>
            <div className="cb-gauge">
              <div className="zones">
                {LEVELS.map((name, i) => (
                  <div key={name} className={'zone' + (i <= level.index ? ' lit' : '')} />
                ))}
              </div>
              <div className="needle" style={{ left: `${needlePct}%` }} />
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
    </>
  )
}

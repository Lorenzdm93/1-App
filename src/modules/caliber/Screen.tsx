import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { toast } from '../../core/toast'
import { Seg, Field, parseNum, StatBox } from '../../app/ui'
import { Line } from '../../app/charts'
import {
  LIFTS,
  LEVELS,
  STANDARDS,
  epley,
  brzycki,
  e1rm,
  levelFor,
  percentileFor,
  confidenceFor,
  repsForTarget,
  weightForTarget,
  liftById,
  type Sex,
} from './formulas'
import { caliberStore, patchCaliber, logTest } from './model'

const ELITE_HEADROOM = 1.12 // bar extends a little past Elite so the marker never pins

/* ---------- the level bar (replaces the gauge) ---------- */

function LevelBar({
  ratio,
  thresholds,
  targetRatio,
}: {
  ratio: number
  thresholds: readonly number[]
  targetRatio: number
}) {
  const max = thresholds[thresholds.length - 1] * ELITE_HEADROOM
  const pct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100))
  return (
    <div className="cb-bar-wrap">
      <div className="cb-bar">
        <div className="cb-bar-fill" style={{ width: `${pct(ratio)}%` }} />
        {thresholds.map((t, i) => (
          <span key={i} className="cb-bar-tick" style={{ left: `${pct(t)}%` }} />
        ))}
        <span className="cb-bar-target" style={{ left: `${pct(targetRatio)}%` }} aria-label="Target" />
      </div>
      <div className="cb-bar-labels num" aria-hidden="true">
        {thresholds.map((t, i) => (
          <span key={i} style={{ left: `${pct(t)}%` }}>
            {LEVELS[i + 1][0]}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------- test tab ---------- */

function TestTab() {
  const st = useStore(caliberStore)
  const [bw, setBw] = useState(String(st.bodyweight))
  const [weight, setWeight] = useState(String(st.weight))
  const [reps, setReps] = useState(String(st.reps))

  const bwN = parseNum(bw)
  const weightN = parseNum(weight)
  const repsRaw = parseNum(reps)
  const repsN = repsRaw !== null ? Math.round(repsRaw) : null
  const valid = bwN !== null && bwN > 0 && weightN !== null && weightN > 0 && repsN !== null && repsN >= 1

  const estimate = valid ? Math.round(e1rm(weightN, repsN) * 2) / 2 : null
  const ratio = valid && estimate !== null ? estimate / bwN : null
  const level = ratio !== null ? levelFor(st.liftId, st.sex, ratio) : null
  const thresholds = STANDARDS[st.liftId][st.sex]
  const targetRatio = thresholds[st.targetLevel - 1]
  const conf = repsN !== null && repsN >= 1 ? confidenceFor(repsN) : null

  function commit(patch: Partial<{ bodyweight: number; weight: number; reps: number }>) {
    patchCaliber(patch)
  }

  return (
    <>
      <div className="card">
        <Seg<Sex>
          options={[
            { id: 'm', label: 'Male' },
            { id: 'f', label: 'Female' },
          ]}
          value={st.sex}
          onChange={(sex) => patchCaliber({ sex })}
        />
        <div className="chips" style={{ marginTop: 12 }}>
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
        <div className="cb-fields">
          <Field label="Bodyweight kg">
            <input
              className="tinput"
              inputMode="decimal"
              value={bw}
              onChange={(e) => {
                setBw(e.target.value)
                const n = parseNum(e.target.value)
                if (n !== null && n > 0) commit({ bodyweight: n })
              }}
            />
          </Field>
          <Field label="Weight kg">
            <input
              className="tinput"
              inputMode="decimal"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value)
                const n = parseNum(e.target.value)
                if (n !== null && n > 0) commit({ weight: n })
              }}
            />
          </Field>
          <Field label="Reps">
            <input
              className="tinput"
              inputMode="numeric"
              value={reps}
              onChange={(e) => {
                setReps(e.target.value)
                const n = parseNum(e.target.value)
                if (n !== null && n >= 1) commit({ reps: Math.round(n) })
              }}
            />
          </Field>
        </div>
      </div>

      {valid && estimate !== null && ratio !== null && level !== null && (
        <div className="card cb-result">
          <div className="cb-e1rm">
            <span className="v num">{estimate}</span>
            <span className="u">kg · e1RM</span>
          </div>
          <div className="cb-level">{level.name}</div>
          <div className="cb-pct num">
            Stronger than ~{percentileFor(level)}% — top {Math.max(1, 100 - percentileFor(level))}%
          </div>
          <LevelBar ratio={ratio} thresholds={thresholds} targetRatio={targetRatio} />
          {conf && (
            <div className="cb-conf">
              <span className={'dot g' + conf.grade} aria-hidden="true" />
              <span>
                <b>{conf.label} confidence</b> at {repsN} reps — {conf.note}
              </span>
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ marginTop: 14 }}
            onClick={() => {
              const pr = logTest(st.liftId, estimate)
              toast(pr ? `New ${liftById(st.liftId).name} PR — ${estimate} kg` : 'Test logged')
            }}
          >
            Log this test
          </button>
        </div>
      )}

      {valid && (
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
            const tRatio = thresholds[st.targetLevel - 1]
            const targetKg = Math.round(tRatio * (bwN as number) * 2) / 2
            const lift = liftById(st.liftId).name
            const tLevel = levelFor(st.liftId, st.sex, tRatio)
            const topPct = Math.max(1, 100 - percentileFor(tLevel))
            const reached = estimate !== null && estimate >= targetKg
            return (
              <>
                <div className="kv">
                  <span className="k">
                    {LEVELS[st.targetLevel]} {lift} · top {topPct}%
                  </span>
                  <span className="num">
                    {targetKg} kg e1RM · {tRatio}× BW
                  </span>
                </div>
                {reached ? (
                  <div className="cb-target-line">Already there — the marker on the bar is behind you.</div>
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
                        <span className="k">At {repsN} reps</span>
                        <span className="num">
                          {Math.round(weightForTarget(repsN, targetKg) * 2) / 2} kg
                        </span>
                      </div>
                    )}
                  </>
                )}
              </>
            )
          })()}
        </div>
      )}
    </>
  )
}

/* ---------- progress tab ---------- */

function ProgressTab() {
  const st = useStore(caliberStore)
  const [lift, setLift] = useState(st.liftId)
  const series = (st.tests[lift] ?? []).map((t) => t.e1rm)
  return (
    <>
      <div className="ins-grid">
        {LIFTS.slice(0, 4).map((l) => (
          <StatBox
            key={l.id}
            label={l.name}
            value={st.prs[l.id] ? `${st.prs[l.id].e1rm}` : '—'}
            sub={st.prs[l.id] ? 'kg best e1RM' : 'not tested'}
          />
        ))}
      </div>
      <div className="card">
        <div className="chips" style={{ marginBottom: 12 }}>
          {LIFTS.map((l) => (
            <button
              key={l.id}
              className={'chip' + (l.id === lift ? ' on' : '')}
              style={{ ['--chip-accent' as string]: 'var(--m-caliber)' } as CSSProperties}
              onClick={() => setLift(l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
        {series.length >= 2 ? (
          <>
            <Line values={series} accentVar="var(--m-caliber)" />
            <div className="cd-heat-label num">
              {series.length} tests · best {Math.max(...series)} kg · last {series[series.length - 1]} kg
            </div>
          </>
        ) : (
          <div className="rs-foot">
            Log at least two tests of {liftById(lift).name} on the Test tab and the trend draws itself
            here.
          </div>
        )}
      </div>
      <div className="card guide">
        <p>
          <b>Test rarely, train mostly.</b> An e1RM check every two to four weeks per lift is plenty —
          the chart should climb in stairs, not wobble daily. Same lift, same rep range, similar
          fatigue: that's what makes two points comparable.
        </p>
      </div>
    </>
  )
}

/* ---------- standards tab ---------- */

function StandardsTab() {
  const st = useStore(caliberStore)
  const bw = st.bodyweight
  return (
    <>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-caliber)' }}>
            Standards for your bodyweight · {bw} kg {st.sex === 'm' ? 'male' : 'female'}
          </span>
        </div>
        {LIFTS.map((l) => {
          const ths = STANDARDS[l.id][st.sex]
          const pr = st.prs[l.id]?.e1rm
          return (
            <div className="cb-std" key={l.id}>
              <div className="cb-std-name">
                {l.name}
                {pr !== undefined && <span className="num pr"> · yours {pr} kg</span>}
              </div>
              <div className="cb-std-row num">
                {ths.map((t, i) => {
                  const kg = Math.round(t * bw * 2) / 2
                  const hit = pr !== undefined && pr >= kg
                  return (
                    <span key={i} className={'cb-std-cell' + (hit ? ' hit' : '')}>
                      <i>{LEVELS[i + 1].slice(0, 3)}</i>
                      {kg}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
        <p className="rs-foot" style={{ marginTop: 10 }}>
          Entries are the e1RM that <i>enters</i> each level, as bodyweight multiples. They're
          calibrated approximations for orientation — a compass, not a scale. Filled cells are levels
          your logged PRs already clear.
        </p>
      </div>

      <div className="card guide">
        <p>
          <b>How the numbers work.</b> Your one-rep max is estimated from any hard set:{' '}
          <b>Epley</b> says 1RM = w × (1 + r/30); <b>Brzycki</b> says 1RM = w × 36/(37 − r). They
          bracket most lifters, so CALIBER averages them — e.g. 100 kg × 5 →{' '}
          <span className="num">{Math.round(epley(100, 5) * 2) / 2}</span> and{' '}
          <span className="num">{Math.round(brzycki(100, 5) * 2) / 2}</span>, logged as{' '}
          <span className="num">{Math.round(e1rm(100, 5) * 2) / 2} kg</span>.
        </p>
        <p>
          <b>Why the confidence dot.</b> The two formulas agree tightly at low reps and drift apart as
          reps rise — past ten, the estimate reflects endurance more than maximal strength. Test in
          the 3–6 range when you want a number you can plan around.
        </p>
      </div>
    </>
  )
}

/* ---------- screen ---------- */

export default function CaliberScreen({ tab = 'test' }: { tab?: string }) {
  if (tab === 'progress') return <ProgressTab />
  if (tab === 'standards') return <StandardsTab />
  return <TestTab />
}

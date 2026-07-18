import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { toast } from '../../core/toast'
import { Seg, Field, parseNum, StatBox } from '../../app/ui'
import { Line } from '../../app/charts'
import {
  LIFTS,
  STANDARDS,
  PERCENTILES,
  epley,
  brzycki,
  levelFor,
  pctForRatio,
  ratioForPercentile,
  goalTotalKg,
  roundTo,
  confidenceFor,
  repsForTarget,
  weightForTarget,
  liftById,
  type Sex,
} from './formulas'
import { caliberStore, patchCaliber, logTest } from './model'

/* ---------- percentile axis (YOU vs AIM) ---------- */

const AXIS = [5, 25, 50, 75, 95] as const

function PercentileAxis({ you, aim }: { you: number; aim: number }) {
  const x = (p: number) => `${p}%`
  return (
    <div className="cb-axis-wrap">
      <div className="cb-axis-you" style={{ left: x(you) }}>
        <span className="num">{ordinal(you)}</span>
        <i />
      </div>
      <div className="cb-axis-aim" style={{ left: x(aim) }}>
        <span>AIM</span>
        <i />
      </div>
      <div className="cb-axis">
        {AXIS.map((p) => (
          <span key={p} className="cb-axis-tick" style={{ left: x(p) }} />
        ))}
        <span className="cb-axis-fill" style={{ width: x(you) }} />
      </div>
      <div className="cb-axis-labels num">
        {AXIS.map((p) => (
          <span key={p} style={{ left: x(p) }}>{p}</span>
        ))}
      </div>
    </div>
  )
}

function ordinal(n: number): string {
  const s = n % 10
  const t = n % 100
  const suf = t >= 11 && t <= 13 ? 'th' : s === 1 ? 'st' : s === 2 ? 'nd' : s === 3 ? 'rd' : 'th'
  return `${n}${suf}`
}

/* ---------- test tab ---------- */

function TestTab() {
  const st = useStore(caliberStore)
  const [bw, setBw] = useState(String(st.bodyweight))
  const [height, setHeight] = useState(st.height !== null ? String(st.height) : '')
  const [aim, setAim] = useState(String(st.aimTop))
  const [weight, setWeight] = useState(String(st.weight))
  const [reps, setReps] = useState(String(st.reps))

  const lift = liftById(st.liftId)
  const isBW = lift.bw === true

  const bwN = parseNum(bw)
  const weightN = parseNum(weight) // for pull-up this is ADDED kg (0 allowed)
  const repsRaw = parseNum(reps)
  const repsN = repsRaw !== null ? Math.round(repsRaw) : null
  const heightN = parseNum(height)
  const aimN = parseNum(aim)
  const aimTop = aimN !== null ? Math.min(50, Math.max(5, Math.round(aimN))) : st.aimTop

  const valid =
    bwN !== null && bwN > 0 && weightN !== null && (isBW ? weightN >= 0 : weightN > 0) &&
    repsN !== null && repsN >= 1

  const load = valid ? (isBW ? (bwN as number) + (weightN as number) : (weightN as number)) : null
  const eTotal = load !== null && repsN !== null ? roundTo(epley(load, repsN), 0.5) : null
  const bTotal = load !== null && repsN !== null ? roundTo(brzycki(load, repsN), 0.1) : null
  const shown = eTotal !== null ? (isBW ? roundTo(eTotal - (bwN as number), 0.5) : eTotal) : null
  const bShown = bTotal !== null ? (isBW ? roundTo(bTotal - (bwN as number), 0.1) : bTotal) : null

  const ratio = eTotal !== null && bwN !== null ? eTotal / bwN : null
  const youPct = ratio !== null ? pctForRatio(st.liftId, st.sex, ratio) : null
  const level = ratio !== null ? levelFor(st.liftId, st.sex, ratio) : null
  const conf = repsN !== null && repsN >= 1 ? confidenceFor(repsN) : null

  const goalTotal = bwN !== null ? goalTotalKg(st.liftId, st.sex, bwN, aimTop) : null
  const goalShown = goalTotal !== null ? (isBW ? Math.max(0, roundTo(goalTotal - (bwN as number), 0.5)) : goalTotal) : null
  const toGo = eTotal !== null && goalTotal !== null ? Math.max(0, roundTo(goalTotal - eTotal, 0.5)) : null
  const goalPct = eTotal !== null && goalTotal !== null ? Math.min(100, Math.round((eTotal / goalTotal) * 100)) : null

  const bmi = bwN !== null && heightN !== null && heightN > 0 ? Math.round((bwN / Math.pow(heightN / 100, 2)) * 10) / 10 : null

  return (
    <>
      <div className="card">
        <div className="cb-profile-head">
          <span className="label" style={{ color: 'var(--m-caliber)' }}>Profile</span>
          <Seg<Sex>
            options={[
              { id: 'm', label: 'M' },
              { id: 'f', label: 'W' },
            ]}
            value={st.sex}
            onChange={(sex) => patchCaliber({ sex })}
          />
        </div>
        <div className="cb-fields">
          <Field label="Height cm">
            <input className="tinput" inputMode="numeric" value={height} placeholder="—"
              onChange={(e) => {
                setHeight(e.target.value)
                const n = parseNum(e.target.value)
                patchCaliber({ height: n !== null && n > 0 ? Math.round(n) : null })
              }} />
          </Field>
          <Field label="Bodyweight kg">
            <input className="tinput" inputMode="decimal" value={bw}
              onChange={(e) => {
                setBw(e.target.value)
                const n = parseNum(e.target.value)
                if (n !== null && n > 0) patchCaliber({ bodyweight: n })
              }} />
          </Field>
          <Field label="Aim for top %">
            <input className="tinput" inputMode="numeric" value={aim}
              onChange={(e) => {
                setAim(e.target.value)
                const n = parseNum(e.target.value)
                if (n !== null) patchCaliber({ aimTop: Math.min(50, Math.max(5, Math.round(n))) })
              }} />
          </Field>
        </div>
        <div className="cb-profile-line num">
          {bmi !== null && <>BMI <b>{bmi}</b> · </>}
          goals set for top <b>{aimTop}%</b> of adult {st.sex === 'm' ? 'men' : 'women'} at <b>{bwN ?? st.bodyweight} kg</b>
        </div>
      </div>

      <div className="card">
        <div className="cb-lifts">
          {LIFTS.map((l) => (
            <button key={l.id}
              className={'cb-lift' + (l.id === st.liftId ? ' on' : '')}
              onClick={() => patchCaliber({ liftId: l.id })}>
              {l.name}
            </button>
          ))}
        </div>
        <div className="cb-fields two">
          <Field label="Reps">
            <input className="tinput" inputMode="numeric" value={reps}
              onChange={(e) => {
                setReps(e.target.value)
                const n = parseNum(e.target.value)
                if (n !== null && n >= 1) patchCaliber({ reps: Math.round(n) })
              }} />
          </Field>
          <Field label={isBW ? 'Added kg (belt)' : 'Weight kg'}>
            <input className="tinput" inputMode="decimal" value={weight}
              onChange={(e) => {
                setWeight(e.target.value)
                const n = parseNum(e.target.value)
                if (n !== null && (isBW ? n >= 0 : n > 0)) patchCaliber({ weight: n })
              }} />
          </Field>
        </div>

        {valid && shown !== null && youPct !== null && level !== null && (
          <>
            <div className="cb-est">
              <div className="cb-est-k">Estimated 1RM{isBW ? ' · added' : ''}</div>
              <div className="cb-est-v">
                <span className="num">{isBW && shown >= 0 ? '+' : ''}{shown}</span>
                <span className="u">kg</span>
              </div>
              <div className="cb-est-sub">
                Brzycki {isBW && (bShown as number) >= 0 ? '+' : ''}{bShown}
                {conf && (
                  <>
                    {' '}· <span className={'dot g' + conf.grade} /> {conf.label} confidence
                  </>
                )}
                <span className="cb-lvl"> · {level.name}</span>
              </div>
            </div>

            <div className="cb-you">You</div>
            <PercentileAxis you={youPct} aim={100 - aimTop} />

            {goalTotal !== null && goalShown !== null && goalPct !== null && (
              <div className="cb-goalbar-wrap">
                <div className="cb-goalbar-head">
                  <span>Progress to goal</span>
                  <span className="num">{goalPct}%</span>
                </div>
                <div className="cb-goalbar"><i style={{ width: `${goalPct}%` }} /></div>
                <div className="cb-goalbar-sub num">
                  {toGo !== null && toGo > 0
                    ? `${toGo} kg to go (goal ${isBW ? '+' : ''}${goalShown} kg)`
                    : `goal met — ${isBW ? '+' : ''}${goalShown} kg is behind you`}
                </div>
              </div>
            )}

            {toGo !== null && toGo > 0 && goalTotal !== null && (
              <div className="cb-reach">
                <div className="cb-reach-k">To reach your goal</div>
                <div className="kv">
                  <span className="k">at {isBW ? `+${weightN}` : weightN} kg</span>
                  <span className="num">
                    {repsForTarget(load as number, goalTotal) > 15 ? 'add weight first' : `${repsForTarget(load as number, goalTotal)} reps`}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">at {repsN} reps</span>
                  <span className="num">
                    {isBW
                      ? `+${Math.max(0, roundTo(weightForTarget(repsN as number, goalTotal) - (bwN as number), 0.5))} kg`
                      : `${roundTo(weightForTarget(repsN as number, goalTotal), 0.5)} kg`}
                  </span>
                </div>
              </div>
            )}

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }}
              onClick={() => {
                const pr = logTest(st.liftId, eTotal as number)
                toast(pr ? `New ${lift.name} PR — ${isBW ? '+' + shown : shown} kg` : 'Set saved')
              }}>
              Save this set
            </button>
          </>
        )}
      </div>

      {bwN !== null && (
        <div className="card">
          <div className="card-head">
            <span className="label" style={{ color: 'var(--m-caliber)' }}>Goals · top {aimTop}% · {bwN} kg</span>
          </div>
          <div className="cb-goals">
            {LIFTS.map((l) => {
              const total = goalTotalKg(l.id, st.sex, bwN, aimTop)
              const v = l.bw ? Math.max(0, roundTo(total - bwN, 0.5)) : total
              return (
                <div key={l.id} className="cb-goal">
                  <div className="k">{l.name}{l.bw ? ' added' : ''}</div>
                  <div className="v num">{l.bw ? '+' : ''}{String(v).replace('.', ',')}<span className="u"> kg</span></div>
                </div>
              )
            })}
          </div>
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
  const disp = (l: { bw?: boolean }, total: number) => (l.bw ? `+${Math.max(0, roundTo(total - st.bodyweight, 0.5))}` : String(total))
  const recent = LIFTS.flatMap((l) => (st.tests[l.id] ?? []).map((t) => ({ lift: l, ...t })))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8)
  return (
    <>
      <div className="ins-grid">
        {LIFTS.map((l) => {
          const s = (st.tests[l.id] ?? []).map((t) => t.e1rm)
          return (
            <button key={l.id} className={'cb-mini' + (l.id === lift ? ' on' : '')} onClick={() => setLift(l.id)}>
              <div className="k">{l.name}</div>
              {s.length >= 2 ? (
                <div className="cb-mini-chart"><Line values={s} accentVar="var(--m-caliber)" /></div>
              ) : (
                <div className="cb-mini-empty">no sets yet</div>
              )}
              {s.length > 0 && <div className="v num">{disp(l, Math.max(...s))} kg</div>}
            </button>
          )
        })}
      </div>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-caliber)' }}>{liftById(lift).name} · estimated 1RM over time</span>
        </div>
        {series.length >= 2 ? (
          <>
            <Line values={series} accentVar="var(--m-caliber)" />
            <div className="cd-heat-label num">
              {series.length} sets · best {disp(liftById(lift), Math.max(...series))} kg · last {disp(liftById(lift), series[series.length - 1])} kg
            </div>
          </>
        ) : (
          <div className="rs-foot">Save at least two sets of {liftById(lift).name} and the trend draws itself here.</div>
        )}
      </div>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-caliber)' }}>History</span>
        </div>
        {recent.length === 0 ? (
          <div className="rs-foot">No saved sets yet. Log one on Test and it lands here.</div>
        ) : (
          recent.map((r, i) => (
            <div className="kv" key={i}>
              <span className="k">{r.lift.name}</span>
              <span className="num">
                {disp(r.lift, r.e1rm)} kg · {new Date(r.ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="card guide">
        <p>
          <b>Test rarely, train mostly.</b> An e1RM check every two to four weeks per lift is plenty —
          the chart should climb in stairs, not wobble daily. Same lift, similar rep range, similar
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
  const aimPct = 100 - st.aimTop
  const cols = [...new Set([5, 25, 50, aimPct, 95])].sort((a, b) => a - b)
  return (
    <>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-caliber)' }}>Standards for your bodyweight</span>
        </div>
        <p className="guide-p">
          Where each 1RM lands on the percentile scale, at <b>{bw} kg</b> bodyweight for the selected
          sex. Your aim of top <b>{st.aimTop}%</b> is highlighted.
        </p>
        <div className="cb-tbl num" style={{ ['--cols' as string]: String(cols.length) } as CSSProperties}>
          <div className="cb-tbl-row head">
            <span className="lift">Lift</span>
            {cols.map((p) => (
              <span key={p} className={p === aimPct ? 'aim' : ''}>{p}th{p === aimPct ? ' · aim' : ''}</span>
            ))}
          </div>
          {LIFTS.map((l) => {
            const pr = st.prs[l.id]?.e1rm
            return (
              <div className="cb-tbl-row" key={l.id}>
                <span className="lift">{l.name}</span>
                {cols.map((p) => {
                  const total = roundTo(ratioForPercentile(l.id, st.sex, p) * bw, 2.5)
                  const v = l.bw ? Math.max(0, roundTo(total - bw, 2.5)) : total
                  const hit = pr !== undefined && pr >= total
                  return (
                    <span key={p} className={(p === aimPct ? 'aim' : '') + (hit ? ' hit' : '')}>
                      {l.bw ? '+' : ''}{String(v).replace('.', ',')}
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card guide">
        <p>
          <b>1RM estimate.</b> Uses the Epley formula (weight × (1 + reps ÷ 30)), with Brzycki shown
          as a cross-check. Both are most accurate at <b>5 reps or fewer</b>; past ~10 they drift and
          tend to overestimate — the confidence dot warns you. For sporadic testing this matters: a
          heavy triple tells you far more than a light set of fifteen.
        </p>
        <p>
          <b>Percentiles and goals.</b> Standards are approximate, drawn from aggregated public lifter
          data, keyed to <b>bodyweight</b> and the M/W switch. Height is recorded for context (BMI)
          but isn't a percentile axis — leverages vary, and no reliable dataset segments lifts by
          height. Your goal for each lift is the weight that would place you at your chosen
          percentile, rounded to the nearest 2.5.
        </p>
        <p>
          <b>Weighted pull-ups.</b> Computed on the full system load (bodyweight + added), then
          reported as the <b>added</b> weight. Enter only the weight you hang from the belt.
        </p>
        <p>
          <b>Reverse math.</b> "At your weight → N reps" is the reps you'd need at the weight you just
          entered to prove your goal 1RM. "At your reps → W kg" is the weight that would prove it at
          the rep count you entered.
        </p>
      </div>
      <p className="rs-foot">Percentile anchors sit at the {PERCENTILES.join(' / ')}th marks; everything between is interpolated.</p>
    </>
  )
}

/* ---------- screen ---------- */

export default function CaliberScreen({ tab = 'test' }: { tab?: string }) {
  if (tab === 'progress') return <ProgressTab />
  if (tab === 'standards') return <StandardsTab />
  return <TestTab />
}

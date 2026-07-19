import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../core/hooks'
import { eventsStore, currentStreak } from '../core/events'
import { settingsStore } from '../core/settings'
import { oneStore, setRate, setGoal } from '../core/one'
import { computePulse } from '../core/score'
import { navigate } from '../core/router'
import { todayKey } from '../core/dates'
import { parseNum } from '../app/ui'
import Ring from '../app/Ring'

const RATES = [
  { r: 0.005, year: '+30% a year' },
  { r: 0.01, year: '+68% a year' },
  { r: 0.02, year: '+180% a year' },
]

export default function One() {
  const events = useStore(eventsStore)
  const one = useStore(oneStore)
  useStore(settingsStore)
  const today = todayKey()
  const pulse = useMemo(() => computePulse(today), [events, today, one.rate, one.goals])
  const streak = currentStreak(events, today)
  const won = pulse.score !== null && pulse.score >= 100
  const bestWeek = Object.values(one.weekLog).reduce((b, r) => Math.max(b, r.score), 0)

  const goalRows: { key: 'grove' | 'respiro' | 'ghisa'; label: string; unit: string }[] = [
    { key: 'grove', label: 'GROVE focus', unit: 'min / week' },
    { key: 'respiro', label: 'RESPIRO breathwork', unit: 'min / week' },
    { key: 'ghisa', label: 'GHISA volume', unit: 'kg / week' },
  ]

  return (
    <>
      <div className="screen-head one-head">
        <button className="one-back" onClick={() => navigate('/')} aria-label="Back to Today">
          ‹
        </button>
        <div>
          <div className="eyebrow">The engine</div>
          <h1 className="screen-title">
            Your 1<span className="one-pct">%</span>
          </h1>
        </div>
      </div>

      {pulse.score === null ? (
        <div className="card hero one-hero">
          <div className="one-score-wrap">
            <span className="one-score num">—</span>
          </div>
          <p className="one-status">
            Nothing measured yet this week. The first logged action in any module sets your baseline
            — from there, every week is you against your own recent pace.
          </p>
        </div>
      ) : (
        <div className={'card hero one-hero' + (won ? ' won' : '')}>
          <div className="one-ring-wrap">
            <Ring value={Math.min(120, pulse.score)} accent={won ? 'var(--good)' : 'var(--accent)'} size={196} stroke={15}>
              <span className={'one-ring-v num' + (won ? ' won' : '')}>{pulse.score}<i>%</i></span>
              <span className="one-ring-k">{won ? 'week won' : 'of 1% better'}</span>
            </Ring>
          </div>
          <p className="one-status">
            {won
              ? `Week won — you're ${one.rate * 100}% past your own 4-week pace. Everything from here is compound interest.`
              : `${100 - pulse.score}% of the way left to beat your trailing 4-week pace by ${one.rate * 100}%. The gap is listed below, module by module.`}
          </p>
        </div>
      )}

      <div className="ins-grid three">
        <div className="one-stat">
          <div className="v num">{pulse.wonWeeks}</div>
          <div className="k">weeks won</div>
        </div>
        <div className="one-stat lit">
          <div className="v num">+{pulse.compoundPct.toFixed(1)}%</div>
          <div className="k">compounded</div>
        </div>
        <div className="one-stat">
          <div className="v num">{streak}d</div>
          <div className="k">day streak</div>
        </div>
      </div>

      {pulse.spark.length >= 2 && (
        <div className="card">
          <div className="card-head">
            <span className="label">Week by week</span>
            <span className="one-best num">best {bestWeek}%</span>
          </div>
          <div className="one-spark" aria-label="Weekly scores">
            {pulse.spark.map((s, i) => (
              <div className="one-spark-col" key={i}>
                <i
                  className={s.value >= 100 ? 'won' : ''}
                  style={{ height: `${Math.max(8, Math.min(100, (s.value / 120) * 100))}%` }}
                />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="rs-foot">
            Completed weeks freeze into the ledger — each one at or above 100% compounds your total.
          </p>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <span className="label">This week, module by module</span>
        </div>
        {pulse.modules.map((m) => (
          <button
            key={m.id}
            className="one-row"
            style={{ ['--wc' as string]: m.accentVar } as CSSProperties}
            onClick={() => navigate('/m/' + m.id)}
          >
            <span className="one-row-head">
              <i />
              <b>{m.name}</b>
              <em className="num">
                {m.score === null
                  ? m.scorer.mode === 'event'
                    ? 'no test yet'
                    : 'sits out'
                  : `${m.score}%`}
              </em>
            </span>
            {m.score !== null && (
              <span className="one-row-bar">
                <i style={{ width: `${Math.min(100, m.score)}%` }} />
              </span>
            )}
            <span className="one-row-sub">
              {m.score === null
                ? m.scorer.mode === 'event'
                  ? 'Only weeks with a saved set count — sparse testing never drags the average.'
                  : 'Nothing to measure yet — first activity sets the baseline.'
                : m.scorer.mode === 'completion'
                  ? `${Math.round((m.value as number) * 100)}% of the week's ${m.scorer.label} completed.`
                  : m.scorer.mode === 'event'
                    ? m.score >= 100
                      ? 'Tested and moved — a PR beyond your rate.'
                      : m.score >= 70
                        ? 'Tested and held. Strength moves in steps.'
                        : 'Tested lower — recovery first, numbers after.'
                    : `${Math.round(m.value as number).toLocaleString()} of ${Math.round(m.target as number).toLocaleString()} ${m.scorer.unit}${m.goalCapped ? ' · at your ceiling' : ''}`}
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label">Your rate</span>
        </div>
        <div className="one-rates">
          {RATES.map(({ r, year }) => (
            <button
              key={r}
              className={'one-rate' + (one.rate === r ? ' on' : '')}
              onClick={() => setRate(r)}
            >
              <b className="num">{r * 100}%</b>
              <span>weekly</span>
              <em className="num">{year}</em>
            </button>
          ))}
        </div>
        <p className="guide-p" style={{ marginTop: 12 }}>
          The weekly target is your <b>trailing 4-week pace × (1 + rate)</b>. Not last week — the
          average, so one heroic week doesn't set a trap and one bad week doesn't lower the bar to
          nothing. Won weeks compound: fifty-two 1% weeks aren't +52%, they're +68%.
        </p>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="label">Ceilings · where holding wins</span>
        </div>
        {goalRows.map((g) => (
          <div className="kv" key={g.key}>
            <span className="k">
              {g.label} <span className="hint">· {g.unit}</span>
            </span>
            <input
              className="tinput one-goal num"
              inputMode="numeric"
              placeholder="—"
              defaultValue={one.goals[g.key] !== undefined ? String(one.goals[g.key]) : ''}
              onBlur={(e) => {
                const n = parseNum(e.target.value)
                setGoal(g.key, n !== null && n > 0 ? Math.round(n) : undefined)
              }}
            />
          </div>
        ))}
        <p className="guide-p" style={{ marginTop: 10 }}>
          Growth can't ratchet forever — at some point 40 focused hours is the healthy maximum, not a
          failure to reach 41. Set a ceiling and the target stops there: <b>holding the ceiling is a
          100% week</b>. Hold it three weeks and the engine says so, and asks whether there's
          genuinely room to raise it — plateaus at your chosen level are wins, by design.
        </p>
      </div>

      <div className="card guide">
        <p>
          <b>Consistency is the growth.</b> A won week doesn't mean maxing out. It means landing 1%
          past your own recent average — which mostly means <i>showing up again</i>. Miss a fortnight
          and the pace drops with you, so the way back is winnable, never a wall.
        </p>
        <p>
          <b>Two kinds of weeks.</b> GHISA, GROVE and RESPIRO chase the ratchet. CADENCE and SANA
          score the week directly — habits hit, doses taken; a perfect week is 100 regardless of any
          trend. CALIBER joins only in weeks you test, and a PR past your rate wins it outright.
        </p>
        <p>
          <b>One number.</b> The week score is the plain average of every module that participated.
          No weighting, no cleverness — you can recompute it in your head, which is exactly the
          point.
        </p>
      </div>
    </>
  )
}

import { useState } from 'react'
import { MODULES } from '../core/registry'
import { completeOnboarding } from '../core/settings'
import { OnePercentRing, Toggle } from '../app/ui'
import Philosophy from '../app/Philosophy'
import Mark from '../app/Mark'
import { t } from '../core/i18n'

interface Goal {
  id: string
  label: string
  modules: string[]
}

const GOALS: Goal[] = [
  { id: 'gym', label: 'Strength & Gym', modules: ['ghisa', 'caliber'] },
  { id: 'calm', label: 'Breath & Calm', modules: ['respiro'] },
  { id: 'habits', label: 'Daily consistency', modules: ['cadence', 'grove'] },
  { id: 'health', label: 'Health & fasting', modules: ['sana', 'ora'] },
  { id: 'all', label: 'All of it', modules: MODULES.map((m) => m.id) },
]

export default function Onboarding() {
  const [step, setStep] = useState<'why' | 'pick'>('why')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyGoal(goal: Goal) {
    setSelected((prev) => {
      const active = goal.modules.every((m) => prev.has(m))
      const next = new Set(prev)
      for (const m of goal.modules) {
        if (active) next.delete(m)
        else next.add(m)
      }
      return next
    })
  }

  const count = selected.size

  return (
    <div className="ob">
      <div className="ob-hero">
        <OnePercentRing size={150} modules={[...MODULES]} activeIds={selected} />
        <Mark size={58} title="" />
        <div className="ob-line">{step === 'why' ? t('Small daily gains, compounded. Here\u2019s the whole idea.') : t('Pick your instruments.')}</div>
      </div>

      {step === 'why' && (
        <>
          <div className="card"><Philosophy /></div>
          <div className="ob-cta">
            <button className="btn btn-primary" onClick={() => setStep('pick')}>
              {t('Got it — choose my modules')}
            </button>
          </div>
        </>
      )}

      {step === 'pick' && (<>
      <button className="backlink" onClick={() => setStep('why')}>{t('\u2039 The idea')}</button>
      <div className="section-label">{t('What are you here for?')}</div>
      <div className="chips">
        {GOALS.map((g) => {
          const on = g.modules.every((m) => selected.has(m))
          return (
            <button key={g.id} className={'chip' + (on ? ' on' : '')} onClick={() => applyGoal(g)}>
              {t(g.label)}
            </button>
          )
        })}
      </div>

      <div className="section-label">{t('Modules — change any time')}</div>
      {MODULES.map((m) => {
        const on = selected.has(m.id)
        return (
          <div className="card" key={m.id}>
            <div className="mmod">
              <span className="mark">
                <m.Icon size={22} />
              </span>
              <div className="info">
                <div className="name" style={{ color: on ? m.accentVar : 'var(--dim)' }}>
                  {m.name}
                </div>
                <div className="tag">{t(m.tagline)}</div>
              </div>
              <Toggle on={on} onChange={() => toggle(m.id)} label={t('Enable {name}', { name: m.name })} />
            </div>
          </div>
        )
      })}

      <div className="ob-cta">
        <button
          className="btn btn-primary"
          disabled={count === 0}
          onClick={() => completeOnboarding([...selected])}
        >
          {count === 0 ? t('Pick at least one') : count === 1 ? t('Start with {count} module', { count }) : t('Start with {count} modules', { count })}
        </button>
      </div>
      </>)}
    </div>
  )
}

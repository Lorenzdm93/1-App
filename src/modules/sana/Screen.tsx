import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { todayKey, shiftDay } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty, Seg, Field, StatBox } from '../../app/ui'
import {
  sanaStore, setStackDays, setLogMethod, SLOTS, FORMS, STACK_COLORS, STACK_EMOJIS,
  dueOn, isTaken, takeDose, takeMany, followedOn, toggleFollow,
  addStack, updateStack, deleteStack, addCompound, linkCompound, unlinkCompound, updateCompound,
  dayCount, historyStats, compoundById,
  type Compound, type Stack, type Slot, type Form,
} from './model'
import { LIBRARY, libraryByName, type LibraryEntry } from './library'

/* ---------- form glyphs ---------- */

function FormGlyph({ form }: { form: Form }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.6, fill: 'none' as const }
  switch (form) {
    case 'capsule':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <rect x="4" y="9" width="16" height="6.6" rx="3.3" transform="rotate(-28 12 12)" />
          <path d="M9.4 14.4l5.2-5.2" transform="rotate(-28 12 12)" />
        </svg>
      )
    case 'softgel':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <ellipse cx="12" cy="12" rx="7.5" ry="5.4" transform="rotate(-24 12 12)" />
          <path d="M9.5 10.2c1.2-1 3-1.2 4.4-.5" opacity="0.6" />
        </svg>
      )
    case 'tablet':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <circle cx="12" cy="12" r="6.6" />
          <path d="M12 5.4v13.2" opacity="0.7" />
        </svg>
      )
    case 'powder':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M5 18c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" />
          <path d="M4 18h16" strokeLinecap="round" />
        </svg>
      )
    case 'liquid':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M12 4c3.4 4.2 5.2 7 5.2 9.4A5.2 5.2 0 0 1 12 18.6a5.2 5.2 0 0 1-5.2-5.2C6.8 11 8.6 8.2 12 4z" strokeLinejoin="round" />
        </svg>
      )
  }
}

function InfoDot({ onClick }: { onClick: () => void }) {
  return (
    <button className="sn-info" onClick={onClick} aria-label="About this compound">
      i
    </button>
  )
}

/* ---------- compound info sheet ---------- */

function CompoundInfo({ compound, onClose }: { compound: Compound | null; onClose: () => void }) {
  const lib = compound ? libraryByName(compound.name) : undefined
  return (
    <Sheet open={compound !== null} title={compound?.name ?? ''} onClose={onClose}>
      {compound && (
        <>
          <div className="kv"><span className="k">Dose</span><span className="num">{compound.amount} {compound.unit}</span></div>
          {compound.chem && <div className="kv"><span className="k">Also known as</span><span>{compound.chem}</span></div>}
          <div className="kv"><span className="k">When</span><span>{SLOTS.find((s) => s.id === compound.slot)?.label}</span></div>
          {compound.note && <p className="sn-note-line">{compound.note}</p>}
          {lib && <p className="guide-p">{lib.info}</p>}
          {lib?.caution && <div className="rs-warning" style={{ marginTop: 10 }}><b>Worth knowing.</b> {lib.caution}</div>}
          <p className="rs-foot">
            SANA records what you chose to take — dose and timing decisions stay with you and, for
            medicines, your prescriber.
          </p>
        </>
      )}
    </Sheet>
  )
}

/* ---------- TODAY ---------- */

function Dial({ taken, due }: { taken: number; due: number }) {
  const pct = due > 0 ? taken / due : 0
  const R = 62
  const C = 2 * Math.PI * R
  const ticks = Array.from({ length: 48 })
  return (
    <div className="sn-dial-wrap">
      <svg className="sn-dial" viewBox="0 0 160 160" aria-hidden="true">
        {ticks.map((_, i) => {
          const a = (i / 48) * 2 * Math.PI - Math.PI / 2
          return (
            <line
              key={i}
              x1={80 + 72 * Math.cos(a)} y1={80 + 72 * Math.sin(a)}
              x2={80 + 76 * Math.cos(a)} y2={80 + 76 * Math.sin(a)}
              stroke="var(--line)" strokeWidth="1.5"
            />
          )
        })}
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--line)" strokeWidth="7" opacity="0.5" />
        <circle
          cx="80" cy="80" r={R} fill="none"
          stroke="var(--m-sana)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.3,0.9,0.35,1)' }}
        />
      </svg>
      <div className="sn-dial-center">
        <div className="sn-dial-count">
          <span className="a num">{taken}</span>
          <span className="sep">/</span>
          <span className="b num">{due}</span>
        </div>
        <div className="sn-dial-k">doses taken</div>
        <div className="sn-dial-pct num">{due > 0 ? Math.round(pct * 100) : 0}% complete</div>
      </div>
    </div>
  )
}

function StackDots({ stacks }: { stacks: Stack[] }) {
  if (stacks.length === 0) return null
  return (
    <span className="sn-dots">
      {stacks.map((s) => (
        <i key={s.id} style={{ background: s.color }} />
      ))}
      {stacks.length > 1 && <em>shared</em>}
    </span>
  )
}

function TodayTab({ onGoStacks }: { onGoStacks: () => void }) {
  const st = useStore(sanaStore)
  const [dayOffset, setDayOffset] = useState(0)
  const [info, setInfo] = useState<Compound | null>(null)
  const [changing, setChanging] = useState(false)
  const [focusStack, setFocusStack] = useState<string | null>(null)
  const day = shiftDay(todayKey(), dayOffset)
  const due = dueOn(st, day)
  const focused = focusStack ? st.stacks.find((x) => x.id === focusStack) ?? null : null
  const member = focused ? new Set(focused.compoundIds) : null
  const shown = member ? due.filter((d) => member.has(d.compound.id)) : due
  const takenCount = due.filter(({ compound }) => isTaken(st, compound.id, day)).length
  const followed = followedOn(st, day)
  const followedStacks = st.stacks.filter((s) => followed.includes(s.id))

  const label =
    dayOffset === 0
      ? 'Today'
      : dayOffset === -1
        ? 'Yesterday'
        : new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const sub = new Date(day + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  if (st.stacks.length === 0) {
    return (
      <>
        <Empty title="No stacks yet" sub="A stack is a regimen — Daily Foundation, Sport, Sleep. Build one and Today assembles itself." />
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={onGoStacks}>Build the first stack</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="cd-pager">
        <button onClick={() => setDayOffset((o) => o - 1)} aria-label="Previous day">‹</button>
        <span className="cd-pager-label">
          {label}
          <span className="sn-pager-sub">{sub}</span>
        </span>
        <button onClick={() => setDayOffset((o) => Math.min(0, o + 1))} disabled={dayOffset === 0} aria-label="Next day">›</button>
      </div>

      <div className="card sn-dial-card">
        <Dial taken={takenCount} due={due.length} />
      </div>

      <div className="sn-follow-head">
        <span className="section-label" style={{ margin: 0 }}>Following {followedStacks.length} stack{followedStacks.length === 1 ? '' : 's'}</span>
        <button className="chip" onClick={() => setChanging(true)}>Change</button>
      </div>
      {followedStacks.map((s) => {
        const ids = s.compoundIds.filter((id) => {
          const c = compoundById(st, id)
          return c !== undefined && due.some((d) => d.compound.id === id)
        })
        const done = ids.filter((id) => isTaken(st, id, day)).length
        const pct = ids.length > 0 ? (done / ids.length) * 100 : 0
        return (
          <div
            key={s.id}
            className={'sn-stackrow' + (focusStack === s.id ? ' on' : '')}
            style={{ ['--sk' as string]: s.color } as CSSProperties}
            role="button"
            tabIndex={0}
            onClick={() => setFocusStack((cur) => (cur === s.id ? null : s.id))}
          >
            <span className="sn-stackrow-emoji">{s.emoji}</span>
            <div className="sn-stackrow-main">
              <div className="sn-stackrow-name">{s.name}</div>
              <div className="sn-stackrow-bar"><i style={{ width: `${pct}%` }} /></div>
            </div>
            <span className="num sn-stackrow-count">{done}/{ids.length}</span>
            <button
              className={'sn-stackrow-take' + (done === ids.length && ids.length > 0 ? ' done' : '')}
              aria-label={`Take all of ${s.name}`}
              onClick={(e) => {
                e.stopPropagation()
                const n = takeMany(ids, day)
                if (n > 0) toast(`${s.name} — ${n} taken`)
              }}
            >
              ✓
            </button>
          </div>
        )
      })}
      <p className="rs-foot sn-filter-line" style={{ marginTop: 4 }}>
        {focused ? (
          <>
            Showing <b style={{ color: focused.color }}>{focused.name}</b> only ·{' '}
            <button className="linklike" onClick={() => setFocusStack(null)}>show all stacks</button>
          </>
        ) : (
          <>Tap a stack to see only its doses. Shared compounds are listed once.</>
        )}
      </p>

      {SLOTS.map((slot) => {
        const rows = shown.filter((d) => d.compound.slot === slot.id)
        if (rows.length === 0) return null
        const remaining = rows.filter((r) => !isTaken(st, r.compound.id, day))
        return (
          <div key={slot.id}>
            <div className="sn-slot-head">
              <span className="sn-slot-title">{slot.glyph} {slot.label}</span>
              <span className="num sn-slot-count">{rows.length - remaining.length}/{rows.length}</span>
              <button
                className="chip"
                disabled={remaining.length === 0}
                onClick={() => {
                  const n = takeMany(remaining.map((r) => r.compound.id), day)
                  if (n > 0) toast(`${slot.label} — ${n} taken`)
                }}
              >
                Take all
              </button>
            </div>
            {rows.map(({ compound, stacks }) => {
              const taken = isTaken(st, compound.id, day)
              return (
                <div
                  key={compound.id}
                  className={'card sn-comp' + (taken ? ' taken' : '')}
                  style={member && member.has(compound.id) && focused ? ({ ['--sk' as string]: focused.color } as CSSProperties) : undefined}
                >
                  <span className="sn-comp-glyph"><FormGlyph form={compound.form} /></span>
                  <div className="sn-comp-main">
                    <div className="sn-comp-name">
                      {compound.name}
                      <InfoDot onClick={() => setInfo(compound)} />
                      <StackDots stacks={stacks} />
                    </div>
                    <div className="sn-comp-dose num">
                      {compound.amount} {compound.unit}
                      {compound.chem && <span className="chem"> · {compound.chem}</span>}
                    </div>
                    {compound.note && <div className="sn-comp-note">{compound.note}</div>}
                  </div>
                  <button
                    className={'sn-check' + (taken ? ' on' : '')}
                    onClick={() => takeDose(compound.id, day)}
                    aria-label={(taken ? 'Untake ' : 'Take ') + compound.name}
                  >
                    ✓
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}

      {dayOffset < 0 && (
        <p className="rs-foot">Filling in {label.toLowerCase()} — doses carry that day's date, so the streak stays honest.</p>
      )}

      <CompoundInfo compound={info} onClose={() => setInfo(null)} />
      <Sheet open={changing} title="Following today" onClose={() => setChanging(false)}>
        <p className="guide-p">Pick which stacks apply to {label.toLowerCase()}. Off days are normal — a Sport stack can rest when you do.</p>
        {st.stacks.map((s) => {
          const on = followed.includes(s.id)
          return (
            <button key={s.id} className={'sn-follow-row' + (on ? ' on' : '')} onClick={() => toggleFollow(day, s.id)}>
              <span className="sn-stackrow-emoji" style={{ ['--sk' as string]: s.color } as CSSProperties}>{s.emoji}</span>
              <span className="sn-follow-name">{s.name}</span>
              <span className="sn-follow-state">{on ? 'Following' : 'Off'}</span>
            </button>
          )
        })}
      </Sheet>
    </>
  )
}

/* ---------- STACKS ---------- */

function CompoundForm({
  stack,
  existing,
  onDone,
}: {
  stack: Stack
  existing: Compound[]
  onDone: () => void
}) {
  const [mode, setMode] = useState<'library' | 'custom' | 'existing'>('library')
  const [name, setName] = useState('')
  const [chem, setChem] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('mg')
  const [form, setForm] = useState<Form>('capsule')
  const [slot, setSlot] = useState<Slot>('morning')
  const [note, setNote] = useState('')

  const linkable = existing.filter((c) => !stack.compoundIds.includes(c.id))

  function addFromLibrary(e: LibraryEntry) {
    const already = existing.find((c) => c.name.toLowerCase() === e.name.toLowerCase())
    if (already) {
      linkCompound(stack.id, already.id)
      toast(`${e.name} linked — shared with its other stack`)
    } else {
      addCompound(stack.id, { name: e.name, chem: e.chem, amount: e.amount, unit: e.unit, form: e.form, slot: e.slot, note: e.note })
      toast(`${e.name} added`)
    }
    onDone()
  }

  function addCustom() {
    if (name.trim() === '') {
      toast('Give it a name')
      return
    }
    addCompound(stack.id, { name, chem, amount, unit, form, slot, note })
    toast(`${name.trim()} added`)
    onDone()
  }

  return (
    <>
      <Seg<'library' | 'custom' | 'existing'>
        options={[
          { id: 'library', label: 'Library' },
          { id: 'custom', label: 'Custom' },
          { id: 'existing', label: 'Existing' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'library' && (
        <div style={{ marginTop: 12 }}>
          {LIBRARY.map((e) => (
            <button key={e.name} className="sn-lib-row" onClick={() => addFromLibrary(e)}>
              <span className="sn-comp-glyph"><FormGlyph form={e.form} /></span>
              <span className="sn-lib-main">
                <span className="sn-lib-name">{e.name}</span>
                <span className="sn-lib-sub num">{e.amount} {e.unit} · {SLOTS.find((s) => s.id === e.slot)?.label}</span>
              </span>
              <span className="sn-lib-add">+</span>
            </button>
          ))}
        </div>
      )}
      {mode === 'custom' && (
        <div style={{ marginTop: 12 }}>
          <Field label="Name"><input className="tinput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vitamin D3" /></Field>
          <Field label="Chemical / secondary name (optional)"><input className="tinput" value={chem} onChange={(e) => setChem(e.target.value)} placeholder="Cholecalciferol" /></Field>
          <div className="cb-fields" style={{ marginTop: 0 }}>
            <Field label="Amount"><input className="tinput" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2000" /></Field>
            <Field label="Unit"><input className="tinput" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="IU" /></Field>
            <Field label="Form">
              <select className="tinput" value={form} onChange={(e) => setForm(e.target.value as Form)}>
                {FORMS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Time of day">
            <div className="chips">
              {SLOTS.map((s) => (
                <button key={s.id} className={'chip' + (slot === s.id ? ' on' : '')} style={{ ['--chip-accent' as string]: 'var(--m-sana)' } as CSSProperties} onClick={() => setSlot(s.id)}>
                  {s.glyph} {s.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Note (the italic line on Today)"><input className="tinput" value={note} onChange={(e) => setNote(e.target.value)} placeholder="With a meal that has fat" /></Field>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={addCustom}>Add compound</button>
          </div>
        </div>
      )}
      {mode === 'existing' && (
        <div style={{ marginTop: 12 }}>
          {linkable.length === 0 ? (
            <p className="guide-p">Every existing compound is already in this stack. Shared compounds count once on Today, however many stacks carry them.</p>
          ) : (
            linkable.map((c) => (
              <button key={c.id} className="sn-lib-row" onClick={() => { linkCompound(stack.id, c.id); toast(`${c.name} linked`); onDone() }}>
                <span className="sn-comp-glyph"><FormGlyph form={c.form} /></span>
                <span className="sn-lib-main">
                  <span className="sn-lib-name">{c.name}</span>
                  <span className="sn-lib-sub num">{c.amount} {c.unit} · {SLOTS.find((s) => s.id === c.slot)?.label}</span>
                </span>
                <span className="sn-lib-add">+</span>
              </button>
            ))
          )}
        </div>
      )}
    </>
  )
}

function StackEditor({ stackId, onBack }: { stackId: string; onBack: () => void }) {
  const st = useStore(sanaStore)
  const stack = st.stacks.find((s) => s.id === stackId)
  const [addingComp, setAddingComp] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const today = todayKey()
  if (!stack) return null
  const following = followedOn(st, today).includes(stack.id)
  const comps = stack.compoundIds
    .map((id) => compoundById(st, id))
    .filter((c): c is Compound => c !== undefined)
  return (
    <>
      <div className="sn-ed-head">
        <button className="rs-back" style={{ padding: 0 }} onClick={onBack}>‹ Your stacks</button>
        <button className="sn-trash" onClick={() => setConfirmDelete(true)} aria-label="Delete stack">🗑</button>
      </div>
      <Field label="Name">
        <input className="tinput" value={stack.name} onChange={(e) => updateStack(stack.id, { name: e.target.value })} />
      </Field>
      <Field label="Icon">
        <div className="sn-emoji-grid">
          {STACK_EMOJIS.map((e) => (
            <button key={e} className={'sn-emoji' + (stack.emoji === e ? ' on' : '')} onClick={() => updateStack(stack.id, { emoji: e })}>
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Colour">
        <div className="sn-colors">
          {STACK_COLORS.map((c) => (
            <button key={c} className={'sn-color' + (stack.color === c ? ' on' : '')} style={{ background: c }} onClick={() => updateStack(stack.id, { color: c })} aria-label={`Colour ${c}`} />
          ))}
        </div>

        <div className="sn-ed-days">
          <span className="k">Active days <span className="hint">· all off = every day</span></span>
          <div className="sn-daychips">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const on = (stack.days ?? []).includes(d)
              return (
                <button
                  key={d}
                  className={'sn-daychip' + (on ? ' on' : '')}
                  onClick={() => {
                    const cur = stack.days ?? []
                    const next = on ? cur.filter((x) => x !== d) : [...cur, d]
                    setStackDays(stack.id, next.length === 0 ? undefined : next)
                  }}
                >
                  {'SMTWTFS'[d]}
                </button>
              )
            })}
          </div>
        </div>
      </Field>
      <div className="section-label" style={{ marginTop: 18 }}>Compounds</div>
      {comps.length === 0 && <p className="guide-p">Empty stack — add from the library, or link a compound another stack already has.</p>}
      {comps.map((c) => (
        <div key={c.id} className="card sn-ed-comp" style={{ ['--sk' as string]: stack.color } as CSSProperties}>
          <span className="sn-comp-glyph tint"><FormGlyph form={c.form} /></span>
          <div className="sn-comp-main">
            <div className="sn-comp-name">{c.name}</div>
            <div className="sn-comp-dose num">{c.amount} {c.unit} · {SLOTS.find((s) => s.id === c.slot)?.label}</div>
          </div>
          <button className="sn-trash sm" onClick={() => { unlinkCompound(stack.id, c.id); toast(`${c.name} removed`) }} aria-label={`Remove ${c.name}`}>🗑</button>
        </div>
      ))}
      <button className="btn btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => setAddingComp(true)}>
        + Add compound
      </button>
      <button
        className={'sn-follow-big' + (following ? ' on' : '')}
        onClick={() => toggleFollow(today, stack.id)}
      >
        {following ? '✓ Following this today' : 'Not following today — tap to follow'}
      </button>

      <Sheet open={addingComp} title={`Add to ${stack.name}`} onClose={() => setAddingComp(false)}>
        <CompoundForm stack={stack} existing={st.compounds} onDone={() => setAddingComp(false)} />
      </Sheet>
      <ConfirmSheet
        open={confirmDelete}
        title={`Delete ${stack.name}?`}
        body="Compounds shared with other stacks stay; compounds only this stack carries are removed with it. History already logged is untouched."
        actionLabel="Delete stack"
        danger
        onConfirm={() => { deleteStack(stack.id); onBack() }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}

function StacksTab() {
  const st = useStore(sanaStore)
  const [editing, setEditing] = useState<string | null>(null)
  const today = todayKey()
  if (editing) return <StackEditor stackId={editing} onBack={() => setEditing(null)} />
  return (
    <>
      <h2 className="sn-h1">Your stacks</h2>
      <p className="sn-sub">Saved regimens you can switch between on any day.</p>
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: 14 }}
        onClick={() => {
          const s = addStack({ name: 'New stack', emoji: STACK_EMOJIS[0], color: STACK_COLORS[st.stacks.length % STACK_COLORS.length] })
          setEditing(s.id)
        }}
      >
        + New stack
      </button>
      {st.stacks.map((s) => {
        const active = followedOn(st, today).includes(s.id)
        return (
          <button key={s.id} className="card card-tap sn-stackcard" style={{ ['--sk' as string]: s.color } as CSSProperties} onClick={() => setEditing(s.id)}>
            <span className="sn-stackrow-emoji big">{s.emoji}</span>
            <span className="sn-stackcard-main">
              <span className="sn-stackcard-name">
                {s.name}
                {active && <em className="sn-active">Active today</em>}
              </span>
              <span className="sn-stackcard-sub num">
                {s.compoundIds.length} compound{s.compoundIds.length === 1 ? '' : 's'} · {s.compoundIds.length} dose{s.compoundIds.length === 1 ? '' : 's'}/day
              </span>
            </span>
            <span className="sn-chev">›</span>
          </button>
        )
      })}
    </>
  )
}

/* ---------- HISTORY ---------- */

function startOfWeek(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d, 12)
  const back = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - back)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function HistoryTab() {
  const st = useStore(sanaStore)
  const today = todayKey()
  const [weekOff, setWeekOff] = useState(0)
  const [monthOff, setMonthOff] = useState(0)
  const stats = useMemo(() => historyStats(st, today), [st, today])

  const weekStart = shiftDay(startOfWeek(today), weekOff * 7)
  const weekDays = Array.from({ length: 7 }, (_, i) => shiftDay(weekStart, i))
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const base = new Date(today + 'T12:00:00')
  const mDate = new Date(base.getFullYear(), base.getMonth() + monthOff, 1, 12)
  const mYear = mDate.getFullYear()
  const mMonth = mDate.getMonth()
  const firstCol = (new Date(mYear, mMonth, 1, 12).getDay() + 6) % 7
  const daysInMonth = new Date(mYear, mMonth + 1, 0).getDate()
  const monthLabel = mDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const heatWeeks = 26
  const heatStart = shiftDay(startOfWeek(today), -(heatWeeks - 1) * 7)

  const cellFor = (day: string): string => {
    const c = dayCount(st, day)
    const ratio = c.due > 0 ? c.taken / c.due : 0
    return c.due === 0 ? '' : ratio >= 1 ? ' full' : ratio > 0 ? ' part' : ' zero'
  }

  return (
    <>
      <div className="ins-grid three">
        <StatBox label="day streak" value={String(stats.streak)} />
        <StatBox label="best run" value={String(stats.bestRun)} />
        <StatBox label="30-day rate" value={`${stats.rate30}%`} />
      </div>

      <div className="card">
        <div className="sn-hist-head">
          <span className="sn-hist-title">Week</span>
          <span className="sn-hist-nav">
            <button onClick={() => setWeekOff((o) => o - 1)} aria-label="Previous week">‹</button>
            <span className="num">{fmt(weekDays[0])} – {fmt(weekDays[6])}</span>
            <button onClick={() => setWeekOff((o) => Math.min(0, o + 1))} disabled={weekOff === 0} aria-label="Next week">›</button>
          </span>
        </div>
        <div className="sn-week">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((l) => <span key={l} className="sn-week-l">{l}</span>)}
          {weekDays.map((d) => {
            const c = dayCount(st, d)
            const future = d > today
            return (
              <div key={d} className={'sn-week-cell' + (d === today ? ' today' : '') + (future ? ' future' : '') + cellFor(d)}>
                <span className="d num">{Number(d.slice(-2))}</span>
                {!future && c.due > 0 && <span className="c num">{c.taken}/{c.due}</span>}
                {!future && c.due > 0 && <i />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div className="sn-hist-head">
          <span className="sn-hist-title">Month</span>
          <span className="sn-hist-nav">
            <button onClick={() => setMonthOff((o) => o - 1)} aria-label="Previous month">‹</button>
            <span className="num">{monthLabel}</span>
            <button onClick={() => setMonthOff((o) => Math.min(0, o + 1))} disabled={monthOff === 0} aria-label="Next month">›</button>
          </span>
        </div>
        <div className="sn-month">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <span key={i} className="sn-week-l">{l}</span>)}
          {Array.from({ length: firstCol }).map((_, i) => <span key={'e' + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = `${mYear}-${String(mMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
            const future = d > today
            return <div key={d} className={'sn-month-cell' + (d === today ? ' today' : '') + (future ? ' future' : '') + (future ? '' : cellFor(d))}><span className="num">{i + 1}</span></div>
          })}
        </div>
      </div>

      <div className="card">
        <div className="sn-hist-head"><span className="sn-hist-title">Consistency</span><span className="rs-foot" style={{ margin: 0 }}>last {heatWeeks} weeks</span></div>
        <div className="sn-heat">
          {Array.from({ length: heatWeeks }).map((_, w) => (
            <div key={w} className="sn-heat-col">
              {Array.from({ length: 7 }).map((_, r) => {
                const d = shiftDay(heatStart, w * 7 + r)
                if (d > today) return <span key={r} className="sn-heat-cell future" />
                return <span key={r} className={'sn-heat-cell' + (cellFor(d))} />
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="card guide">
        <p>
          <b>Reading the streak.</b> A day counts when everything due that day was taken — off days
          (no stacks followed) neither break nor extend it. The 30-day rate is the honest one:
          doses taken over doses due, gaps and all.
        </p>
      </div>
    </>
  )
}

/* ---------- LIBRARY ---------- */

function LibraryTab() {
  const st = useStore(sanaStore)
  const [open, setOpen] = useState<LibraryEntry | null>(null)
  const [picking, setPicking] = useState(false)
  const inStack = (e: LibraryEntry) => st.compounds.some((c) => c.name.toLowerCase() === e.name.toLowerCase())
  return (
    <>
      <h2 className="sn-h1">Library</h2>
      <p className="sn-sub">A reference shelf of common compounds — what they are, when people take them. Informational, never prescriptive.</p>
      {LIBRARY.map((e) => (
        <button key={e.name} className="card card-tap sn-comp" onClick={() => setOpen(e)}>
          <span className="sn-comp-glyph"><FormGlyph form={e.form} /></span>
          <div className="sn-comp-main">
            <div className="sn-comp-name">{e.name}{inStack(e) && <em className="sn-active">In your stack</em>}</div>
            <div className="sn-comp-dose num">{e.amount} {e.unit}<span className="chem"> · {e.chem}</span></div>
            <div className="sn-comp-note">{e.note}</div>
          </div>
          <span className="sn-chev">›</span>
        </button>
      ))}
      <Sheet open={open !== null} title={open?.name ?? ''} onClose={() => { setOpen(null); setPicking(false) }}>
        {open && !picking && (
          <>
            <div className="kv"><span className="k">Typical form</span><span>{FORMS.find((f) => f.id === open.form)?.label} · {open.amount} {open.unit}</span></div>
            <div className="kv"><span className="k">Usual slot</span><span>{SLOTS.find((s) => s.id === open.slot)?.label}</span></div>
            <p className="sn-note-line">{open.note}</p>
            <p className="guide-p">{open.info}</p>
            {open.caution && <div className="rs-warning" style={{ marginTop: 10 }}><b>Worth knowing.</b> {open.caution}</div>}
            {st.stacks.length > 0 && (
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setPicking(true)}>
                Add to a stack
              </button>
            )}
          </>
        )}
        {open && picking && (
          <>
            <p className="guide-p">Which stack should carry {open.name}?</p>
            {st.stacks.map((s) => (
              <button
                key={s.id}
                className="sn-follow-row"
                onClick={() => {
                  const already = st.compounds.find((c) => c.name.toLowerCase() === open.name.toLowerCase())
                  if (already) linkCompound(s.id, already.id)
                  else addCompound(s.id, { name: open.name, chem: open.chem, amount: open.amount, unit: open.unit, form: open.form, slot: open.slot, note: open.note })
                  toast(`${open.name} → ${s.name}`)
                  setOpen(null)
                  setPicking(false)
                }}
              >
                <span className="sn-stackrow-emoji" style={{ ['--sk' as string]: s.color } as CSSProperties}>{s.emoji}</span>
                <span className="sn-follow-name">{s.name}</span>
                <span className="sn-follow-state">Add ›</span>
              </button>
            ))}
          </>
        )}
      </Sheet>
    </>
  )
}

/* ---------- screen ---------- */

export default function SanaScreen({ tab = 'today' }: { tab?: string }) {
  if (tab === 'stacks') return <StacksTab />
  if (tab === 'history') return <HistoryTab />
  if (tab === 'library') return <LibraryTab />
  return <TodayTab onGoStacks={() => navigate('/m/sana/stacks')} />
}

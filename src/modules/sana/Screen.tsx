import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { eventsStore } from '../../core/events'
import { dayKey, todayKey, lastNDayKeys } from '../../core/dates'
import { toast } from '../../core/toast'
import { Sheet, ConfirmSheet, Empty, Seg, Field, parseNum, StatBox } from '../../app/ui'
import { Bars } from '../../app/charts'
import {
  sanaStore,
  SLOTS,
  ALL_DAYS,
  activeItems,
  dueOn,
  isTaken,
  takeDose,
  addItem,
  updateItem,
  archiveItem,
  refill,
  daysLeft,
  adherence,
  perfectDayStreak,
  LOW_STOCK_DAYS,
  type Item,
  type Slot,
  type Kind,
} from './model'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function KindGlyph({ kind }: { kind: Kind }) {
  return kind === 'medicine' ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="9" width="17" height="7" rx="3.5" stroke="currentColor" strokeWidth="1.8" transform="rotate(-35 12 12)" />
      <path d="M9.2 14.8l5.6-5.6" stroke="currentColor" strokeWidth="1.8" transform="rotate(-35 12 12)" />
    </svg>
  )
}

/* ---------- item form ---------- */

function ItemForm({ initial, onDone }: { initial?: Item; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [dose, setDose] = useState(initial?.doseLabel ?? '')
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'supplement')
  const [slots, setSlots] = useState<Slot[]>(initial?.slots ?? ['morning'])
  const [days, setDays] = useState<number[]>(initial?.days ?? [...ALL_DAYS])
  const [withFood, setWithFood] = useState<'with' | 'empty' | 'any'>(
    initial?.withFood ?? 'any',
  )
  const [stock, setStock] = useState(initial?.stock !== null && initial !== undefined ? String(initial.stock) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function toggleSlot(s: Slot) {
    setSlots((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
  }
  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()))
  }

  function save() {
    if (name.trim() === '') {
      toast('Give it a name')
      return
    }
    if (slots.length === 0) {
      toast('Pick at least one time of day')
      return
    }
    if (days.length === 0) {
      toast('Pick at least one weekday')
      return
    }
    const stockN = stock.trim() === '' ? null : parseNum(stock)
    const payload = {
      name,
      doseLabel: dose,
      kind,
      slots,
      days,
      withFood: withFood === 'any' ? null : withFood,
      stock: stockN !== null ? Math.round(stockN) : null,
      notes,
    }
    if (initial) {
      updateItem(initial.id, payload)
      toast('Updated')
    } else {
      addItem(payload)
      toast(`${name.trim()} added`)
    }
    onDone()
  }

  return (
    <>
      <Field label="Name">
        <input className="tinput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vitamin D3" />
      </Field>
      <Field label="Dose (as you'd say it)">
        <input className="tinput" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="5000 IU · 2 caps · half tab" />
      </Field>
      <Field label="Type">
        <Seg<Kind>
          options={[
            { id: 'supplement', label: 'Supplement' },
            { id: 'medicine', label: 'Medicine' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </Field>
      <Field label="Time of day">
        <div className="chips">
          {SLOTS.map((s) => (
            <button
              key={s.id}
              className={'chip' + (slots.includes(s.id) ? ' on' : '')}
              style={{ ['--chip-accent' as string]: 'var(--m-sana)' } as CSSProperties}
              onClick={() => toggleSlot(s.id)}
            >
              {s.glyph} {s.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Days">
        <div className="sn-days">
          {DAY_LABELS.map((l, i) => (
            <button
              key={i}
              className={'sn-day' + (days.includes(i) ? ' on' : '')}
              onClick={() => toggleDay(i)}
            >
              {l}
            </button>
          ))}
        </div>
      </Field>
      <Field label="With food?">
        <Seg<'with' | 'empty' | 'any'>
          options={[
            { id: 'any', label: 'Either' },
            { id: 'with', label: 'With food' },
            { id: 'empty', label: 'Empty stomach' },
          ]}
          value={withFood}
          onChange={setWithFood}
        />
      </Field>
      <Field label="Units in stock (optional)">
        <input
          className="tinput"
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="e.g. 60 — leave empty to skip"
        />
      </Field>
      <Field label="Notes (optional)">
        <input className="tinput" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prescribed by…, brand, why" />
      </Field>
      <div className="btn-row" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary" onClick={save}>{initial ? 'Save' : 'Add'}</button>
      </div>
    </>
  )
}

/* ---------- today ---------- */

function TodayTab({ onAdd }: { onAdd: () => void }) {
  const st = useStore(sanaStore)
  const today = todayKey()
  const due = dueOn(st, today)
  const takenCount = due.filter(({ item, slot }) => isTaken(st, item.id, slot, today)).length
  const hasMedicine = activeItems(st).some((i) => i.kind === 'medicine')

  if (activeItems(st).length === 0) {
    return (
      <>
        <Empty title="The cabinet is empty" sub="Add what you already take — SANA remembers the when, so mornings run on rails." />
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={onAdd}>Add the first one</button>
        </div>
      </>
    )
  }

  const pct = due.length > 0 ? takenCount / due.length : 1
  const R = 17
  const C = 2 * Math.PI * R

  return (
    <>
      <div className="card sn-head">
        <svg className="sn-ring" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r={R} fill="none" stroke="var(--line)" strokeWidth="4" />
          <circle
            cx="22" cy="22" r={R} fill="none"
            stroke="var(--m-sana)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${C * pct} ${C * (1 - pct)}`}
            transform="rotate(-90 22 22)"
          />
        </svg>
        <div>
          <div className="sn-head-count num">{takenCount} / {due.length}</div>
          <div className="sn-head-sub">{due.length === 0 ? 'nothing scheduled today' : takenCount === due.length ? 'all done — quiet cabinet' : 'doses today'}</div>
        </div>
      </div>

      {SLOTS.map((s) => {
        const rows = due.filter((d) => d.slot === s.id)
        if (rows.length === 0) return null
        return (
          <div key={s.id}>
            <div className="section-label">{s.glyph} {s.label}</div>
            {rows.map(({ item }) => {
              const taken = isTaken(st, item.id, s.id, today)
              const left = daysLeft(item)
              return (
                <div key={item.id + s.id} className="cdh-row sn-row" style={{ ['--h-accent' as string]: 'var(--m-sana)' } as CSSProperties}>
                  <button
                    className={'cdh-tile' + (taken ? ' done' : '')}
                    onClick={() => {
                      const took = takeDose(item.id, s.id)
                      if (took && item.stock !== null && item.stock - 1 <= 0) toast(`${item.name} — that was the last one`)
                    }}
                    aria-label={(taken ? 'Untake ' : 'Take ') + item.name}
                  >
                    <span className="sn-tile-glyph"><KindGlyph kind={item.kind} /></span>
                    <span className="cdh-tick">✓</span>
                  </button>
                  <div className="cdh-main">
                    <div className="cdh-name">
                      {item.name}
                      {item.withFood === 'with' && <span className="sn-tag">with food</span>}
                      {item.withFood === 'empty' && <span className="sn-tag">empty stomach</span>}
                    </div>
                    <div className="cdh-cue">
                      {item.doseLabel || (item.kind === 'medicine' ? 'as prescribed' : 'one serving')}
                      {left !== null && left <= LOW_STOCK_DAYS && (
                        <span className="sn-low"> · {left === 0 ? 'out of stock' : `${left}d left`}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {hasMedicine && (
        <p className="rs-foot">
          SANA is a memory aid, not a medical one — dose and timing decisions belong to you and your
          prescriber. If something feels off, that conversation beats any checklist.
        </p>
      )}
    </>
  )
}

/* ---------- stack ---------- */

function StackTab({ onAdd, onEdit }: { onAdd: () => void; onEdit: (it: Item) => void }) {
  const st = useStore(sanaStore)
  const items = activeItems(st)
  return (
    <>
      {items.length === 0 ? (
        <Empty title="Nothing in the stack" sub="Everything you add shows up on Today automatically." />
      ) : (
        items.map((it) => {
          const left = daysLeft(it)
          return (
            <div key={it.id} className="card sn-item">
              <div className="sn-item-head">
                <span className="sn-item-glyph"><KindGlyph kind={it.kind} /></span>
                <div className="sn-item-main">
                  <div className="sn-item-name">{it.name}</div>
                  <div className="sn-item-sub">
                    {it.doseLabel || '—'} · {it.slots.map((s) => SLOTS.find((x) => x.id === s)?.label).join(', ')}
                    {it.days.length < 7 && ` · ${it.days.map((d) => DAY_LABELS[d]).join('')}`}
                  </div>
                </div>
                <button className="linklike" onClick={() => onEdit(it)}>Edit</button>
              </div>
              {it.stock !== null && (
                <div className="sn-stock">
                  <span className={'num' + (left !== null && left <= LOW_STOCK_DAYS ? ' low' : '')}>
                    {it.stock} left{left !== null ? ` · ~${left}d` : ''}
                  </span>
                  <span className="sn-stock-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => refill(it.id, -1)}>−1</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => refill(it.id, 30)}>+30</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => refill(it.id, 90)}>+90</button>
                  </span>
                </div>
              )}
              {it.notes && <div className="sn-notes">{it.notes}</div>}
            </div>
          )
        })
      )}
      <div style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={onAdd}>Add item</button>
      </div>
      <div className="card guide" style={{ marginTop: 16 }}>
        <p>
          <b>Keep the stack short.</b> Adherence research is unambiguous: every extra daily item costs
          compliance on all the others. If it hasn't earned its slot, archive it.
        </p>
        <p>
          <b>Anchor to meals, not clocks.</b> "Morning" here means <i>with the first thing you already
          do</i> — fat-soluble supplements (D, K2, omega-3) absorb better with food anyway, which is
          what the "with food" tag is for.
        </p>
        <p>
          <b>Stock is the quiet feature.</b> Track units on anything you'd hate to run out of; SANA
          decrements on every tick and warns at {LOW_STOCK_DAYS} days so the refill happens before the gap.
        </p>
      </div>
    </>
  )
}

/* ---------- insights ---------- */

function InsightsTab() {
  const st = useStore(sanaStore)
  const events = useStore(eventsStore)
  if (activeItems(st).length === 0) {
    return <Empty title="No signal yet" sub="Insights appear once the stack has a few days of history." />
  }
  const a7 = adherence(st, 7)
  const a30 = adherence(st, 30)
  const streak = perfectDayStreak(st)
  const doses = events.filter((e) => e.module === 'sana' && e.kind === 'dose')
  const days = lastNDayKeys(14)
  const perDay = days.map((day) => ({
    label: day.slice(-2),
    value: doses.filter((e) => dayKey(e.ts) === day).length,
  }))
  return (
    <>
      <div className="ins-grid">
        <StatBox label="7-day adherence" value={`${a7.pct}%`} sub={`${a7.taken}/${a7.due} doses`} />
        <StatBox label="30-day adherence" value={`${a30.pct}%`} sub={`${a30.taken}/${a30.due} doses`} />
        <StatBox label="perfect days" value={`${streak}`} sub="current streak" />
        <StatBox label="doses logged" value={String(doses.length)} sub="all time" />
      </div>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-sana)' }}>Doses · last 14 days</span>
        </div>
        <Bars data={perDay} accentVar="var(--m-sana)" />
      </div>
      <div className="card">
        <div className="card-head">
          <span className="label" style={{ color: 'var(--m-sana)' }}>By item · 30 days</span>
        </div>
        {activeItems(st).map((it) => {
          const a = adherence(st, 30, todayKey(), it.id)
          return (
            <div key={it.id} className="sn-adh">
              <span className="sn-adh-name">{it.name}</span>
              <span className="sn-adh-bar">
                <i style={{ width: `${a.pct}%` }} />
              </span>
              <span className="num sn-adh-pct">{a.pct}%</span>
            </div>
          )
        })}
      </div>
      <div className="card guide">
        <p>
          <b>Read the per-item bars first.</b> Overall adherence hides the one item that's slipping —
          usually the evening slot, because evenings are chaos. If one bar lags, move it to a slot
          that's welded to an existing routine.
        </p>
      </div>
    </>
  )
}

/* ---------- screen ---------- */

export default function SanaScreen({ tab = 'today' }: { tab?: string }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<Item | null>(null)

  return (
    <>
      {tab === 'stack' ? (
        <StackTab onAdd={() => setAdding(true)} onEdit={(it) => setEditing(it)} />
      ) : tab === 'insights' ? (
        <InsightsTab />
      ) : (
        <TodayTab onAdd={() => setAdding(true)} />
      )}

      <Sheet open={adding} title="Add to the stack" onClose={() => setAdding(false)}>
        <ItemForm onDone={() => setAdding(false)} />
      </Sheet>

      <Sheet open={editing !== null} title="Edit item" onClose={() => setEditing(null)}>
        {editing && (
          <>
            <ItemForm key={editing.id} initial={editing} onDone={() => setEditing(null)} />
            <div style={{ marginTop: 10 }}>
              <button
                className="linklike danger"
                onClick={() => {
                  setConfirmArchive(editing)
                  setEditing(null)
                }}
              >
                Archive item
              </button>
            </div>
          </>
        )}
      </Sheet>

      <ConfirmSheet
        open={confirmArchive !== null}
        title={`Archive ${confirmArchive?.name ?? ''}?`}
        body="It leaves Today and the stack, but its history stays in your insights and events."
        actionLabel="Archive"
        danger
        onConfirm={() => {
          if (confirmArchive) {
            archiveItem(confirmArchive.id)
            toast('Archived')
          }
        }}
        onClose={() => setConfirmArchive(null)}
      />
    </>
  )
}

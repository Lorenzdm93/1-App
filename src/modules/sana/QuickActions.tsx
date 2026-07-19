import { useState } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { toast } from '../../core/toast'
import { ActionChip, Sheet } from '../../app/ui'
import { todayKey } from '../../core/dates'
import { sanaStore, dueOn, isTaken, takeMany, SLOTS } from './model'

export default function SanaQuickActions() {
  const st = useStore(sanaStore)
  const [open, setOpen] = useState(false)
  const today = todayKey()
  const due = dueOn(st, today)
  const left = due.filter(({ compound }) => !isTaken(st, compound.id, today)).length
  const method = st.logMethod ?? 'stack'
  return (
    <>
      <ActionChip
        accentVar="var(--m-sana)"
        label={left > 0 ? (method === 'stack' ? `Log stack · ${left} left` : `Log doses · ${left} left`) : 'All doses taken'}
        onClick={() => (left > 0 ? setOpen(true) : navigate('/m/sana'))}
      />
      <Sheet open={open} title={method === 'stack' ? 'Log a stack' : 'Log by time of day'} onClose={() => setOpen(false)}>
        {method === 'stack'
          ? st.stacks.map((s) => {
              const ids = s.compoundIds.filter((id) => due.some((d) => d.compound.id === id))
              const remaining = ids.filter((id) => !isTaken(st, id, today))
              if (ids.length === 0) return null
              return (
                <button
                  key={s.id}
                  className="gh-choose"
                  onClick={() => {
                    const n = takeMany(remaining, today)
                    toast(n > 0 ? `${s.name} — ${n} taken` : `${s.name} already complete`)
                    setOpen(false)
                  }}
                >
                  <b>{s.emoji} {s.name}</b>
                  <span>{ids.length - remaining.length}/{ids.length} taken today</span>
                </button>
              )
            })
          : SLOTS.map((slot) => {
              const rows = due.filter((d) => d.compound.slot === slot.id)
              const remaining = rows.filter((r) => !isTaken(st, r.compound.id, today))
              if (rows.length === 0) return null
              return (
                <button
                  key={slot.id}
                  className="gh-choose"
                  onClick={() => {
                    const n = takeMany(remaining.map((r) => r.compound.id), today)
                    toast(n > 0 ? `${slot.label} — ${n} taken` : `${slot.label} already complete`)
                    setOpen(false)
                  }}
                >
                  <b>{slot.glyph} {slot.label}</b>
                  <span>{rows.length - remaining.length}/{rows.length} taken today</span>
                </button>
              )
            })}
      </Sheet>
    </>
  )
}

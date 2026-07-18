import type { CSSProperties } from 'react'
import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { todayKey } from '../../core/dates'
import { sanaStore, dueOn, isTaken } from './model'

export default function SanaQuickActions() {
  const st = useStore(sanaStore)
  const today = todayKey()
  const remaining = dueOn(st, today).filter(({ item, slot }) => !isTaken(st, item.id, slot, today)).length
  if (remaining === 0) return null
  return (
    <button className="qa" style={{ ["--qa-accent" as string]: "var(--m-sana)" } as CSSProperties} onClick={() => navigate('/m/sana/today')}>
      <span className="qa-dot" />
      {remaining} dose{remaining === 1 ? '' : 's'} left today
    </button>
  )
}

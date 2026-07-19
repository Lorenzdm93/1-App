import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { ActionChip } from '../../app/ui'
import { oraStore, beginFast, protocolById } from './model'

export default function OraQuickActions() {
  const st = useStore(oraStore)
  return (
    <ActionChip
      accentVar="var(--m-ora)"
      label={st.current ? 'Return to the fast' : `Begin ${protocolById(st.protocolId).name} fast`}
      onClick={() => {
        if (!st.current) beginFast()
        navigate('/m/ora/timer')
      }}
    />
  )
}

import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { ActionChip } from '../../app/ui'
import { ghisaStore, startSession } from './model'

export default function GhisaQuickActions() {
  const st = useStore(ghisaStore)
  return (
    <ActionChip
      accentVar="var(--m-ghisa)"
      label={st.active ? 'Resume session' : 'Start workout'}
      onClick={() => {
        if (!st.active) startSession()
        navigate('/m/ghisa')
      }}
    />
  )
}

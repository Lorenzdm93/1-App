import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { ActionChip } from '../../app/ui'
import { groveStore, startFocus } from './model'

export default function GroveQuickActions() {
  const st = useStore(groveStore)
  return (
    <ActionChip
      accentVar="var(--m-grove)"
      label={st.running ? 'Return to focus' : 'Focus 25 min'}
      onClick={() => {
        if (!st.running) startFocus(25)
        navigate('/m/grove/focus')
      }}
    />
  )
}

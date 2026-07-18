import { useStore } from '../../core/hooks'
import { navigate } from '../../core/router'
import { ActionChip } from '../../app/ui'
import { groveStore, setMode, setFocusMinutes, start } from './model'

export default function GroveQuickActions() {
  const st = useStore(groveStore)
  return (
    <ActionChip
      accentVar="var(--m-grove)"
      label={st.running ? 'Return to focus' : 'Focus 25 min'}
      onClick={() => {
        if (!st.running) {
          setMode('focus')
          setFocusMinutes(25)
          start()
        }
        navigate('/m/grove/focus')
      }}
    />
  )
}

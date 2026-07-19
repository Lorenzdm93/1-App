import { navigate } from '../../core/router'
import { ActionChip } from '../../app/ui'

export default function RespiroQuickActions() {
  return (
    <ActionChip
      accentVar="var(--m-respiro)"
      label="Start breathwork"
      onClick={() => navigate('/m/respiro')}
    />
  )
}

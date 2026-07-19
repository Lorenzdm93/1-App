import { navigate } from '../../core/router'
import { ActionChip } from '../../app/ui'

export default function CaliberQuickActions() {
  return (
    <ActionChip
      accentVar="var(--m-caliber)"
      label="Log a strength set"
      onClick={() => navigate('/m/caliber')}
    />
  )
}

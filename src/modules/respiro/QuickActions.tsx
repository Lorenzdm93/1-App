import { navigate } from '../../core/router'
import { ActionChip } from '../../app/ui'
import { requestAutostart } from './model'

function begin(id: string) {
  requestAutostart(id)
  navigate('/m/respiro')
}

export default function RespiroQuickActions() {
  return (
    <>
      <ActionChip accentVar="var(--m-respiro)" label="Box · begin" onClick={() => begin('box')} />
      <ActionChip accentVar="var(--m-respiro)" label="4-7-8 · begin" onClick={() => begin('relax478')} />
    </>
  )
}

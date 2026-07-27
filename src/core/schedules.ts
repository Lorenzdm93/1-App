/**
 * Scheduled alerts, kept in sync with the timers that own them.
 *
 * WHY A SUBSCRIPTION, NOT LIFECYCLE HOOKS
 * A focus session can change through start, pause, resume, reset, skip, give
 * up and natural completion; a fast through begin, start-time correction and
 * end. Hooking each one means a missed path leaves a stale alert that fires
 * at the wrong moment. Instead this watches the stores and re-derives what
 * should be pending whenever state changes — the module models are not
 * touched at all, so no timer logic can break.
 *
 * Everything here is native-only. On the web `canScheduleAhead()` is false
 * and every function returns immediately, because a browser cannot wake a
 * closed page.
 */
import { groveStore } from '../modules/grove/model'
import { oraStore, STAGES } from '../modules/ora/model'
import { notifyStore, scheduleAt, cancelKeys, cancelModule, canScheduleAhead } from './notify'

const HOUR = 3_600_000

let lastGrove = ''
let lastOra = ''

function syncGrove(): void {
  if (!canScheduleAhead()) return
  const r = groveStore.get().running
  const key = r ? `${r.mode}:${r.endTs}:${r.pausedAt ?? 0}` : 'idle'
  if (key === lastGrove) return
  lastGrove = key
  cancelKeys(['grove:end'])
  /* paused sessions have no honest end time yet */
  if (!r || r.pausedAt !== null) return
  const focus = r.mode === 'focus'
  scheduleAt(
    'grove',
    'grove:end',
    focus ? 'GROVE · Session complete' : 'GROVE · Break over',
    focus ? 'Your tree is planted. Step away for a moment.' : 'Back to it — the next session is waiting.',
    r.endTs,
  )
}

function syncOra(): void {
  if (!canScheduleAhead()) return
  const c = oraStore.get().current
  const key = c ? `${c.startTs}:${c.targetH}` : 'idle'
  if (key === lastOra) return
  lastOra = key
  cancelModule('ora')
  if (!c) return
  const targetAt = c.startTs + c.targetH * HOUR
  const hrs = Math.round(c.targetH * 10) / 10
  scheduleAt('ora', 'ora:target', 'ORA · Target reached', `${hrs}h complete — break whenever you're ready.`, targetAt)
  STAGES.forEach((s, i) => {
    if (s.fromH <= 0) return
    const at = c.startTs + s.fromH * HOUR
    /* don't stack an alert on top of the target, and don't narrate a day
       past the goal for someone who simply forgot to close the fast */
    if (Math.abs(at - targetAt) < 120_000) return
    if (at > targetAt + 24 * HOUR) return
    scheduleAt('ora', `ora:stage:${i}`, `ORA · ${s.name}`, s.note, at)
  })
}

/** Called once at boot. Safe on every platform. */
export function wireScheduledNotifications(): void {
  groveStore.subscribe(syncGrove)
  oraStore.subscribe(syncOra)
  /* permission or per-module toggles changed — re-derive from scratch */
  notifyStore.subscribe(() => {
    lastGrove = ''
    lastOra = ''
    syncGrove()
    syncOra()
  })
  syncGrove()
  syncOra()
}

import { useEffect, useState } from 'react'
import { useStore } from '../../core/hooks'
import { toast } from '../../core/toast'
import { ConfirmSheet, Empty } from '../../app/ui'
import TreeSVG from './TreeSVG'
import {
  groveStore,
  startFocus,
  giveUp,
  maybeComplete,
  progress,
  todayStats,
  totalMinutes,
  jitter,
  speciesFor,
  PRESETS,
} from './model'

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s < 10 ? '0' + s : s}`
}

function FocusTab() {
  const st = useStore(groveStore)
  const [now, setNow] = useState(() => Date.now())
  const [minutes, setMinutes] = useState(25)
  const [confirmQuit, setConfirmQuit] = useState(false)

  const running = st.running

  useEffect(() => {
    const grown = maybeComplete()
    if (grown) toast(`A ${grown.species} grew — ${grown.minutes} min in the forest`)
    if (!running) return
    const t = setInterval(() => {
      setNow(Date.now())
      const g = maybeComplete()
      if (g) toast(`A ${g.species} grew — ${g.minutes} min in the forest`)
    }, 500)
    return () => clearInterval(t)
  }, [running])

  if (running) {
    const p = progress(running, now)
    return (
      <>
        <div className="card gr-stage">
          <TreeSVG species={speciesFor(running.minutes)} growth={p} size={210} sway />
          <div className="gr-time num">{mmss(running.endTs - now)}</div>
          <div className="gr-sub">
            {running.minutes} min of focus — the tree grows only if you stay.
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => setConfirmQuit(true)}>
          Give up
        </button>
        <ConfirmSheet
          open={confirmQuit}
          title="Abandon this focus?"
          body="The tree withers. Nothing is logged."
          actionLabel="Let it wither"
          danger
          onConfirm={() => {
            giveUp()
            toast('The sapling withered')
          }}
          onClose={() => setConfirmQuit(false)}
        />
      </>
    )
  }

  return (
    <>
      <div className="card gr-stage">
        <TreeSVG species={speciesFor(minutes)} growth={0.12} size={210} />
        <div className="gr-time num">{minutes}:00</div>
        <div className="gr-sub">Pick a length. Deep focus grows a tree.</div>
      </div>
      <div className="chips">
        {PRESETS.map((p) => (
          <button
            key={p}
            className={'chip' + (p === minutes ? ' on' : '')}
            onClick={() => setMinutes(p)}
          >
            {p} min
          </button>
        ))}
      </div>
      <div className="gr-custom">
        <button onClick={() => setMinutes((m) => Math.max(5, m - 5))} aria-label="Five minutes less">
          −5
        </button>
        <span className="num">{minutes} min</span>
        <button onClick={() => setMinutes((m) => Math.min(180, m + 5))} aria-label="Five minutes more">
          +5
        </button>
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            startFocus(minutes)
            toast('Focus started — leave the phone alone')
          }}
        >
          Plant · begin focus
        </button>
      </div>
    </>
  )
}

function ForestTab() {
  const st = useStore(groveStore)
  const today = todayStats(st.trees)
  const total = totalMinutes(st.trees)
  if (st.trees.length === 0) {
    return <Empty title="No trees yet" sub="Finish a focus session and the first one takes root." />
  }
  return (
    <>
      <div className="card">
        <div className="w-stat-row">
          <div className="w-stat">
            <div className="v num">{st.trees.length}</div>
            <div className="k">trees</div>
          </div>
          <div className="w-stat">
            <div className="v num">{Math.round((total / 60) * 10) / 10}h</div>
            <div className="k">total focus</div>
          </div>
          <div className="w-stat">
            <div className="v num">{today.minutes}m</div>
            <div className="k">today</div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="gr-forest">
          {st.trees.slice(0, 84).map((t) => (
            <span
              key={t.id}
              className="gr-tree"
              style={{ transform: `scale(${0.82 + jitter(t.id) * 0.3})` }}
              title={`${t.minutes} min`}
            >
              <TreeSVG species={t.species} growth={1} size={34} />
            </span>
          ))}
        </div>
        <div className="cd-heat-label">Newest first — birch under 30 min, pine to an hour, oak beyond.</div>
      </div>
    </>
  )
}

export default function GroveScreen({ tab = 'focus' }: { tab?: string }) {
  return tab === 'forest' ? <ForestTab /> : <FocusTab />
}

/**
 * Error containment for the shell. A module that throws during render must
 * never black out the whole app — it gets a contained card that names the
 * error (so a screenshot is a bug report), with a retry that remounts it.
 * `compact` renders a one-line fallback for dashboard widgets.
 */
import { Component, type ReactNode } from 'react'
import { navigate } from '../core/router'

interface Props {
  name: string
  compact?: boolean
  children: ReactNode
}
interface State {
  error: Error | null
  attempt: number
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error): void {
    // Surface in the console too — devtools users get the full stack.
    console.error(`[1%] ${this.props.name} crashed:`, error)
  }

  render() {
    const { error, attempt } = this.state
    if (error === null) {
      // key forces a clean remount after "Try again"
      return <span key={attempt} style={{ display: 'contents' }}>{this.props.children}</span>
    }
    if (this.props.compact) {
      return <div className="w-line err-line">{this.props.name} hit an error — open the module for details.</div>
    }
    return (
      <div className="card err-card">
        <div className="err-title">{this.props.name} hit an error</div>
        <div className="err-msg">{error.message || String(error)}</div>
        <p className="err-note">
          Your data is safe — this is a display error, caught before it could take the app down.
          A screenshot of this card is a perfect bug report.
        </p>
        <div className="err-actions">
          <button className="btn" onClick={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}>
            Try again
          </button>
          <button className="btn btn-ghost" onClick={() => { this.setState((s) => ({ error: null, attempt: s.attempt + 1 })); navigate('/') }}>
            Back to Today
          </button>
        </div>
      </div>
    )
  }
}

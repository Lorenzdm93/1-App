import type { ComponentType } from 'react'

export interface ModuleTab {
  id: string
  label: string
  /** Small inline SVG mark rendered in the module tab bar. */
  Icon?: ComponentType<{ size?: number }>
}

/**
 * The contract every module implements. Modules never import each other;
 * they talk to the platform through storage namespaces and metric events.
 */
export interface ModuleDefinition {
  /** Stable id — also the storage namespace and the `module` field on events. */
  id: string
  /** Display name shown in navigation and on the dashboard. */
  name: string
  /** One-line description shown in the module manager. */
  tagline: string
  /** CSS custom property carrying the module accent, e.g. 'var(--m-ghisa)'. */
  accentVar: string
  /** Bump when the module's storage schema changes; pair with `migrate`. */
  schemaVersion: number
  /** Small inline SVG mark. */
  Icon: ComponentType<{ size?: number }>
  /**
   * Optional internal bottom tabs. When present, the shell replaces the
   * global tab bar with these while inside the module — each module can be
   * a small app of its own; leaving restores the 1% bar.
   */
  tabs?: readonly ModuleTab[]
  /** Full-screen module UI. Receives the active internal tab when `tabs` is set. */
  Screen: ComponentType<{ tab?: string }>
  /** Compact card content for the Today dashboard. May be interactive. */
  Widget: ComponentType
  /** Optional chip row rendered under the widget — one-tap actions from Today. */
  QuickActions?: ComponentType
}

/**
 * One unified stream of "something happened" across all modules.
 * Streaks, the daily ring, weekly stats and future insights all read
 * from this log instead of knowing each module's internal format.
 */
export interface MetricEvent {
  id: string
  module: string
  kind: string
  ts: number
  value?: number
  unit?: string
  meta?: Record<string, unknown>
}

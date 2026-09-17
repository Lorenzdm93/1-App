/**
 * The AI layer's vocabulary. Three shapes:
 *
 *   Digest   — a compact, numbers-only snapshot the app computes locally.
 *              This is the ONLY thing that ever goes to a cloud provider.
 *   Signal   — a meaningful change the local gate detected. Drives both the
 *              "should we even call an LLM?" decision and the local provider.
 *   Insight  — the rendered card. Every provider returns this exact struct,
 *              so the UI never sees raw model text.
 */

export type InsightType =
  | 'trend'
  | 'regression'
  | 'improvement'
  | 'correlation'
  | 'opportunity'
  | 'goal'

export type Confidence = 'high' | 'medium' | 'low'

export interface Insight {
  id: string
  type: InsightType
  title: string
  observation: string
  context?: string
  recommendation: string
  confidence: Confidence
  /** Module this points at, for tap-through. null = cross-module or overall. */
  moduleId?: string | null
  accentVar?: string | null
}

/** One module's numbers, current period vs its own recent history. */
export interface DigestModule {
  id: string
  name: string
  label: string
  unit: string
  mode: 'growth' | 'completion' | 'event'
  /** This week so far (native units for growth; 0–100 for completion/event). */
  cur: number
  /** Last full week, same measure. null if none. */
  prev: number | null
  /** Percent change cur vs prev. null if no prev. */
  deltaPct: number | null
  /** This week's engine target (growth only). */
  target: number | null
  /** How far under target, native units. */
  gap: number
  met: boolean
  /** Current week score, 0–120. null = sitting the week out. */
  scoreNow: number | null
  /** Closed-week scores, oldest→newest, up to 8. */
  trendScores: number[]
  /** mean(last 4 closed) − mean(prior 4 closed), score points. null if thin. */
  trend4v4: number | null
  /** Consecutive closed weeks of activity backing this module. */
  weeksTracked: number
  /** The module's own coaching line for this week, if under pace. */
  advice: string | null
}

export interface Digest {
  today: string
  weekStart: string
  overallScore: number | null
  wonWeeks: number
  compoundPct: number
  closedWeeks: number
  /** Overall closed-week scores, oldest→newest, up to 8. */
  overallTrend: number[]
  /** Consecutive won weeks counting back from the most recent closed week. */
  wonStreak: number
  firstWeek: boolean
  /** Days into the current week, 0 (Mon) … 6 (Sun). 6 = the week is complete. */
  daysElapsed: number
  modules: DigestModule[]
}

export type SignalKind =
  | 'regression'
  | 'improvement'
  | 'opportunity'
  | 'streak'
  | 'plateau'
  | 'divergence'
  | 'goal'

export interface Signal {
  kind: SignalKind
  /** Primary module, or null for overall/cross-module. */
  moduleId: string | null
  /** 0–1, higher = more worth surfacing. */
  severity: number
  /** Free-form data the local provider turns into prose. */
  data: Record<string, unknown>
}

export interface InsightProvider {
  id: string
  label: string
  /** Never throws — a provider that fails returns []. */
  generate(digest: Digest, signals: Signal[]): Promise<Insight[]>
}

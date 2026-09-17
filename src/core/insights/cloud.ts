/**
 * The LLM providers. Both send only the numeric digest (via digestForTransport)
 * and return the same Insight[] struct the local provider does. Either one that
 * fails — no key, bad URL, CORS, timeout, malformed JSON — returns [] so the
 * engine falls back to the local heuristics and the user always sees something.
 *
 * cloud   → posts the digest to your Worker (worker/insights.js), which holds
 *           the key. Nothing secret is in the app.
 * ownkey  → calls Anthropic/OpenAI directly with the user's own key. Advanced,
 *           opt-in; the key stays on-device (config.ts).
 */
import { digestForTransport } from './digest'
import { getOwnKey, insightsConfigStore } from './config'
import type { Confidence, Digest, Insight, InsightProvider, InsightType, Signal } from './types'

const TYPES = new Set<InsightType>(['trend', 'regression', 'improvement', 'correlation', 'opportunity', 'goal'])
const CONFS = new Set<Confidence>(['high', 'medium', 'low'])
const TIMEOUT_MS = 20000
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const OPENAI_MODEL = 'gpt-4o-mini'

export const SYSTEM_PROMPT = `You are the insight engine inside "1%", a personal-improvement app. You receive a compact JSON digest of ONE user's weekly numbers across their enabled modules (workouts, focus, breathwork, supplements, fasting, strength, habits). Each number is already computed; your job is interpretation, never arithmetic.

Return ONLY a JSON array (no prose, no markdown fences) of 1 to 3 objects, each:
{"type": "trend|regression|improvement|correlation|opportunity|goal",
 "title": "short, specific",
 "observation": "what the numbers show, with the actual figures",
 "context": "optional one clause of nuance",
 "recommendation": "one concrete action for THIS week",
 "confidence": "high|medium|low",
 "module": "the module name this concerns, or null"}

Rules:
- Prioritise the most meaningful change; ignore noise and tiny wiggles.
- Never invent correlations. If two things moved together, say so as co-occurrence and note it may not be causal.
- Use ONLY the supplied numbers. Do not assume anything not present.
- No generic self-improvement advice — every recommendation must reference this user's actual data.
- Prefer specific, small, achievable actions over ambition.
- confidence reflects how much history backs the claim (weeks field).
- Return at most 3. Fewer is better if only one thing truly matters. If nothing is meaningful, return [].`

function coerce(raw: unknown, digest: Digest): Insight[] {
  let arr: unknown = raw
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim()
    arr = JSON.parse(cleaned)
  }
  if (arr && typeof arr === 'object' && !Array.isArray(arr) && 'insights' in (arr as object)) {
    arr = (arr as { insights: unknown }).insights
  }
  if (!Array.isArray(arr)) return []
  const nameToId = new Map(digest.modules.map((m) => [m.name.toLowerCase(), m.id]))
  const out: Insight[] = []
  for (const item of arr.slice(0, 3)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const type = TYPES.has(o.type as InsightType) ? (o.type as InsightType) : 'trend'
    const confidence = CONFS.has(o.confidence as Confidence) ? (o.confidence as Confidence) : 'medium'
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const observation = typeof o.observation === 'string' ? o.observation.trim() : ''
    const recommendation = typeof o.recommendation === 'string' ? o.recommendation.trim() : ''
    if (!title || !observation || !recommendation) continue
    const moduleName = typeof o.module === 'string' ? o.module.toLowerCase() : null
    const moduleId = moduleName ? nameToId.get(moduleName) ?? null : null
    out.push({
      id: `${digest.weekStart}:llm:${out.length}`,
      type,
      title,
      observation,
      context: typeof o.context === 'string' && o.context.trim() ? o.context.trim() : undefined,
      recommendation,
      confidence,
      moduleId,
    })
  }
  return out
}

async function withTimeout(fn: (signal: AbortSignal) => Promise<Response>): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fn(ctrl.signal)
  } finally {
    clearTimeout(t)
  }
}

export const cloudProvider: InsightProvider = {
  id: 'cloud',
  label: 'Cloud AI (1% service)',
  async generate(digest) {
    const url = insightsConfigStore.get().cloudUrl
    if (!url) return []
    try {
      const res = await withTimeout((signal) =>
        fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ digest: digestForTransport(digest) }),
          signal,
        }),
      )
      if (!res.ok) return []
      return coerce(await res.json(), digest)
    } catch {
      return []
    }
  },
}

export const ownKeyProvider: InsightProvider = {
  id: 'ownkey',
  label: 'My own API key',
  async generate(digest) {
    const key = getOwnKey()
    if (!key) return []
    const vendor = insightsConfigStore.get().ownKeyVendor
    const userContent = `Here is the digest. Return the JSON array only.\n\n${JSON.stringify(digestForTransport(digest))}`
    try {
      if (vendor === 'anthropic') {
        const res = await withTimeout((signal) =>
          fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: ANTHROPIC_MODEL,
              max_tokens: 1024,
              system: SYSTEM_PROMPT,
              messages: [{ role: 'user', content: userContent }],
            }),
            signal,
          }),
        )
        if (!res.ok) return []
        const data = await res.json()
        const text = Array.isArray(data.content)
          ? data.content.map((b: { text?: string }) => b.text ?? '').join('')
          : ''
        return coerce(text, digest)
      }
      // openai
      const res = await withTimeout((signal) =>
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            max_tokens: 1024,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userContent },
            ],
          }),
          signal,
        }),
      )
      if (!res.ok) return []
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      return coerce(text, digest)
    } catch {
      return []
    }
  },
}

/** Exposed for a "test connection" button in Settings. */
export async function tryProvider(p: InsightProvider, digest: Digest, signals: Signal[]): Promise<Insight[]> {
  return p.generate(digest, signals)
}

/**
 * Generic one-shot LLM call reused outside insights (e.g. natural-language
 * capture). Own-key only for now — the cloud Worker is insight-specific.
 * Returns the model's raw text, or null when unavailable/failed.
 */
export async function runLLM(system: string, user: string): Promise<string | null> {
  const cfg = insightsConfigStore.get()
  if (!cfg.enabled || cfg.providerId !== 'ownkey') return null
  const key = getOwnKey()
  if (!key) return null
  try {
    if (cfg.ownKeyVendor === 'anthropic') {
      const res = await withTimeout((signal) =>
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 1024,
            system,
            messages: [{ role: 'user', content: user }],
          }),
          signal,
        }),
      )
      if (!res.ok) return null
      const data = await res.json()
      return Array.isArray(data.content) ? data.content.map((b: { text?: string }) => b.text ?? '').join('') : null
    }
    const res = await withTimeout((signal) =>
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal,
      }),
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

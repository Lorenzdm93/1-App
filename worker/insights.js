/**
 * 1% — insights Worker (Cloudflare).
 *
 * The app posts a numbers-only digest here; this Worker holds the API key and
 * calls the model, so the key is never in the app bundle. Deploy is a few
 * minutes — see worker/README.md.
 *
 * It returns { insights: [...] } (max 3). On any failure it returns
 * { insights: [] } so the app falls back to its on-device heuristics.
 */

const SYSTEM_PROMPT = `You are the insight engine inside "1%", a personal-improvement app. You receive a compact JSON digest of ONE user's weekly numbers across their enabled modules (workouts, focus, breathwork, supplements, fasting, strength, habits). Each number is already computed; your job is interpretation, never arithmetic.

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

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  let allow = '*'
  if (allowed.length > 0) allow = allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin, env)
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (request.method !== 'POST') return json({ insights: [] }, 405, cors)

    let body
    try {
      body = await request.json()
    } catch {
      return json({ insights: [] }, 400, cors)
    }
    const digest = body && body.digest
    if (!digest) return json({ insights: [] }, 400, cors)
    if (!env.ANTHROPIC_API_KEY) return json({ insights: [] }, 500, cors)

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: env.MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: `Here is the digest. Return the JSON array only.\n\n${JSON.stringify(digest)}` },
          ],
        }),
      })
      if (!r.ok) return json({ insights: [] }, 200, cors)
      const data = await r.json()
      const text = Array.isArray(data.content) ? data.content.map((b) => b.text || '').join('') : ''
      let insights = []
      try {
        insights = JSON.parse(text.replace(/```json\s*|\s*```/g, '').trim())
      } catch {
        insights = []
      }
      if (!Array.isArray(insights)) insights = []
      return json({ insights: insights.slice(0, 3) }, 200, cors)
    } catch {
      return json({ insights: [] }, 200, cors)
    }
  },
}

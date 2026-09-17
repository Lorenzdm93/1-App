# 1% — AI insights layer

The app turns tracking into **interpretation**: it computes a compact numeric
digest on-device, decides whether anything meaningful changed, and — only then —
produces 1–3 structured insight cards. Three providers, one interface:

| provider | where it runs | key needed | cost | data leaving device |
|---|---|---|---|---|
| **on-device** (default) | in the app, heuristics | none | €0 | nothing |
| **cloud** | your Cloudflare Worker → Anthropic | in the Worker | ~€0.005/user/week | numbers-only digest |
| **own key** | app → Anthropic/OpenAI directly | user's own | user pays | numbers-only digest |

On-device ships **on** and needs nothing. The other two are opt-in.

## What the digest contains

Only numbers — per module: this-week-vs-last deltas, the engine target, the
weekly-score trend, weeks tracked. **No raw logs, no dates of individual
sessions, no identifiers, no name.** See `digestForTransport()` in
`src/core/insights/digest.ts` — that function's output is the entire payload.

## Provider policies (verified Sep 2026 — re-check before launch)

Both Anthropic and OpenAI **do not train on API traffic by default** and delete
it within ~30 days (abuse-monitoring). True zero-retention is enterprise-only on
both, so don't promise it. For the EU release, cloud AI must stay **opt-in, off
by default, disable-able** — which it is.

## Deploy the cloud Worker (~5 min)

Prerequisites: a Cloudflare account (free) and Node.

```bash
npm i -g wrangler
wrangler login
cd worker
# create wrangler.toml (see below), then:
wrangler secret put ANTHROPIC_API_KEY      # paste your key when prompted
wrangler deploy insights.js
```

Minimal `wrangler.toml`:

```toml
name = "onepercent-insights"
main = "insights.js"
compatibility_date = "2026-01-01"

[vars]
# Lock this to your app origin(s) once deployed — comma separated.
# Leave unset during testing to allow all origins.
ALLOWED_ORIGINS = "https://lorenzdm93.github.io"
# Optional model override; defaults to Haiku.
# MODEL = "claude-haiku-4-5-20251001"
```

`wrangler deploy` prints a URL like
`https://onepercent-insights.<you>.workers.dev`. Paste it into the app:
**Settings → Insights → Cloud → Worker URL**. Done.

## Cost

With the compact digest (~2k in / ~0.5k out) on Haiku ($1/$5 per Mtok):
~€0.005 per generation. Weekly cadence + the "only when something changed" gate
means many weeks cost **nothing**. Cloudflare's free tier (100k req/day) covers
you for a very long time.

## The pipeline (for reference)

```
all module data
   → buildDigest()        compact numeric snapshot (local)
   → detectSignals()      the gate: anything meaningful? (local)
        no  → cache silence for the week, no call
        yes → provider.generate()   local | cloud | own-key
   → 1–3 Insight cards, rendered from a fixed struct (never raw model text)
```

Cadence: the on-device provider refreshes as the week's numbers move (it's
free); the LLM providers run weekly, on manual refresh, or when you switch
provider. If an LLM returns nothing or fails, the app falls back to on-device,
so there is always something to show.

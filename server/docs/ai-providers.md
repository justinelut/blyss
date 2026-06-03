# AI providers — multi-provider chain

The org-review analyzer (`server/polar/organization_review/analyzer.py`)
chains every available AI provider via pydantic-ai's `FallbackModel`. Set
any subset of provider keys and the analyzer auto-builds a chain that
runs them in **free-tier-first, paid-last** order — so a 429 on one
provider transparently rolls over to the next.

This means you don't have to commit to a single provider. Mix free-tier
keys for redundancy, drop in a paid OpenAI key as the last-resort
fallback, and the analyzer picks the cheapest one that's available on
each call.

## Provider matrix

Order in the chain matches the order in the table:

| # | Provider | Model (default) | Free tier | Where to get a key |
| --- | --- | --- | --- | --- |
| 1 | **Groq** | `llama-3.3-70b-versatile` | ~30 req/min, ~14k req/day | [console.groq.com](https://console.groq.com) |
| 2 | **Cerebras** | `llama-3.3-70b` | ~30 req/min, ~14k req/day, fastest inference on the planet | [cloud.cerebras.ai](https://cloud.cerebras.ai) |
| 3 | **OpenRouter** | `meta-llama/llama-3.3-70b-instruct:free` | 20 req/min, 200 req/day on `:free` models | [openrouter.ai](https://openrouter.ai) |
| 4 | **Google Gemini** | `gemini-2.0-flash` | 15 req/min, 1500 req/day | [aistudio.google.com](https://aistudio.google.com) |
| 5 | **OpenAI** | `gpt-4o-mini` | none (paid only) | [platform.openai.com](https://platform.openai.com) |

For our use case (one analyzer call per org submission, ~5k tokens per
call), the **Groq + OpenRouter** pair alone gives ~14,200 free analyzer
calls per day across both — more than enough for any plausible Blyss
volume in 2026.

## How to add a key

1. **Validate the key locally first** — never push a key that hasn't
   been verified against the live API:

   ```bash
   cd server
   uv run python scripts/validate_ai_keys.py <provider> '<key>'
   ```

   Where `<provider>` is one of: `gemini`, `groq`, `openrouter`,
   `cerebras`, `openai`. Exit codes:

   | Code | Meaning |
   | --- | --- |
   | 0 | key valid — push the rotation |
   | 1 | rejected (4xx) — abort, ask for a real key |
   | 2 | bad invocation — usage error |
   | 3 | network error — retry / abort |
   | 4 | malformed 200 — provider returned no completion |
   | 5 | 429 quota exhausted — key OK, project rate-limited |

   The script never echoes the key in stdout or stderr (verified by
   `tests/scripts/test_validate_ai_keys.py`).

2. **Push as a GitHub Actions secret** — pick the matching name:

   | Provider | GH secret name |
   | --- | --- |
   | Gemini | `GEMINI_API_KEY` |
   | Groq | `GROQ_API_KEY` |
   | OpenRouter | `OPENROUTER_API_KEY` |
   | Cerebras | `CEREBRAS_API_KEY` |
   | OpenAI | `OPENAI_API_KEY` |

   ```bash
   gh secret set GROQ_API_KEY -R justinelut/blyss --body '<key>'
   ```

3. **Redeploy** — `.github/workflows/deploy.yml` already injects every
   one of these secrets into the cluster env file as the matching
   `POLAR_*_API_KEY` variable. A no-op commit is enough to trigger:

   ```bash
   git commit --allow-empty -m "chore: rotate <provider> key"
   git push origin master
   ```

   The deploy step logs which providers are configured:

   ```
   AI providers configured:
     POLAR_GROQ_API_KEY: set
     POLAR_CEREBRAS_API_KEY: unset
     POLAR_OPENROUTER_API_KEY: set
     POLAR_GOOGLE_AI_API_KEY: set
     POLAR_OPENAI_API_KEY: unset
   ```

## How the chain actually behaves

- With **0 keys** set, the analyzer raises `ValueError` at startup.
  The pod will fail readiness — the deploy log + diagnose workflow
  surface this clearly.
- With **1 key** set, the analyzer uses that provider's bare `Model`
  directly. No `FallbackModel` overhead.
- With **2+ keys** set, the analyzer wraps them in
  `FallbackModel`. On each call, pydantic-ai tries them in order. The
  default `fallback_on` triggers on `ModelAPIError` (4xx/5xx) — which
  covers 429 RESOURCE_EXHAUSTED, 401 invalid key, 503 unavailable, etc.
  A successful response from any provider returns immediately.

## Legacy single-provider mode

`POLAR_AI_PROVIDER` defaults to `auto` (chain mode). Pin it to `gemini`
or `openai` inside `ENV_SECRET` to force single-provider mode (used by
older deployments and a couple of tests).

## Picking the right model per provider

Override the default model by setting `POLAR_<PROVIDER>_MODEL` in
`ENV_SECRET`. Examples:

```
# Switch Groq to a smaller, faster model:
POLAR_GROQ_MODEL=llama-3.1-8b-instant

# Use OpenRouter's free Gemma model instead of Llama:
POLAR_OPENROUTER_MODEL=google/gemma-2-9b-it:free

# Switch Cerebras to the smaller 8B Llama:
POLAR_CEREBRAS_MODEL=llama-3.1-8b

# Pin Gemini to 2.5 instead of 2.0:
POLAR_GOOGLE_AI_MODEL=gemini-2.5-flash
```

OpenRouter's catalog of free models lives at
[openrouter.ai/models?q=free](https://openrouter.ai/models?q=free).

## Why this exists

The old single-provider analyzer hard-failed when Google's Gemini key
hit a 429 (project quota exhausted). The analyzer would just keep
returning "Denied for human review" as a failure-fallback, blocking
real creator approvals. With the chain, a 429 on Gemini transparently
rolls over to Groq / OpenRouter / etc., and approvals keep flowing.

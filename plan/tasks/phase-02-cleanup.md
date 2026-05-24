# Phase 2 — Repo cleanup

> Plan refs: [§4.1–§4.3](../05-cleanup.md), [§4.5](../05-cleanup.md), [§4.7–§4.10](../05-cleanup.md), [§4.11](../05-cleanup.md). Goal: lean, branded repo. Backend modules stay (those are phase 3).

After every task in this phase, run `pnpm run typecheck && pnpm test && uv run pytest -x` to catch regressions early. Commit at each step so reverts are surgical.

## Tasks

### Top-level deletes

- [ ] **2.1 Delete top-level dirs per §4.1**
  - `rm -rf terraform/ oracle/ docs/ handbook/ lambda/ infra/ sdk/ marketplace-design-system/ .kiro/ .agents/ .claude/ .devcontainer/ .zed/ .github/mcp/`
  - Acceptance: `ls` shows only the directories listed in §4.10 (final repo shape)

- [ ] **2.2 Delete top-level files per §4.2**
  - Remove all the listed `.md`, `app.json`, `conductor.json`, `Brewfile`, `flake.*`, `polar.code-workspace`, `pyrightconfig.json` (move into `server/` if still needed), `.terraformignore`
  - Keep `.editorconfig`, `.gitignore`, `.nvmrc`, `.vscode/`
  - Acceptance: `ls` matches §4.10

- [ ] **2.3 Replace `README.md` with a 30-line Blyss summary**
  - One-paragraph description, link to `plan/README.md`, dev quickstart pointing at phase 1
  - Acceptance: `cat README.md | wc -l` ≤ 40

- [ ] **2.4 Delete the 11 stale GitHub Actions workflows per §4.3**
  - `rm .github/workflows/{check-server-logs,quick-fix-minio,minio-console-access,deploy-backend,setup-minio-api-subdomain,grant-admin-access,minio-test-connectivity,fix-backend-config,diagnose-backend,check-upload-flow,configure-minio-complete}.yml`
  - Keep `.github/workflows/dependabot.yml`, `.github/ISSUE_TEMPLATE/`
  - Acceptance: `ls .github/workflows/` is empty (or contains only `dependabot.yml`)

- [ ] **2.5 Audit `.github/actions/maintenance-mode/`**
  - Keep only if useful for our deploy; otherwise delete
  - Acceptance: decision documented; tree is clean

### Frontend route deletes (§4.5)

- [ ] **2.6 Delete marketing landing routes**
  - `cd clients/web/src/app && rm -rf '(main)/(website)/(landing)/{blog,customers,downloads,features,resources,company,(mdx)}'`
  - Acceptance: dir doesn't exist

- [ ] **2.7 Delete Polar-only main routes**
  - `rm -rf '(main)/{brand,orbit,help,start}'` (we'll rebuild `/help` and `/start` cleanly in phase 5)
  - Acceptance: routes return 404

- [ ] **2.8 Delete Polar onboarding v2 (developer-flavored)**
  - `rm -rf '(main)/onboarding'` and `clients/web/src/components/Onboarding/v2/`
  - Acceptance: route 404; component dir gone

- [ ] **2.9 Delete `/api/cover/` route**
  - It's the OG image API for blog posts; we rebuild OG for marketplace in phase 8
  - Acceptance: dir gone

### Frontend component deletes

- [ ] **2.10 Delete marketing components**
  - `rm -rf clients/web/src/components/{Brand,Vision,Landing,MDX}/`
  - Acceptance: imports failing? — fix the imports (some atoms may live under these)

- [ ] **2.11 Delete components for stripped backend modules**
  - `rm -rf clients/web/src/components/{Meter,Events}/`
  - `rm -rf clients/web/src/components/Benefit/{MeterCredit,LicenseKeys}/`
  - Acceptance: `pnpm run typecheck` reveals any missed import paths; fix them

- [ ] **2.12 Delete dashboard surface for hidden modules**
  - `rm -rf clients/web/src/app/(main)/dashboard/{webhooks,license-keys,events,meters,oauth,access-tokens}/` — verify these route names against the actual route tree first
  - Acceptance: no dashboard nav item points at a missing route

- [ ] **2.13 Delete settings UI for hidden modules**
  - `rm -f clients/web/src/components/Settings/{Webhook,OAuth,AccessTokenSettings.tsx,OrganizationAccessTokensSettings.tsx,FeatureSettings.tsx (if SaaS-flavored)}`
  - Audit: look at `Settings/index.ts` and remove deleted exports
  - Acceptance: `pnpm run typecheck` passes

- [ ] **2.14 Delete or simplify `CheckoutLinks/` components**
  - Keep the data layer; delete the over-featured creator UI. We rebuild a leaner version in phase 5 (§6.7 hosted checkout).
  - Acceptance: route still works (`/dashboard/checkout-links` if it exists), simpler form

### Dependency pruning (§4.5 last list)

- [ ] **2.15 Remove unused frontend deps**
  - In `clients/web/package.json`, remove: `@stripe/react-stripe-js`, `@stripe/stripe-js`, `@mdx-js/loader`, `@mdx-js/react`, `@next/mdx`, `@shikijs/rehype`, `shiki`, `rehype-mdx-import-media`, `rehype-slug`, `remark-frontmatter`, `remark`, `remark-mdx`, `markdown-to-jsx`, `@stylexjs/stylex`, `@stylexjs/babel-plugin`, `@stylexjs/postcss-plugin`, `@emotion/react`, `@emotion/styled`, `@mui/material`, `@mui/icons-material`, `gsap`, `@modelcontextprotocol/sdk`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mcp`, `@ai-sdk/react`, `@posthog/ai`, `ai`, `@cloudflare/stream-react`, `event-source-plus`, `import-in-the-middle`, `require-in-the-middle`, `@opentelemetry/api`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/sdk-trace-base`
  - **Keep** `remark-gfm` (used for benefit perk markdown)
  - Verify `hash-wasm` usage before removing
  - Acceptance: `pnpm install` succeeds; `pnpm run build` succeeds; bundle size drops

- [ ] **2.16 Add new deps**
  - `pnpm add motion react-markdown rehype-sanitize`
  - Acceptance: deps in `package.json`, lockfile updated

- [ ] **2.17 Migrate `framer-motion` imports to `motion`**
  - Find/replace: `from 'framer-motion'` → `from 'motion/react'`
  - The API is largely identical; check changelog for breakage
  - `pnpm remove framer-motion` after migration
  - Acceptance: app still animates correctly; `pnpm run typecheck` passes

### Tinybird + scripts (§4.7, §4.8)

- [ ] **2.18 Delete Tinybird folder**
  - `rm -rf server/tinybird/`
  - Remove Tinybird env vars from all `.env*` files
  - Acceptance: gone; backend boots without Tinybird env

- [ ] **2.19 Strip `server/scripts/` per §4.8**
  - Delete the listed scripts (~50 of them)
  - Keep: `seeds_load.py`, `db.py`, `helper.py`, `generate_openapi.py`, `shell.py`, `search_vectors_backfill.py`, `benefits_search_vector_backfill.py`, `trigger_payout.py`
  - Acceptance: `ls server/scripts/` shows ≤ 10 files

### Server root junk (§4.9)

- [ ] **2.20 Delete server root junk files**
  - Per §4.9 list: SYNC_WAITLIST_USERS.md, NEON_DATABASE_SETUP.md, MIGRATION_STATUS.md, GEMINI_*.md, AI_PROVIDER_SETUP.md, LOCAL_DEVELOPMENT.md, CLOUDFLARE_R2_CORS_SETUP.md, CLAUDE.md, init-readonly-user.sql, make_admin.py, grant_permissions.py, check_permissions.py, fix_alembic_*.py, reset_*.py, verify_*.py, test_connection.py, drop_db.py
  - Keep: `alembic.ini`, `pyproject.toml`, `uv.lock`, `migrations/`, `polar/`, `tests/`, `scripts/`, `emails/`, `.python-version`, `.dockerignore`, `monitoring/` (audit)
  - Acceptance: server/ root is clean

- [ ] **2.21 Delete old `.env.production`, `.env.template`, `.env.development`, `.env.testing`**
  - Replace with single `.env.example` rewritten in phase 1 task 1.2
  - Acceptance: only `.env.example` remains as a template

### Brand sweep (§4.11)

- [ ] **2.22 Audit `server/polar/config.py` for Polar defaults**
  - Update `FAVICON_URL` to `https://cdn.blyss.co.ke/brand/favicon.png`
  - Update `INVOICES_ADDITIONAL_INFO` to `[support@blyss.co.ke](mailto:support@blyss.co.ke)`
  - Update `CHECKOUT_LINK_HOST` example comment + production env to `buy.blyss.co.ke`
  - Update `FRONTEND_BASE_URL` fallback hostname to `blyss.co.ke`
  - Confirm `EMAIL_FROM_NAME = "Blyss"` already
  - Acceptance: `grep 'polar\.sh\|polarsource' server/polar/config.py` returns 0 hits

- [ ] **2.23 Sweep server-side `polar.sh` references**
  - `cd server && grep -rn 'polar\.sh\|polarsource\|polar\.com' polar/ --include='*.py' | grep -v 'tests/'` — review each hit, replace user-facing strings
  - Internal module names (e.g. `polar.config`) stay
  - Acceptance: no user-facing string returns Polar references

- [ ] **2.24 Sweep frontend hardcoded "Polar" strings**
  - `grep -rn '"Polar"\|'\''Polar'\''\|polarsource\|polar\.sh' clients/web/src/` — audit hits
  - Most should already be gone after route deletes (2.6–2.9). Remaining: `Organization/Footer.tsx`, `Onboarding/IntegrateStep.tsx` (delete the file), various Settings pages
  - Acceptance: brand-text-replacement property test passes

- [ ] **2.25 Sweep `server/emails/src/` templates**
  - `grep -rn 'Polar' server/emails/src/`
  - Replace hardcoded "Polar" with `{{ brand_name }}` template variable that reads from `EMAIL_FROM_NAME`
  - Acceptance: `cd server/emails && pnpm build` produces email HTML with "Blyss" everywhere

- [ ] **2.26 Run rebrand test suites**
  - `cd server && uv run pytest tests/platform_rebrand/ -v`
  - `cd clients/web && pnpm test brand-text-replacement`
  - Acceptance: both pass with zero failures

## Acceptance for phase 2

- [ ] Repo file count is at least 50% smaller than baseline (`git ls-files | wc -l` to compare)
- [ ] Every top-level directory matches §4.10 final shape
- [ ] `pnpm run typecheck` passes on `clients/web`
- [ ] `pnpm test` passes on `clients/web`
- [ ] `uv run pytest tests/ -k "not integration"` passes on `server`
- [ ] `pnpm run build` produces a bundle smaller than baseline
- [ ] Both rebrand test suites pass
- [ ] App still boots and seed data still renders at `localhost:3000`
- [ ] No remaining `polar.sh` / `polarsource` / `Polar` user-facing strings

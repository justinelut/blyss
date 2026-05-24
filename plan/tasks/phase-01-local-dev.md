# Phase 1 — Local dev environment

> Plan refs: [§10 local dev](../11-local-dev.md). Goal: clone → working app on localhost in ≤ 15 min.

## Tasks

- [ ] **1.1 Clone repo, confirm prereqs**
  - Verify Node 24, pnpm, Python 3.14, `uv`, Docker Compose v2 versions per §10.1
  - Acceptance: `node --version`, `pnpm --version`, `python --version`, `uv --version`, `docker --version` all return expected versions

- [ ] **1.2 Rewrite `server/.env.example` and `clients/web/.env.example`**
  - Content per §10.4
  - Replace any Polar defaults with Blyss values (FRONTEND_BASE_URL, EMAIL_FROM_NAME, FAVICON_URL, etc.)
  - Acceptance: both files committed; running `cp .env.example .env` produces a fully populated dev `.env` (with placeholder secrets)

- [ ] **1.3 Replace `server/docker-compose.yml`**
  - Use the leaner config from §10.3 (Postgres + Redis + MinIO + minio-init + Mailhog only — no Tinybird, no other Polar dev services)
  - Acceptance: `docker compose up -d` brings up exactly 5 services; all healthy within 30s

- [ ] **1.4 Initialize MinIO buckets**
  - Confirm minio-init creates `blyss-public` and `blyss-private` buckets; public bucket has anonymous download policy
  - Acceptance: `mc ls local` shows both buckets

- [ ] **1.5 Install backend deps + run migrations**
  - `cd server && uv sync && uv run task db_migrate`
  - Acceptance: migrations run cleanly against the local Postgres; `uv run pytest tests/ -k "not integration"` passes

- [ ] **1.6 Audit + update `server/scripts/seeds_load.py`**
  - Replace any Polar-specific seed data (organization names mentioning Polar, sample products labeled "Pro" / "API") with Blyss-flavored seeds: 5 creators (designer, writer, musician, educator, photographer), 30 products spanning categories, 8 subscriptions with markdown perks, 50 fake orders, 10 reviews
  - Per §10.7
  - Acceptance: `uv run python scripts/seeds_load.py` populates the DB without errors; querying `SELECT count(*) FROM products` returns ≥ 30

- [ ] **1.7 Install frontend deps + generate API client**
  - `cd clients/web && pnpm install && pnpm run generate`
  - Acceptance: `pnpm run typecheck` passes; OpenAPI types in `src/lib/api/v1.ts` exist

- [ ] **1.8 Boot all three terminals + confirm app loads**
  - Terminal 1: `cd server && uv run task api`
  - Terminal 2: `cd server && uv run task worker`
  - Terminal 3: `cd clients/web && pnpm run dev`
  - Acceptance: `http://localhost:3000` renders Polar's marketplace with seed products; `http://localhost:8000/healthz` returns 200; Mailhog UI reachable at `http://localhost:8025`

- [ ] **1.9 Sign in + create test creator**
  - Sign in via magic link (caught in Mailhog)
  - Land on dashboard
  - Create a test product
  - Acceptance: Product appears at the marketplace `/marketplace` route within seconds

- [ ] **1.10 Audit `dev/` folder and document keepers**
  - Per §10.8: keep `setup-environment`, `cli/`, `email_login_code_notifier.py`, `docker/`; delete `conductor-*`, `secrets.env.template`
  - Acceptance: `ls dev/` shows only the keepers

- [ ] **1.11 Verify rebrand tests pass on baseline**
  - `cd server && uv run pytest tests/platform_rebrand/ -v`
  - `cd clients/web && pnpm test brand-text-replacement`
  - Acceptance: both suites pass (they may reveal Polar leakage we fix in phase 2 — note any failures for phase 2)

## Acceptance for phase 1

- [ ] Fresh clone → `localhost:3000` serving the marketplace with seed data in ≤ 15 minutes
- [ ] No "out of memory" errors when all three terminals run
- [ ] Sign-in via magic link works
- [ ] Adding a product appears on the public marketplace within 60 seconds
- [ ] `docker compose down && docker compose up -d` resets cleanly without orphan volumes
- [ ] All `.env.example` keys are documented; defaults are Blyss-flavored, not Polar

# §10 Local development workflow

> See also: [03-tech-stack.md](./03-tech-stack.md) (versions), [05-cleanup.md](./05-cleanup.md) (env file rewrite), [12-deployment.md](./12-deployment.md) (production parity)

This section is what a new developer (or AI agent) reads to get Blyss running on their laptop in under 15 minutes. Everything runs in Docker locally — no cloud services for development.

## §10.1 Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 24 LTS | matches `engines.node` |
| pnpm | latest | the only allowed package manager |
| Python | 3.14 | matches `server/.python-version` |
| `uv` | latest | Python dependency manager |
| Docker + Docker Compose v2 | latest | Postgres, Redis, MinIO, Mailhog |
| `kubectl` (only for deploy work, not local dev) | matches K3s server version | not required for local |

Verify:

```bash
node --version    # v24.x
pnpm --version    # 9.x or 10.x
python --version  # 3.14.x
uv --version      # 0.x
docker --version  # 27.x
```

## §10.2 First-time setup

```bash
git clone <repo> blyss
cd blyss

# 1. Copy env templates (rewritten cleanly per §4.9)
cp server/.env.example server/.env
cp clients/web/.env.example clients/web/.env

# 2. Start infra (Postgres, Redis, MinIO, Mailhog) in Docker
cd server
docker compose up -d

# 3. Install Python deps + run migrations
uv sync
uv run task db_migrate

# 4. Seed sample data (a few creators, products, categories)
uv run python scripts/seeds_load.py

# 5. Install frontend deps (root + clients/web)
cd ../clients
pnpm install

# 6. (Once) generate the API client from OpenAPI
cd web
pnpm run generate
```

After this, three terminals:

```bash
# Terminal 1 — API
cd server && uv run task api

# Terminal 2 — Worker
cd server && uv run task worker

# Terminal 3 — Frontend
cd clients/web && pnpm run dev
```

Visit:

- `http://localhost:3000` — marketplace
- `http://localhost:3000/dashboard` — creator dashboard (sign in first)
- `http://localhost:8000/docs` — API docs (FastAPI Swagger)
- `http://localhost:8025` — Mailhog (catches outgoing emails locally)
- `http://localhost:9001` — MinIO console (browse uploaded files)
- `http://localhost:5432` — Postgres (via psql/TablePlus etc.)

## §10.3 `server/docker-compose.yml` — local infra

Single compose file at `server/docker-compose.yml` that brings up all 4 services. Replaces the existing one (which has more services than we need).

```yaml
# server/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: blyss
      POSTGRES_PASSWORD: blyss
      POSTGRES_DB: blyss
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U blyss"]
      interval: 5s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # web console
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s

  minio-init:
    # one-shot job to create the buckets on startup
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin &&
      mc mb -p local/blyss-public &&
      mc mb -p local/blyss-private &&
      mc anonymous set download local/blyss-public &&
      exit 0
      "

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # web UI

volumes:
  postgres_data:
  minio_data:
```

**Notes:**

- The user said: Postgres is already running locally on Docker. If true, comment out the `postgres` service and point the API at the existing one via `DATABASE_URL`.
- MinIO bucket names in dev: `blyss-public` (CDN content) and `blyss-private` (creator-uploaded files behind signed URLs).
- Mailhog catches all outgoing email; both Resend (transactional) and Loops (marketing) point at Mailhog SMTP in dev.

## §10.4 Environment files

Cleanly rewritten per §4.9. We ship `.env.example` files committed to git; each developer copies to `.env` and fills in their secrets locally.

**`server/.env.example` (committed):**

```bash
# Postgres (local Docker)
POSTGRES_USER=blyss
POSTGRES_PASSWORD=blyss
POSTGRES_DATABASE=blyss
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis (local Docker)
REDIS_URL=redis://localhost:6379/0

# MinIO (local Docker, S3-compatible)
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_PUBLIC=blyss-public
S3_BUCKET_PRIVATE=blyss-private
S3_REGION=us-east-1

# Email (Mailhog locally, Resend in production)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=hello@blyss.co.ke
EMAIL_FROM_NAME=Blyss

# Loops (marketing — leave blank in dev to disable sends)
LOOPS_API_KEY=

# Paystack (test keys — get from paystack dashboard)
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_WEBHOOK_SECRET=...

# Auth
JWT_SECRET=local_dev_only_change_in_prod
SESSION_SECRET=local_dev_only_change_in_prod

# OAuth (optional in dev)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=

# Polar config (rebrand to Blyss)
FRONTEND_BASE_URL=http://localhost:3000
CHECKOUT_LINK_HOST=localhost:3000
FAVICON_URL=http://localhost:9000/blyss-public/brand/favicon.png
INVOICES_ADDITIONAL_INFO=[support@blyss.co.ke](mailto:support@blyss.co.ke)
PLATFORM_FEE_BASIS_POINTS=2000
DEFAULT_CURRENCY=kes

# Sentry (optional in dev)
SENTRY_DSN=

# PostHog (optional in dev)
POSTHOG_API_KEY=

# IndexNow (only matters in production)
INDEXNOW_KEY=
```

**`clients/web/.env.example` (committed):**

```bash
# Polar API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CHECKOUT_URL=http://localhost:3000  # in dev, same host
NEXT_PUBLIC_PORTAL_URL=http://localhost:3000

# Paystack public key (for inline checkout widget)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...

# PostHog (optional in dev)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Sentry (optional in dev)
NEXT_PUBLIC_SENTRY_DSN=

# Analytics ID for Web Vitals
NEXT_PUBLIC_VITALS_ENABLED=true
```

**Real `.env` files** (ignored by `.gitignore`):

- Each developer fills in real test keys for Paystack, Google OAuth, etc.
- Production secrets come from K8s Secret manifests, never from a checked-in file.

## §10.5 Local multi-domain routing

In production, `blyss.co.ke`, `buy.blyss.co.ke`, `my.blyss.co.ke` are different hosts routed by Next.js middleware. In dev, we want to test the routing without setting up local DNS.

Options:

1. **Use Next.js middleware on path** (dev-only branch): if `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, treat `/`, `/_buy`, `/_my` path prefixes as if they were the corresponding hosts. Cleanest for dev.
2. **Use `/etc/hosts`**: add lines `127.0.0.1 blyss.local`, `127.0.0.1 buy.blyss.local`, `127.0.0.1 my.blyss.local`, and configure Next dev server to listen and middleware to route on those. More realistic but requires sudo.

Pick option 1 for default dev. Document option 2 in a sidebar for testing the production-like routing locally.

The middleware (`clients/web/src/middleware.ts`) reads:

```typescript
const host = request.headers.get('host') ?? ''
const isCheckout = host.startsWith('buy.') || pathname.startsWith('/_buy')
const isPortal = host.startsWith('my.') || pathname.startsWith('/_my')
```

## §10.6 Common dev tasks

```bash
# Run backend tests
cd server && uv run task test

# Run a specific test
cd server && uv run pytest tests/checkout/ -v

# Run frontend tests
cd clients/web && pnpm test

# Run frontend lint + types
cd clients/web && pnpm run lint && pnpm run typecheck

# Run backend lint + types
cd server && uv run task lint && uv run task lint_types

# Generate a new migration after model change
cd server && uv run alembic revision --autogenerate -m "description"

# Apply migrations
cd server && uv run task db_migrate

# Reset local DB (destructive)
cd server && docker compose down -v && docker compose up -d && uv run task db_migrate && uv run python scripts/seeds_load.py

# Regenerate frontend API client (after API changes)
cd clients/web && pnpm run generate

# Build frontend production bundle (for size checks)
cd clients/web && pnpm run build

# Run Lighthouse against local
cd clients/web && pnpm run build && pnpm start &
npx lighthouse http://localhost:3000 --view
```

## §10.7 Test data seeding

`server/scripts/seeds_load.py` seeds:

- 1 admin user
- 5 creators with varied storefronts (designer, writer, musician, educator, photographer)
- 30 products spanning all categories
- 8 subscription products with markdown perks
- 50 fake orders across the products
- 10 reviews
- A few checkout links

Run after every DB reset for realistic dev data.

## §10.8 Polar's existing dev tooling

Polar ships dev convenience tools at `dev/`. Audit and keep:

- `dev/setup-environment` — generates `.env` files with sensible defaults; useful, keep, update for Blyss config
- `dev/cli/` — Polar dev CLI (auth, db, etc.); keep, may need rebrand
- `dev/email_login_code_notifier.py` — surfaces magic-link codes in dev terminal; very useful, keep
- `dev/docker/Dockerfile.api.dev`, `dev/docker/Dockerfile.web.dev` — alternative dev containers; keep but don't require for daily dev

Delete:

- `dev/conductor-*` — Polar's Conductor agent integration; not used
- `dev/secrets.env.template` — replaced by the per-app `.env.example` files above

## §10.9 Mailhog as the dev mail catcher

All outbound email in dev goes to Mailhog (port 1025 SMTP, port 8025 web UI). To check magic-link codes during sign-in:

1. Sign in flow sends a magic link to `your-email@example.com`
2. Open `http://localhost:8025`
3. Click the email, copy the link, paste in browser

Or use `dev/email_login_code_notifier.py` which prints the code to stdout — even faster.

## §10.10 Local Loops + Resend

In dev:

- `RESEND_API_KEY=` (empty) → Resend client falls back to SMTP at `localhost:1025` (Mailhog)
- `LOOPS_API_KEY=` (empty) → Loops sync is no-op

In production both have real keys via K8s Secret.

## §10.11 Hot-reload boundaries

- `pnpm dev` hot-reloads frontend changes (Next.js Fast Refresh)
- `uv run task api` does NOT hot-reload by default — restart on backend changes (or use `uv run uvicorn polar.app:app --reload` for explicit reload mode in dev)
- `uv run task worker` doesn't hot-reload either; restart for task changes

This is acceptable. The hot path is frontend; backend changes are infrequent and a full restart is <2 seconds.

## §10.12 Acceptance for §10

Local dev is acceptable when:

- [ ] Fresh clone → working app in ≤ 15 minutes following §10.2
- [ ] All three terminals start without errors
- [ ] `localhost:3000` serves the marketplace home with seed data visible
- [ ] Sign-in via magic link works (Mailhog catches the email)
- [ ] Adding a product in the dashboard appears on the marketplace within 60 seconds
- [ ] `docker compose down && docker compose up -d` resets cleanly without orphan volumes
- [ ] `.env.example` files document every env var the app reads
- [ ] No env var hardcodes a Polar value as default — all defaults are Blyss
- [ ] CI runs the same `pnpm build`, `pnpm test`, `uv run task lint` commands

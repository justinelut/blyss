# Blyss

The modern marketplace for Kenyan creators.

Sell digital products and recurring subscriptions. Get paid via M-Pesa or card (Paystack). Built on top of [Polar.sh](https://polar.sh) (Apache 2.0).

## Repo layout

```
clients/web/     Next.js 16 app — marketplace, dashboard, hosted checkout, customer portal
server/          FastAPI + SQLAlchemy backend (Polar.sh fork)
plan/            Production-grade build brief — read this first
dev/             Local development tooling
.github/         CI workflow + issue templates
```

## Get started

The full build brief lives in [`plan/README.md`](./plan/README.md). For local development, follow [`plan/tasks/phase-01-local-dev.md`](./plan/tasks/phase-01-local-dev.md):

```bash
# Backend infra
cd server
docker compose up -d              # Postgres + Redis + MinIO
uv sync && uv run task db_migrate # install deps + migrate
uv run task seeds_load            # sample data

# Run
uv run task api                   # API at :8000
uv run task worker                # worker (separate terminal)

# Frontend
cd ../clients/web
pnpm install
pnpm run dev                      # http://localhost:3000
```

## License

Apache 2.0. See [`LICENSE`](./LICENSE).

Polar.sh upstream is © Polar Software, Inc. — Apache 2.0.
Blyss modifications are © 2026 Blyss.

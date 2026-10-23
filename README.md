# Blyss

A Kenya-focused marketplace where creators sell digital products and subscriptions through their own storefronts. Buyers can browse creator work and pay using the methods shown at checkout, including M-Pesa and cards where available.

## Repo layout

```
clients/web/     Next.js app — marketplace, dashboard, hosted checkout, customer portal
server/          FastAPI + SQLAlchemy backend
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

This repository is distributed under Apache 2.0. See [`LICENSE`](./LICENSE) for the applicable terms and notices.

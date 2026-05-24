# §12 GHCR image build pipeline

> See also: [12-deployment.md](./12-deployment.md) (where the images run), [11-local-dev.md](./11-local-dev.md) (local Docker)

Two images, both pushed to GitHub Container Registry, both built by a single GitHub Actions workflow that uses the auto-injected `GITHUB_TOKEN` (no manual `GHCR_TOKEN` secret).

## §12.1 The two images

| Image | Repo | Source | Size target (uncompressed) |
|---|---|---|---|
| `ghcr.io/<owner>/blyss-api` | `server/Dockerfile` | FastAPI + Polar app, Python 3.14, uvicorn | ≤ 400 MB |
| `ghcr.io/<owner>/blyss-web` | `clients/web/Dockerfile` | Next.js 16 standalone output, Node 24 | ≤ 250 MB |

Smaller images = faster rollouts, smaller K3s disk footprint, faster CI.

## §12.2 Tag strategy

Every push to `main` produces tags:

- `latest` — moves with each merge to main
- `<git-sha>` — immutable, e.g. `ghcr.io/<owner>/blyss-api:a1b2c3d`
- `<branch-name>` — moves with each push to that branch (for staging / preview)

Production deploys reference `:<git-sha>` (immutable) so a rollback is `kubectl set image ... :<previous-sha>`. `:latest` is for convenience only — never referenced in production manifests.

## §12.3 `server/Dockerfile` (Polar API)

```dockerfile
# server/Dockerfile
# Multi-stage build: small final image, no build tools at runtime.

FROM python:3.14-slim AS builder

# Install uv (fast Python dep manager)
ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .
# Pre-compile bytecode for faster startup
RUN uv run python -m compileall -q polar/

# ---- Final image ----
FROM python:3.14-slim

# Non-root user
RUN useradd -r -u 1000 -m blyss

# Runtime deps only (no build-essentials)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder --chown=blyss:blyss /app /app
COPY --from=builder /root/.local /root/.local
ENV PATH="/root/.local/bin:/app/.venv/bin:$PATH"

USER blyss
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')" || exit 1

# Default command runs the API; worker overrides via K8s Deployment command
CMD ["uvicorn", "polar.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

Worker Deployment overrides the `CMD` to run Dramatiq:

```yaml
# k8s/30-app/worker.yaml command override
command: ["dramatiq", "polar.tasks", "--processes", "2", "--threads", "2"]
```

**Size optimization:**

- `python:3.14-slim` not `python:3.14` (~80 MB savings)
- Multi-stage build keeps build tools out of final image
- `uv sync --no-dev` skips dev dependencies
- `apt-get clean` and `rm -rf /var/lib/apt/lists/*` after every install

## §12.4 `clients/web/Dockerfile` (Next.js)

```dockerfile
# clients/web/Dockerfile

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && pnpm run build

# ---- Final image ----
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone build output (next.config.mjs has output: 'standalone')
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

**Why `output: 'standalone'`:** Next.js bundles only the runtime code + traced node_modules into `.next/standalone/`. The final image doesn't need `node_modules` at all — saves ~250 MB and dramatically speeds up cold starts.

`next.config.mjs` configuration:

```javascript
const nextConfig = {
  output: 'standalone',
  images: { /* per §9.5 */ },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
}
```

## §12.5 GitHub Actions workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write   # required for GHCR push via GITHUB_TOKEN

env:
  REGISTRY: ghcr.io
  OWNER: ${{ github.repository_owner }}

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
      migrations: ${{ steps.filter.outputs.migrations }}
      manifests: ${{ steps.filter.outputs.manifests }}
    steps:
    - uses: actions/checkout@v4
    - uses: dorny/paths-filter@v3
      id: filter
      with:
        filters: |
          api:
            - 'server/**'
          web:
            - 'clients/web/**'
          migrations:
            - 'server/migrations/**'
          manifests:
            - 'k8s/**'

  build-api:
    needs: changes
    if: needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: docker/setup-buildx-action@v3
    - uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - uses: docker/metadata-action@v5
      id: meta
      with:
        images: ${{ env.REGISTRY }}/${{ env.OWNER }}/blyss-api
        tags: |
          type=sha,prefix=,format=short
          type=ref,event=branch
          type=raw,value=latest,enable={{is_default_branch}}
    - uses: docker/build-push-action@v6
      with:
        context: ./server
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  build-web:
    needs: changes
    if: needs.changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: docker/setup-buildx-action@v3
    - uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - uses: docker/metadata-action@v5
      id: meta
      with:
        images: ${{ env.REGISTRY }}/${{ env.OWNER }}/blyss-web
        tags: |
          type=sha,prefix=,format=short
          type=ref,event=branch
          type=raw,value=latest,enable={{is_default_branch}}
    - uses: docker/build-push-action@v6
      with:
        context: ./clients/web
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        build-args: |
          NEXT_PUBLIC_SITE_URL=https://blyss.co.ke
          NEXT_PUBLIC_API_URL=https://api.blyss.co.ke
          NEXT_PUBLIC_CHECKOUT_URL=https://buy.blyss.co.ke
          NEXT_PUBLIC_PORTAL_URL=https://my.blyss.co.ke
          NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=${{ secrets.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY }}

  deploy:
    needs: [changes, build-api, build-web]
    if: always() && (needs.build-api.result == 'success' || needs.build-web.result == 'success' || needs.changes.outputs.manifests == 'true')
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Set up SSH
      run: |
        mkdir -p ~/.ssh
        echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_ed25519
        chmod 600 ~/.ssh/id_ed25519
        ssh-keyscan -H ${{ secrets.SERVER_IP }} >> ~/.ssh/known_hosts

    - name: Run migration (if migration files changed)
      if: needs.changes.outputs.migrations == 'true' || needs.changes.outputs.api == 'true'
      run: |
        export SHORT_SHA=$(git rev-parse --short HEAD)
        # render migrate.yaml.template with SHA, send to server, apply
        envsubst < k8s/50-jobs/migrate.yaml > /tmp/migrate.yaml
        scp /tmp/migrate.yaml ubuntu@${{ secrets.SERVER_IP }}:/tmp/
        ssh ubuntu@${{ secrets.SERVER_IP }} "kubectl apply -f /tmp/migrate.yaml && kubectl wait --for=condition=complete --timeout=300s job/migrate-${SHORT_SHA} -n blyss"
      env:
        SHORT_SHA: ${{ github.sha }}

    - name: Apply manifests + roll deployments
      run: |
        export SHORT_SHA=$(git rev-parse --short HEAD)
        ssh ubuntu@${{ secrets.SERVER_IP }} "
          cd /tmp/blyss-deploy &&
          rm -rf k8s &&
          mkdir -p k8s
        "
        scp -r k8s/* ubuntu@${{ secrets.SERVER_IP }}:/tmp/blyss-deploy/k8s/
        ssh ubuntu@${{ secrets.SERVER_IP }} "
          kubectl apply -f /tmp/blyss-deploy/k8s/00-namespace.yaml
          kubectl apply -f /tmp/blyss-deploy/k8s/20-storage/
          kubectl apply -f /tmp/blyss-deploy/k8s/30-app/
          kubectl apply -f /tmp/blyss-deploy/k8s/40-edge/
          kubectl apply -f /tmp/blyss-deploy/k8s/99-network-policies.yaml

          # Roll deployments to pin the new image SHA
          kubectl set image deployment/api api=ghcr.io/${{ env.OWNER }}/blyss-api:${SHORT_SHA} -n blyss
          kubectl set image deployment/worker worker=ghcr.io/${{ env.OWNER }}/blyss-api:${SHORT_SHA} -n blyss
          kubectl set image deployment/web web=ghcr.io/${{ env.OWNER }}/blyss-web:${SHORT_SHA} -n blyss

          kubectl rollout status deployment/api -n blyss --timeout=300s
          kubectl rollout status deployment/worker -n blyss --timeout=300s
          kubectl rollout status deployment/web -n blyss --timeout=300s
        "

    - name: Smoke test
      run: |
        curl -sf https://api.blyss.co.ke/healthz | grep -q '"ok"'
        curl -sf https://blyss.co.ke -o /dev/null

    - name: Notify on failure
      if: failure()
      run: echo "Deploy failed — investigate via kubectl logs and Sentry"
```

## §12.6 Local image build (for testing before push)

```bash
# Build API image
cd server
docker build -t blyss-api:local .
docker run --rm -p 8000:8000 \
  --env-file .env \
  blyss-api:local

# Build Web image
cd clients/web
docker build -t blyss-web:local \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --build-arg NEXT_PUBLIC_API_URL=http://host.docker.internal:8000 \
  .
docker run --rm -p 3000:3000 blyss-web:local
```

These produce the same images CI produces, so any "works on my laptop, breaks on the server" issue is reproducible.

## §12.7 Image scanning

GitHub Container Registry runs Dependabot security scanning on pushed images. Enable for the repo. CI fails the build if a critical vulnerability appears in dependencies.

Optional `trivy` scan in CI for higher confidence:

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/${{ env.OWNER }}/blyss-api:${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: 1
```

## §12.8 GHCR pull from K3s

The cluster pulls private images. The `ghcr-pull` Secret (§11.3) is a docker-registry secret with a personal access token (read:packages scope). Each Deployment references it via `imagePullSecrets`.

PAT rotation: the token is stored in the cluster, not in CI (CI uses `GITHUB_TOKEN` which already has write access during the workflow). Rotate the cluster's PAT every 90 days via:

```bash
kubectl -n blyss delete secret ghcr-pull
kubectl -n blyss create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=$GH_USER \
  --docker-password=$NEW_PAT
```

## §12.9 Acceptance for §12

The pipeline is acceptable when:

- [ ] Both Dockerfiles build locally without errors (≤ 3 min for API, ≤ 4 min for web)
- [ ] Built API image is ≤ 400 MB; built web image is ≤ 250 MB
- [ ] Pushing to `main` triggers the workflow; both images appear in GHCR with `:<sha>` and `:latest` tags
- [ ] CI uses `${{ secrets.GITHUB_TOKEN }}` for the GHCR push — no manual `GHCR_TOKEN` secret exists
- [ ] CI completes end-to-end in ≤ 8 minutes (build cache hits)
- [ ] Migration Job runs and completes before API/Worker rollout when migration files change
- [ ] Failed rollout triggers automatic rollback (`kubectl rollout status` exits non-zero, workflow notifies)
- [ ] Smoke test (curl healthz + home page) passes after every deploy

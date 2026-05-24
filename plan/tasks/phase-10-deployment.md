# Phase 10 — Deployment infrastructure

> Plan refs: [§11 deployment](../12-deployment.md), [§12 GHCR images](../13-images.md). Goal: K3s manifests + Cloudflare Tunnel + GitHub Actions deploy workflow ready, tested on a staging K3s before production.

Can run in parallel with phase 5 — manifests don't depend on UI completion.

## 10.1 Dockerfiles (§12.3, §12.4)

- [ ] **10.1.1 Write `server/Dockerfile`** per §12.3 — multi-stage Python 3.14-slim, non-root user, healthcheck
- [ ] **10.1.2 Build locally** — `docker build -t blyss-api:local server/` ≤ 3 min, image ≤ 400 MB
- [ ] **10.1.3 Test locally** — `docker run --env-file server/.env blyss-api:local` boots; healthz returns 200
- [ ] **10.1.4 Write `clients/web/Dockerfile`** per §12.4 — multi-stage Node 24-alpine, standalone build, non-root, healthcheck
- [ ] **10.1.5 Confirm `next.config.mjs` has `output: 'standalone'`** (already from phase 8 task 8.12.1)
- [ ] **10.1.6 Build locally** — `docker build -t blyss-web:local clients/web/` ≤ 4 min, image ≤ 250 MB
- [ ] **10.1.7 Test locally** — `docker run -p 3000:3000 blyss-web:local` boots and serves the app

## 10.2 K3s manifests (§11.2)

- [ ] **10.2.1 Create `k8s/00-namespace.yaml`** — namespace `blyss`
- [ ] **10.2.2 Write `k8s/10-secrets/README.md`** with create-each-secret recipes per §11.3
- [ ] **10.2.3 Write `k8s/10-secrets/*.yaml.template` files** for: postgres, redis, minio, api, web, cloudflared-tunnel, ghcr-pull
- [ ] **10.2.4 Write `k8s/20-storage/postgres.yaml`** per §11.4 — StatefulSet + Service + PVC (50 GB), tuned args
- [ ] **10.2.5 Write `k8s/20-storage/redis.yaml`** per §11.5 — Deployment + Service, maxmemory 256mb
- [ ] **10.2.6 Write `k8s/20-storage/minio.yaml`** per §11.6 — StatefulSet + Service + PVC (100 GB), API + console ports
- [ ] **10.2.7 Write `k8s/30-app/api.yaml`** per §11.7 — Deployment + Service, healthz probes, resource limits
- [ ] **10.2.8 Write `k8s/30-app/worker.yaml`** — same image, dramatiq command, no Service
- [ ] **10.2.9 Write `k8s/30-app/web.yaml`** per §11.8 — Deployment + Service
- [ ] **10.2.10 Write `k8s/40-edge/cloudflared.yaml`** per §11.9 — Deployment + ConfigMap with tunnel config.yaml
- [ ] **10.2.11 Write `k8s/40-edge/ingressroutes.yaml`** per §11.9 — IngressRoutes for marketplace + api + cdn + Middleware for `minio-public-prefix`
- [ ] **10.2.12 Write `k8s/50-jobs/migrate.yaml`** per §11.11 — one-shot Job templated with `${GIT_SHA}`
- [ ] **10.2.13 Write `k8s/50-jobs/backup-postgres.yaml`** per §11.12 — nightly CronJob to B2
- [ ] **10.2.14 Write `k8s/50-jobs/backup-minio.yaml`** — weekly mc mirror to B2
- [ ] **10.2.15 Write `k8s/99-network-policies.yaml`** per §11.10 — only `api` + `worker` reach Postgres/Redis/MinIO

## 10.3 Cloudflare Tunnel setup (one-time, on dev laptop)

- [ ] **10.3.1 `cloudflared tunnel login`** — authenticates against Cloudflare account
- [ ] **10.3.2 `cloudflared tunnel create blyss`** — creates tunnel; saves credentials JSON
- [ ] **10.3.3 `cloudflared tunnel route dns blyss blyss.co.ke`**
- [ ] **10.3.4 `cloudflared tunnel route dns blyss api.blyss.co.ke`**
- [ ] **10.3.5 `cloudflared tunnel route dns blyss buy.blyss.co.ke`**
- [ ] **10.3.6 `cloudflared tunnel route dns blyss my.blyss.co.ke`**
- [ ] **10.3.7 `cloudflared tunnel route dns blyss cdn.blyss.co.ke`**
- [ ] **10.3.8 Verify CNAMEs in Cloudflare dashboard** — all 5 hostnames point at `<tunnel-id>.cfargotunnel.com`
- [ ] **10.3.9 Upload credentials JSON as the `cloudflared-tunnel` secret on the K3s server**

## 10.4 Cloudflare cache + page rules

- [ ] **10.4.1 Set proxy mode (orange cloud) on `blyss.co.ke`, `buy.`, `my.`, `cdn.`**
- [ ] **10.4.2 Set DNS-only (gray cloud) on `api.blyss.co.ke`** — webhooks need direct origin
- [ ] **10.4.3 Apply cache rules per §8.10 table** — cdn aggressive, _next/static immutable, og 7 days, sitemap 1 hour, dashboard/cart/login/checkout/portal bypass

## 10.5 GitHub Actions deploy workflow (§12.5)

- [ ] **10.5.1 Create `.github/workflows/deploy.yml`** per §12.5
- [ ] **10.5.2 Add `permissions: packages: write`** at workflow level
- [ ] **10.5.3 Add change detection job** — paths-filter for api / web / migrations / manifests
- [ ] **10.5.4 Add build-api job** — uses `${{ secrets.GITHUB_TOKEN }}` for GHCR login
- [ ] **10.5.5 Add build-web job** — same, with NEXT_PUBLIC_* build args
- [ ] **10.5.6 Add deploy job** — SSH into server, run migration Job, then apply manifests + roll Deployments
- [ ] **10.5.7 Add smoke test step** — curl healthz + home + sitemap
- [ ] **10.5.8 Add failure notification step**
- [ ] **10.5.9 Confirm repo secrets `SSH_PRIVATE_KEY` + `SERVER_IP` are set** (user said yes)

## 10.6 Server-side prep (one-time on the K3s server)

- [ ] **10.6.1 SSH to server, verify K3s is running** — `kubectl get nodes` from on-server returns Ready
- [ ] **10.6.2 Verify nothing else is running** — `kubectl get pods -A` shows only system pods
- [ ] **10.6.3 Create the `blyss` namespace** — `kubectl create namespace blyss`
- [ ] **10.6.4 Create all secrets** per `k8s/10-secrets/README.md`
- [ ] **10.6.5 Create the `ghcr-pull` docker-registry secret** with a read-only PAT (read:packages scope)
- [ ] **10.6.6 Apply storage manifests** — `kubectl apply -f k8s/20-storage/`
- [ ] **10.6.7 Wait for Postgres + Redis + MinIO to be Ready** — `kubectl get pods -n blyss -w`
- [ ] **10.6.8 Run a migration job manually first time** to seed schema
- [ ] **10.6.9 Apply `k8s/40-edge/cloudflared.yaml`** — verify tunnel comes up, Cloudflare dashboard shows healthy
- [ ] **10.6.10 Apply IngressRoutes** — `kubectl apply -f k8s/40-edge/ingressroutes.yaml`
- [ ] **10.6.11 Apply network policies** — `kubectl apply -f k8s/99-network-policies.yaml`
- [ ] **10.6.12 Apply app Deployments** — `kubectl apply -f k8s/30-app/`
- [ ] **10.6.13 Verify total RAM usage ≤ 6 GB** — `kubectl top pods -n blyss`
- [ ] **10.6.14 Verify all 5 hostnames respond**
  - `curl -sf https://blyss.co.ke/` → 200, returns marketplace HTML
  - `curl -sf https://api.blyss.co.ke/healthz` → 200
  - `curl -sf https://buy.blyss.co.ke/` → 200, returns checkout fallback
  - `curl -sf https://my.blyss.co.ke/` → 200, returns portal sign-in
  - `curl -sf https://cdn.blyss.co.ke/products/test.jpg` → 200 if test asset uploaded
- [ ] **10.6.15 Verify NOT reachable from public internet directly**
  - SSH off the server, run `nmap -p 80,443 <server-public-ip>` from elsewhere → ports filtered/closed
  - Acceptance: Cloudflare Tunnel is the only inbound path

## 10.7 First production deploy (Phase 10 final task)

- [ ] **10.7.1 Push to main** — triggers GitHub Actions
- [ ] **10.7.2 Watch the workflow** — build api, build web, deploy
- [ ] **10.7.3 Verify GHCR has `blyss-api:<sha>` and `blyss-web:<sha>` tags**
- [ ] **10.7.4 Verify rollout completed** — `kubectl get deployment -n blyss` shows desired = ready
- [ ] **10.7.5 Verify smoke test passed in CI logs**
- [ ] **10.7.6 Browse `https://blyss.co.ke` from a real device** — page loads, marketplace renders

## 10.8 Backup verification

- [ ] **10.8.1 Manually trigger postgres backup CronJob** — `kubectl create job --from=cronjob/backup-postgres backup-postgres-test -n blyss`
- [ ] **10.8.2 Verify dump appears in B2 bucket**
- [ ] **10.8.3 Manually trigger minio backup CronJob**
- [ ] **10.8.4 Verify mirror appears in B2**
- [ ] **10.8.5 Test restore once on a scratch DB** — `pg_restore` from a downloaded dump succeeds; row counts match production

## 10.9 Rollback drill

- [ ] **10.9.1 With production live, intentionally push a change that fails health checks**
- [ ] **10.9.2 Verify rollout fails and `kubectl rollout status` exits non-zero**
- [ ] **10.9.3 Run `kubectl rollout undo deployment/api -n blyss`** — verify previous version restored
- [ ] **10.9.4 Verify smoke test passes again**
- [ ] **10.9.5 Document the drill in the runbook**

## Acceptance for phase 10

- [ ] All `k8s/` manifests apply cleanly to a fresh K3s
- [ ] No service reachable from public internet except via Cloudflare Tunnel
- [ ] Postgres/Redis/MinIO ClusterIP-only verified by external port scan
- [ ] All 5 hostnames respond
- [ ] Total memory usage ≤ 6 GB
- [ ] Cloudflare dashboard shows tunnel healthy + DNS records present
- [ ] Migration Job runs successfully on first deploy
- [ ] First nightly Postgres backup lands in B2
- [ ] `kubectl rollout undo` drill completed
- [ ] Deploy workflow runs end-to-end ≤ 8 minutes
- [ ] Both Dockerfiles produce images within size budgets

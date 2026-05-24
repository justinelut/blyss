# §11 Deployment — single-server K3s

> See also: [02-source-approach.md](./02-source-approach.md) (architecture overview), [03-tech-stack.md](./03-tech-stack.md) (RAM budget), [13-images.md](./13-images.md) (image build pipeline)

This is the single source of truth for how Blyss runs in production. One Kubernetes cluster (K3s) on one server, behind Cloudflare Tunnel, with a 6 GB RAM ceiling for our stack.

## §11.1 Architecture recap

```
Browser → Cloudflare edge (cache, DDoS, SSL termination)
       ↓ (encrypted tunnel)
       cloudflared pod (in cluster, ~80 MB)
       ↓
       Traefik (k3s built-in, IngressRoutes per host)
       ↓
       ├─ web Deployment        (host-routed: blyss / buy / my)
       ├─ api Deployment        (api.blyss.co.ke)
       ├─ minio public path     (cdn.blyss.co.ke → MinIO public bucket)
       └─ Polar backoffice      (whatever path Polar mounts it at, untouched)

Inside cluster (ClusterIP only, never reachable from outside):
       postgres StatefulSet · redis Deployment · minio API · worker Deployment
       backup CronJobs (postgres → B2, minio → B2)
```

No public IP serves HTTP directly. The K3s server's firewall blocks 80/443 from the public internet. Only the SSH port (22) is open, restricted to GitHub Actions runners' IP ranges where possible.

## §11.2 Manifest layout

All manifests at `/k8s/` in the repo root. Apply with `kubectl apply -f k8s/` (recursive).

```
k8s/
├── 00-namespace.yaml
├── 10-secrets/                  # secrets, NOT committed (created out-of-band)
│   ├── README.md                # how to create each secret
│   ├── postgres.yaml.template
│   ├── redis.yaml.template
│   ├── minio.yaml.template
│   ├── api.yaml.template
│   ├── web.yaml.template
│   ├── cloudflared.yaml.template
│   └── ghcr-pull.yaml.template
├── 20-storage/
│   ├── postgres.yaml            # StatefulSet + Service + PVC
│   ├── redis.yaml               # Deployment + Service (volatile, in-memory)
│   └── minio.yaml               # StatefulSet + Service + PVC
├── 30-app/
│   ├── api.yaml                 # Deployment + Service
│   ├── worker.yaml              # Deployment (no Service, no inbound)
│   └── web.yaml                 # Deployment + Service
├── 40-edge/
│   ├── cloudflared.yaml         # Deployment + ConfigMap (tunnel config)
│   └── ingressroutes.yaml       # Traefik IngressRoutes per host
├── 50-jobs/
│   ├── migrate.yaml             # one-shot Alembic migration Job
│   ├── backup-postgres.yaml     # nightly CronJob → B2
│   └── backup-minio.yaml        # weekly CronJob → B2
└── 99-network-policies.yaml     # NetworkPolicy: only api/worker reach postgres etc.
```

**Naming convention** (workspace AGENTS.md was helpful here, but we ignore the bits about not building images since Polar is custom code): all resources labeled `app.kubernetes.io/part-of: blyss`, namespaced under `blyss`. Service names match component names so DNS resolution inside the cluster is `postgres.blyss.svc.cluster.local`, `redis.blyss.svc.cluster.local`, etc.

## §11.3 Secrets management

Secrets are NOT committed. Templates live in `k8s/10-secrets/*.yaml.template` with stub values; real secrets are created on the server out-of-band. The README documents the create-each-secret recipe.

**Required secrets:**

```bash
# postgres-secret
kubectl -n blyss create secret generic postgres \
  --from-literal=POSTGRES_USER=blyss \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -hex 32) \
  --from-literal=POSTGRES_DB=blyss

# redis-secret
kubectl -n blyss create secret generic redis \
  --from-literal=REDIS_PASSWORD=$(openssl rand -hex 32)

# minio-secret
kubectl -n blyss create secret generic minio \
  --from-literal=MINIO_ROOT_USER=blyss \
  --from-literal=MINIO_ROOT_PASSWORD=$(openssl rand -hex 32) \
  --from-literal=MINIO_PUBLIC_URL=https://cdn.blyss.co.ke

# api-secret  (per server/.env, all production values)
kubectl -n blyss create secret generic api \
  --from-literal=JWT_SECRET=... \
  --from-literal=SESSION_SECRET=... \
  --from-literal=PAYSTACK_SECRET_KEY=sk_live_... \
  --from-literal=PAYSTACK_PUBLIC_KEY=pk_live_... \
  --from-literal=PAYSTACK_WEBHOOK_SECRET=... \
  --from-literal=GOOGLE_CLIENT_ID=... \
  --from-literal=GOOGLE_CLIENT_SECRET=... \
  --from-literal=APPLE_CLIENT_ID=... \
  --from-literal=APPLE_CLIENT_SECRET=... \
  --from-literal=RESEND_API_KEY=... \
  --from-literal=LOOPS_API_KEY=... \
  --from-literal=SENTRY_DSN=... \
  --from-literal=POSTHOG_API_KEY=... \
  --from-literal=INDEXNOW_KEY=...

# web-secret  (NEXT_PUBLIC_* values are baked at build time, but server-side ones live here)
kubectl -n blyss create secret generic web \
  --from-literal=SENTRY_AUTH_TOKEN=...

# cloudflared-tunnel  (the credentials JSON cloudflared generates at tunnel-create time)
kubectl -n blyss create secret generic cloudflared-tunnel \
  --from-file=credentials.json=./blyss-tunnel.json

# ghcr-pull  (so the cluster can pull our private images from ghcr.io)
kubectl -n blyss create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=$GH_USER \
  --docker-password=$GH_TOKEN_WITH_READ_PACKAGES_SCOPE
```

All Deployments reference these via `envFrom: secretRef` or `imagePullSecrets`.

## §11.4 Postgres (StatefulSet)

```yaml
# k8s/20-storage/postgres.yaml (excerpt)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: blyss
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels: { app: postgres }
  template:
    metadata:
      labels: { app: postgres }
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        envFrom: [{ secretRef: { name: postgres } }]
        env:
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports: [{ containerPort: 5432 }]
        resources:
          requests: { memory: "512Mi", cpu: "250m" }
          limits: { memory: "1Gi", cpu: "1000m" }
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        readinessProbe:
          exec: { command: ["pg_isready", "-U", "blyss"] }
        livenessProbe:
          exec: { command: ["pg_isready", "-U", "blyss"] }
        # Tuning for our 1 GB budget:
        args:
        - postgres
        - -c
        - shared_buffers=256MB
        - -c
        - effective_cache_size=512MB
        - -c
        - work_mem=8MB
        - -c
        - maintenance_work_mem=64MB
        - -c
        - wal_buffers=16MB
        - -c
        - max_connections=100
  volumeClaimTemplates:
  - metadata: { name: data }
    spec:
      accessModes: [ReadWriteOnce]
      resources: { requests: { storage: 50Gi } }
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: blyss
spec:
  clusterIP: None  # headless for StatefulSet DNS
  selector: { app: postgres }
  ports: [{ port: 5432 }]
```

Only reachable from inside the cluster. NetworkPolicy in §11.10 ensures only `api` and `worker` pods can connect.

## §11.5 Redis (Deployment)

```yaml
# k8s/20-storage/redis.yaml (excerpt)
apiVersion: apps/v1
kind: Deployment
metadata: { name: redis, namespace: blyss }
spec:
  replicas: 1
  strategy: { type: Recreate }  # avoid two redis pods racing
  selector: { matchLabels: { app: redis } }
  template:
    metadata: { labels: { app: redis } }
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        args:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        - --maxmemory
        - 256mb
        - --maxmemory-policy
        - allkeys-lru
        envFrom: [{ secretRef: { name: redis } }]
        resources:
          requests: { memory: "128Mi", cpu: "50m" }
          limits: { memory: "300Mi", cpu: "500m" }
        ports: [{ containerPort: 6379 }]
---
apiVersion: v1
kind: Service
metadata: { name: redis, namespace: blyss }
spec:
  selector: { app: redis }
  ports: [{ port: 6379 }]
```

Volatile (no PVC). Cache + queue. If Redis restarts, the queue drains naturally because Dramatiq retries unacked messages.

## §11.6 MinIO (StatefulSet)

```yaml
# k8s/20-storage/minio.yaml (excerpt)
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: minio, namespace: blyss }
spec:
  serviceName: minio
  replicas: 1
  selector: { matchLabels: { app: minio } }
  template:
    metadata: { labels: { app: minio } }
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        args: [server, /data, --console-address, ":9001"]
        envFrom: [{ secretRef: { name: minio } }]
        ports:
        - { name: api, containerPort: 9000 }
        - { name: console, containerPort: 9001 }
        resources:
          requests: { memory: "256Mi", cpu: "100m" }
          limits: { memory: "700Mi", cpu: "1000m" }
        volumeMounts:
        - { name: data, mountPath: /data }
  volumeClaimTemplates:
  - metadata: { name: data }
    spec:
      accessModes: [ReadWriteOnce]
      resources: { requests: { storage: 100Gi } }
---
apiVersion: v1
kind: Service
metadata: { name: minio, namespace: blyss }
spec:
  selector: { app: minio }
  ports:
  - { name: api, port: 9000 }
  - { name: console, port: 9001 }
```

Console (port 9001) is never exposed publicly. Admins access via `kubectl port-forward svc/minio 9001:9001 -n blyss`.

The public bucket `blyss-public` is exposed at `cdn.blyss.co.ke` via Traefik IngressRoute (§11.9).

## §11.7 Polar API + worker

```yaml
# k8s/30-app/api.yaml (excerpt)
apiVersion: apps/v1
kind: Deployment
metadata: { name: api, namespace: blyss }
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      imagePullSecrets: [{ name: ghcr-pull }]
      containers:
      - name: api
        image: ghcr.io/<owner>/blyss-api:latest  # tagged per §13
        envFrom:
        - { secretRef: { name: api } }
        - { secretRef: { name: postgres } }
        - { secretRef: { name: redis } }
        - { secretRef: { name: minio } }
        - { configMapRef: { name: api-config } }
        ports: [{ containerPort: 8000 }]
        resources:
          requests: { memory: "512Mi", cpu: "250m" }
          limits: { memory: "1Gi", cpu: "1500m" }
        readinessProbe:
          httpGet: { path: /healthz, port: 8000 }
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet: { path: /healthz, port: 8000 }
          initialDelaySeconds: 30
          periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata: { name: api, namespace: blyss }
spec:
  selector: { app: api }
  ports: [{ port: 8000 }]
```

`worker.yaml` is similar but no Service (no inbound traffic), runs `dramatiq` instead of `uvicorn`, resource limits `500Mi / 1500m`.

A non-secret `api-config` ConfigMap holds the public env vars (URLs, fee basis points, currency, etc.) — easier to bump without rotating secrets.

## §11.8 Next.js (Deployment)

```yaml
# k8s/30-app/web.yaml (excerpt)
apiVersion: apps/v1
kind: Deployment
metadata: { name: web, namespace: blyss }
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec:
      imagePullSecrets: [{ name: ghcr-pull }]
      containers:
      - name: web
        image: ghcr.io/<owner>/blyss-web:latest
        envFrom:
        - { secretRef: { name: web } }
        - { configMapRef: { name: web-config } }
        ports: [{ containerPort: 3000 }]
        resources:
          requests: { memory: "256Mi", cpu: "100m" }
          limits: { memory: "700Mi", cpu: "1500m" }
        readinessProbe:
          httpGet: { path: /api/health, port: 3000 }
        livenessProbe:
          httpGet: { path: /api/health, port: 3000 }
---
apiVersion: v1
kind: Service
metadata: { name: web, namespace: blyss }
spec:
  selector: { app: web }
  ports: [{ port: 3000 }]
```

Single replica to start. Scale to 2 via `kubectl scale deployment web --replicas=2 -n blyss` once we outgrow it.

## §11.9 Cloudflare Tunnel + Traefik IngressRoutes

**One tunnel, many hostnames.** Created out-of-band on the developer's machine:

```bash
cloudflared tunnel login
cloudflared tunnel create blyss
# generates ~/.cloudflared/<TUNNEL_ID>.json — this is the credentials file
```

Auto-create DNS:

```bash
cloudflared tunnel route dns blyss blyss.co.ke
cloudflared tunnel route dns blyss api.blyss.co.ke
cloudflared tunnel route dns blyss buy.blyss.co.ke
cloudflared tunnel route dns blyss my.blyss.co.ke
cloudflared tunnel route dns blyss cdn.blyss.co.ke
```

Each command creates a CNAME at Cloudflare pointing the hostname at `<tunnel-id>.cfargotunnel.com`.

The credentials JSON is uploaded as the `cloudflared-tunnel` secret (§11.3). The tunnel config lives in a ConfigMap:

```yaml
# k8s/40-edge/cloudflared.yaml (config excerpt)
apiVersion: v1
kind: ConfigMap
metadata: { name: cloudflared-config, namespace: blyss }
data:
  config.yaml: |
    tunnel: <TUNNEL_ID>
    credentials-file: /etc/cloudflared/credentials.json
    no-autoupdate: true
    metrics: 0.0.0.0:2000
    ingress:
      # marketplace + dashboard + checkout + portal — all routed via Traefik to web
      - hostname: blyss.co.ke
        service: http://traefik.kube-system.svc.cluster.local:80
      - hostname: buy.blyss.co.ke
        service: http://traefik.kube-system.svc.cluster.local:80
      - hostname: my.blyss.co.ke
        service: http://traefik.kube-system.svc.cluster.local:80
      # api → Polar API directly via Traefik
      - hostname: api.blyss.co.ke
        service: http://traefik.kube-system.svc.cluster.local:80
      # cdn → MinIO public bucket directly via Traefik
      - hostname: cdn.blyss.co.ke
        service: http://traefik.kube-system.svc.cluster.local:80
      - service: http_status:404
```

`cloudflared` Deployment runs 1 replica (~80 MB), restarts maintain the same tunnel ID. To run 2 replicas for HA, just bump replicas — Cloudflare load-balances the tunnel.

**Traefik IngressRoutes** (Traefik is K3s' built-in ingress; uses CRDs for fine-grained routing):

```yaml
# k8s/40-edge/ingressroutes.yaml (excerpt)
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata: { name: blyss-marketplace, namespace: blyss }
spec:
  entryPoints: [web]
  routes:
  - match: Host(`blyss.co.ke`) || Host(`buy.blyss.co.ke`) || Host(`my.blyss.co.ke`)
    kind: Rule
    services: [{ name: web, port: 3000 }]
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata: { name: blyss-api, namespace: blyss }
spec:
  entryPoints: [web]
  routes:
  - match: Host(`api.blyss.co.ke`)
    kind: Rule
    services: [{ name: api, port: 8000 }]
---
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata: { name: blyss-cdn, namespace: blyss }
spec:
  entryPoints: [web]
  routes:
  - match: Host(`cdn.blyss.co.ke`)
    kind: Rule
    services: [{ name: minio, port: 9000 }]
    middlewares:
    - { name: minio-public-prefix }
---
apiVersion: traefik.containo.us/v1alpha1
kind: Middleware
metadata: { name: minio-public-prefix, namespace: blyss }
spec:
  addPrefix: { prefix: "/blyss-public" }
```

The `minio-public-prefix` middleware rewrites incoming paths to `/blyss-public/...` so a request to `cdn.blyss.co.ke/products/foo.jpg` hits `http://minio:9000/blyss-public/products/foo.jpg`.

`web`, host-routed inside Next.js middleware, dispatches to the right route group based on the incoming `Host` header.

## §11.10 NetworkPolicy

```yaml
# k8s/99-network-policies.yaml (excerpt)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: postgres-deny-external, namespace: blyss }
spec:
  podSelector: { matchLabels: { app: postgres } }
  ingress:
  - from:
    - { podSelector: { matchLabels: { app: api } } }
    - { podSelector: { matchLabels: { app: worker } } }
    - { podSelector: { matchLabels: { tier: backup } } }
    ports: [{ port: 5432 }]
```

Same pattern for `redis`, `minio` (api side). Defense in depth — even if traefik or cloudflared misroute, internal services aren't exposed.

## §11.11 Migration job

Schema migrations run as a one-shot Kubernetes Job, not on API container start. Triggered by CI when migration files change.

```yaml
# k8s/50-jobs/migrate.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate-${GIT_SHA}
  namespace: blyss
spec:
  ttlSecondsAfterFinished: 600
  backoffLimit: 1
  template:
    spec:
      imagePullSecrets: [{ name: ghcr-pull }]
      restartPolicy: Never
      containers:
      - name: migrate
        image: ghcr.io/<owner>/blyss-api:${GIT_SHA}
        command: ["uv", "run", "task", "db_migrate"]
        envFrom:
        - { secretRef: { name: api } }
        - { secretRef: { name: postgres } }
        resources:
          requests: { memory: "256Mi", cpu: "100m" }
          limits: { memory: "512Mi", cpu: "1000m" }
```

CI substitutes `${GIT_SHA}` and runs `kubectl apply -f -` against the templated yaml. Waits for `kubectl wait --for=condition=complete job/migrate-${GIT_SHA}` before applying API/worker Deployment changes.

## §11.12 Backup CronJobs

**Postgres — nightly:**

```yaml
# k8s/50-jobs/backup-postgres.yaml (excerpt)
apiVersion: batch/v1
kind: CronJob
metadata: { name: backup-postgres, namespace: blyss }
spec:
  schedule: "0 2 * * *"  # 02:00 UTC = 05:00 EAT
  jobTemplate:
    spec:
      template:
        metadata: { labels: { tier: backup } }
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: postgres:16-alpine
            envFrom:
            - { secretRef: { name: postgres } }
            - { secretRef: { name: backup-b2 } }
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h postgres -U $POSTGRES_USER $POSTGRES_DB | gzip > /tmp/backup.sql.gz
              # upload to B2 via mc or rclone (image extended with these tools)
              ...
```

**MinIO — weekly:**

`mc mirror local/blyss-public b2:blyss-backups/minio/$(date +%Y-%m-%d)`

Retention: 14 daily + 4 weekly + 6 monthly. Backblaze lifecycle rules handle the rotation.

## §11.13 Resource budget verification

After applying all manifests, verify total scheduled resources:

```bash
kubectl describe nodes -n blyss | grep -A3 "Allocated resources"
```

Expected:

| Component | Memory request | Memory limit |
|---|---|---|
| postgres | 512 Mi | 1 Gi |
| redis | 128 Mi | 300 Mi |
| minio | 256 Mi | 700 Mi |
| api | 512 Mi | 1 Gi |
| worker | 256 Mi | 500 Mi |
| web | 256 Mi | 700 Mi |
| cloudflared | 50 Mi | 100 Mi |
| Traefik (k3s default) | 50 Mi | 100 Mi |
| **Total requests** | **~2.0 Gi** | **~4.4 Gi** |

Within 6 GB budget. Plenty of headroom on a 24 GB box for build pods, migration jobs, and traffic spikes.

## §11.14 Rollout strategy

- **Code change, no migration:** push to main → CI builds image with new SHA → `kubectl set image deployment/api api=ghcr.io/.../blyss-api:${SHA} -n blyss` → rolling update with `maxSurge: 1, maxUnavailable: 0`. Zero-downtime.
- **Code change with migration:** run migrate Job FIRST → wait for completion → then update Deployment images. Migrations must be backward-compatible (old API code can run against new schema for the duration of the rollout). Standard Polar practice.
- **Rollback:** `kubectl rollout undo deployment/api -n blyss` reverts to previous image.

## §11.15 Acceptance for §11

Production deploy is acceptable when:

- [ ] All manifests in `k8s/` apply cleanly to a fresh K3s node
- [ ] No service is reachable from the public internet except via Cloudflare Tunnel
- [ ] Postgres + MinIO + Redis only reachable from inside the cluster (verified by NetworkPolicy + manual test)
- [ ] All 5 hostnames resolve and serve correctly:
  - `blyss.co.ke` → marketplace home
  - `buy.blyss.co.ke` → checkout fallback page
  - `my.blyss.co.ke` → portal sign-in
  - `api.blyss.co.ke/healthz` → 200 OK
  - `cdn.blyss.co.ke/products/test.jpg` → MinIO public bucket
- [ ] Total memory usage on the node ≤ 6 GB after all pods scheduled
- [ ] Cloudflare dashboard shows the tunnel as healthy + DNS records present
- [ ] Migration Job runs successfully on first deploy
- [ ] First nightly Postgres backup lands in B2
- [ ] `kubectl rollout undo` restores a previous version cleanly

## §1 Source & Approach

There IS a source repo. Blyss is a fork of [Polar.sh](https://polar.sh) at `/home/ubuntu/workspace/blyss`. Polar is a mature open-source payment infrastructure (Python/FastAPI backend + Next.js frontend) originally built for SaaS developers.

**This is non-negotiable: we rebuild on top of the existing Polar API. We do NOT scaffold from scratch.** The backend is solid, the data models are battle-tested, the auth system works, the Paystack integration is already wired. What looks like trash is the public-facing frontend, and a lot of developer-focused surface area in both backend and dashboard that doesn't belong on a consumer marketplace.

The job is therefore:

1. **Strip aggressively.** Delete every developer-focused module, page, component, doc, marketing asset, and integration that doesn't serve a Kenyan creator selling digital products. Listed in §4.
2. **Rebuild the public surface.** Marketplace home, browse, search, creator storefronts, product detail, cart, checkout, customer portal — entire visual rewrite using a fresh design system. Spec in §6.
3. **Polish the creator dashboard.** Keep Polar's functional dashboard for creators, but strip every nav item, settings panel, and integration page that's irrelevant. Spec in §7.
4. **Add missing bits.** Cloudflare Tunnel + K3s manifests. Single GitHub Actions deploy workflow. Resend transactional email. Backup CronJobs. Spec in §11.
5. **Test locally first.** Everything runs on the developer's machine via Docker (Postgres, Redis, MinIO) before any deployment.

We do not deploy until §10–§14 say we deploy.

### Backend on K3s

The Polar Python/FastAPI app is custom code, so we build a Docker image and push to GitHub Container Registry (`ghcr.io/<owner>/blyss-api:latest`) using the auto-injected `${{ secrets.GITHUB_TOKEN }}` with `permissions: packages: write`. The K3s Deployment manifest references that image. No manual `GHCR_TOKEN` secret.

### Frontend on K3s

The Next.js app uses `output: 'standalone'`, builds to a tiny Node server, and ships as a separate image (`ghcr.io/<owner>/blyss-web:latest`). One Deployment, one replica to start. Multi-domain routing via Next.js middleware reading the `Host` header — same app, different route groups for `blyss.co.ke`, `buy.blyss.co.ke`, `my.blyss.co.ke`.

### Cloudflare Tunnel (no public IP, no Let's Encrypt origin)

A `cloudflared` Deployment runs inside the cluster as a tunnel client. Cloudflare's edge handles SSL, DDoS, and caching. The K3s server's public IP never serves HTTP directly; ports 80/443 stay closed. DNS is auto-managed via `cloudflared tunnel route dns`.

This collapses the deployment surface:

```
Browser → Cloudflare edge (cache, DDoS, SSL)
       ↓
       Cloudflare Tunnel (encrypted)
       ↓
       cloudflared pod (K3s, ~80 MB RAM)
       ↓
       Traefik (K3s built-in ingress)
       ↓
       ├─ Next.js Deployment      (host-routed: blyss / buy / my)
       ├─ Polar API Deployment    (api.blyss.co.ke)
       ├─ MinIO public bucket     (cdn.blyss.co.ke)
       └─ Polar backoffice        (blyss.co.ke/_ops, hidden)

Inside cluster (ClusterIP only, never public):
       Postgres StatefulSet · Redis Deployment · MinIO API · Polar worker
```

---


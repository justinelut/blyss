## §2 Tech Stack (exact versions, do not substitute)

**Runtime**

- Node 24 LTS (already pinned in `clients/web/package.json` engines)
- Python 3.14 (already pinned in `server/.python-version`)

**Backend (existing, keep)**

- FastAPI — already in `server/pyproject.toml`
- SQLAlchemy 2.x async
- PostgreSQL 16
- Dramatiq (background workers)
- Redis 7 (cache + queue)
- MinIO (S3-compatible object storage)

**Frontend (rebuild on existing Next.js project)**

- Next.js 16 App Router with `output: 'standalone'`
- React 19.2
- TypeScript 5.9
- Tailwind CSS v4 (already configured at `clients/web/src/styles/globals.css`)
- shadcn/ui — the only allowed component library; already initialized
- Radix UI primitives (via shadcn)
- Lucide icons — the only allowed icon set
- **Motion** (motion.dev — formerly Framer Motion) — the only animation library. Handles component animations, layout animations, gestures, scroll-linked animations (via native `ScrollTimeline` API where supported, hardware-accelerated), and scroll-triggered reveals (via pooled `IntersectionObserver`). Migrate the existing `framer-motion@^12` dep to the unified `motion` package. No GSAP, no Lenis, no AOS, no React Spring.
- Embla Carousel React (already a dep) — only horizontal carousels (no auto-rotating heroes)
- TanStack Query 5 (already a dep) — server state from Polar API
- Zustand (already a dep) — client state (cart, search filters, currency)
- React Hook Form + Zod (already a dep) — forms + validation
- Sharp (already a dep) — image processing
- `next/og` (already a dep, the `@vercel/og` API now built into Next 16) — dynamic OG images
- `react-markdown` + `remark-gfm` — render creator subscription perk markdown

**Auth (Polar's existing system, prune)**

- Email magic link (Polar's `login_code` module) — keep
- Google OAuth — keep
- Apple OAuth — keep
- GitHub OAuth — **DELETE** (developer-focused, irrelevant for Kenyan creators/buyers)

**Payments**

- Paystack only. Already integrated at `server/polar/integrations/paystack/`. Cards + M-Pesa.
- All Stripe code paths in marketplace surface — DELETE (the integration module under `server/polar/integrations/stripe/` may stay temporarily to avoid migration churn, but no UI touches Stripe; remove fully in §4).

**Email**

- Resend — free tier (3k emails/day) covers launch
- Transactional: magic link, order receipt, payout notification, refund confirmation
- Domain `blyss.co.ke` with SPF + DKIM + DMARC

**Search**

- Postgres full-text search (Polar's `polar/search/` module + `search_vectors_backfill.py`). Sufficient up to ~10k products.
- Upgrade path to Meilisearch documented but not built.

**Analytics + monitoring**

- PostHog (already a dep) — product analytics + Web Vitals
- Sentry (already a dep) — errors
- BetterStack free tier — uptime pings on `blyss.co.ke` and `api.blyss.co.ke`

**Infrastructure (single server, K3s)**

- K3s (already installed)
- Traefik — k3s built-in ingress
- `cloudflared` Deployment — Cloudflare Tunnel client (replaces public IP exposure + cert-manager)
- Backblaze B2 — off-server backups (Postgres dumps + MinIO mirror), via K3s `CronJob`s

**RAM budget (≤ 6 GB total for our stack on 24 GB box)**

| Service | Budget |
|---|---|
| Postgres 16 (StatefulSet, `shared_buffers=512MB`) | 1 GB |
| Redis 7 (Deployment, `maxmemory 256mb`) | 300 MB |
| MinIO (StatefulSet, single-node mode) | 700 MB |
| Polar API (FastAPI, 2 uvicorn workers) | 1 GB |
| Polar worker (Dramatiq, 2 processes) | 500 MB |
| Next.js (standalone, 1 replica) | 700 MB |
| Traefik (k3s built-in) | 100 MB |
| `cloudflared` tunnel | 80 MB |
| **Total** | **≈ 4.4 GB** |

Headroom: 1.6 GB inside our budget for traffic spikes, build pods, and migration jobs.

**CI/CD**

- Single GitHub Actions workflow at `.github/workflows/deploy.yml`
- Build Polar API image → push to GHCR
- Build Next.js standalone image → push to GHCR
- SSH into server using `${{ secrets.SSH_PRIVATE_KEY }}` and `${{ secrets.SERVER_IP }}` (already configured in repo)
- `kubectl apply -f k8s/` → wait for rollout
- DB migrations as a separate `kubectl run` job triggered only when migration files change
- Image push uses auto-injected `${{ secrets.GITHUB_TOKEN }}` with `permissions: packages: write` — no manual GHCR token

**Domain layout (all DNS auto-created by `cloudflared tunnel route dns`)**

| Surface | Domain |
|---|---|
| Marketplace + creator dashboard | `blyss.co.ke` |
| Public API | `api.blyss.co.ke` |
| Hosted checkout (Paystack flow + share-able checkout links) | `buy.blyss.co.ke` |
| Customer portal (subscriptions, downloads, perks) | `my.blyss.co.ke` |
| Public CDN for product images | `cdn.blyss.co.ke` |
| MinIO admin console | not public — `kubectl port-forward` only |
| Polar backoffice (internal ops) | wherever Polar mounts it by default — leave untouched |

---


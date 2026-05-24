# §9 Performance budgets

> See also: [09-seo.md](./09-seo.md) (Core Web Vitals as ranking signals), [04-ui-direction.md](./04-ui-direction.md) (anti-pattern checklist), [11-local-dev.md](./11-local-dev.md) (Lighthouse in CI)

Performance is non-negotiable. Kenya is a mobile-first, often bandwidth-constrained market — a site that's slow on a 4G connection in Mombasa is a site nobody buys from. Cloudflare gives us the edge; this section is what we control inside the origin.

## §9.1 Core Web Vitals targets (real-user, p75)

| Metric | Target | Hard fail threshold |
|---|---|---|
| LCP — Largest Contentful Paint | ≤ 2.0s | 2.5s |
| INP — Interaction to Next Paint | ≤ 150ms | 200ms |
| CLS — Cumulative Layout Shift | ≤ 0.05 | 0.1 |
| TTFB — Time to First Byte | ≤ 200ms (cached) / ≤ 600ms (uncached) | 1.0s |
| FCP — First Contentful Paint | ≤ 1.5s | 2.0s |

Measured against p75 of real-user data (Search Console field metrics, PostHog Web Vitals). Synthetic Lighthouse runs in CI as a guardrail but the real number is what Google uses.

## §9.2 Per-page budgets (synthetic Lighthouse, mobile, 4G simulated)

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` (home) | ≥ 92 | ≥ 95 | ≥ 95 | ≥ 95 |
| `/browse` | ≥ 90 | ≥ 95 | ≥ 95 | ≥ 95 |
| `/creators` | ≥ 92 | ≥ 95 | ≥ 95 | ≥ 95 |
| `/creators/[slug]` | ≥ 90 | ≥ 95 | ≥ 95 | ≥ 95 |
| `/product/[id]` | ≥ 90 | ≥ 95 | ≥ 95 | ≥ 95 |
| `buy.blyss.co.ke/checkout/[id]` | ≥ 92 | ≥ 95 | ≥ 95 | n/a (noindex) |
| `my.blyss.co.ke/*` | ≥ 88 | ≥ 95 | ≥ 95 | n/a (noindex) |
| `/dashboard/*` | ≥ 80 | ≥ 95 | ≥ 95 | n/a (noindex) |

Public pages must hit ≥ 90. Auth-gated pages allowed slightly lower performance because they're not indexed and the user is already invested.

## §9.3 JavaScript bundle budgets

| Route group | Budget (gzipped JS) |
|---|---|
| Marketplace pages (`(marketplace)/*`) | ≤ 180 KB |
| Hosted checkout (`(checkout)/*`) | ≤ 220 KB (Paystack widget adds weight) |
| Customer portal (`(portal)/*`) | ≤ 200 KB |
| Dashboard (`/dashboard/*`) | ≤ 350 KB (more interactive, some leniency) |
| Shared chunk | ≤ 80 KB |

Enforced by Next.js `experimental.bundlePagesRouterDependencies` + a CI check that runs `pnpm build` and inspects the output.

## §9.4 Bundle hygiene rules

- **No `'use client'` at page root** for marketplace pages. Client islands only.
- **Tree-shake aggressively.** Import named exports, not whole packages: `import { format } from 'date-fns'` not `import * as df from 'date-fns'`.
- **Lazy-load below-the-fold components** with `next/dynamic` and `loading: () => null`.
- **Defer all third-party scripts.** PostHog, Sentry — `next-script` `strategy="lazyOnload"`.
- **No moment.js, no lodash whole-package.** date-fns (already used) and selective imports only.
- **No client-side icon library bloat.** Lucide is tree-shaken — `import { Heart, Search } from 'lucide-react'` only imports those two icons.
- **No Material UI, no Emotion at runtime** (deleted in §4.5).
- **Audit every `'use client'` component** for whether it really needs the client. If it just needs hover state, CSS does that for free.

Build-time size check: `pnpm build` reports per-route bundle sizes. CI fails if any route exceeds the budget by >10 KB.

## §9.5 Image pipeline

The biggest performance win on any e-commerce site is image optimization.

**Upload path:**

1. Creator uploads product image via dashboard
2. Polar API receives the file, hashes it, uploads original to MinIO at `cdn.blyss.co.ke/products/{product_id}/original-{hash}.jpg`
3. API returns the original URL

**Serving path:**

1. Frontend uses `<Image src="https://cdn.blyss.co.ke/products/.../original-{hash}.jpg" />` from `next/image`
2. Next.js Image Optimization API (`/_next/image?url=...&w=...&q=75`) requests the original from MinIO, generates the right-sized variant on-the-fly, caches the result on disk in the Next.js pod
3. Cloudflare caches the variant URL aggressively (30 days) — second request to the same size hits the edge in <50ms

**Configuration in `next.config.mjs`:**

```javascript
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'cdn.blyss.co.ke' },
    { protocol: 'http', hostname: 'minio', port: '9000' }, // local dev only
  ],
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [320, 420, 640, 768, 1024, 1280, 1920],
  imageSizes: [64, 96, 128, 256, 384],
  minimumCacheTTL: 86400, // 24h on the Next pod
  qualities: [60, 75, 85],
}
```

**Per-image rules:**

- Hero images: `priority` attribute, preload via `next/font` doesn't apply, but use `fetchPriority="high"`
- Product cards: `loading="lazy"`, `sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"`
- Avatars: served at exact display size, no lazy load (above-the-fold typically)
- OG images (1200×630): static once generated, Cache-Control `immutable`

**Sharp configuration:**

`next/image` uses `sharp` (already a dep) under the hood. No config needed beyond the above.

**RAM consideration:** Next.js image optimization holds source images in memory while resizing. For 4K product photos this can spike to 200+ MB momentarily. Set `images.minimumCacheTTL: 86400` to avoid repeated optimization, and `NEXT_SHARP_PATH` env var if we hit memory issues. With the 700 MB Next.js budget we have room.

## §9.6 Font strategy

Inter + Inter Display, self-hosted (already at `clients/web/src/fonts/`).

- `next/font/local` to load + subset
- Preload only the weights used above-the-fold (Inter 400, 500, 600 + Inter Display 500, 600)
- `display: swap` so text renders immediately, falls back to system font, swaps when font loads
- Subset Latin + Latin Extended (we don't need Cyrillic, CJK, etc.)
- Total font bytes shipped: ≤ 100 KB

## §9.7 Database query budgets

The Polar API serves the marketplace. Slow API → slow pages.

Per-endpoint p95 latency targets:

| Endpoint | p95 target |
|---|---|
| `GET /v1/products/public?...` (list) | ≤ 80 ms |
| `GET /v1/products/public/{id}` | ≤ 50 ms |
| `GET /v1/organizations/public/{slug}` | ≤ 60 ms |
| `GET /v1/categories/` | ≤ 30 ms |
| `GET /v1/search?q=...` | ≤ 150 ms |
| `POST /v1/cart/items` | ≤ 100 ms |
| `POST /v1/checkout` | ≤ 300 ms (Paystack call) |

Achieved by:

- Indexes on every queried column (Polar mostly has these; verify on `products.is_featured`, `products.organization_id`, `products.category_id`)
- Connection pooling via PgBouncer-style pool inside the FastAPI app (SQLAlchemy async pool)
- Redis caching of hot read paths: `/v1/categories/`, `/v1/settings/site`, `/v1/products/public?is_featured=true` (cache 60s)
- ISR caches the rendered HTML, so most marketplace traffic doesn't even hit the API on the second visit

Monitor via Sentry performance tracing (already a dep). Slow queries surface as transactions exceeding p95 — alert in Sentry.

## §9.8 Critical rendering path

Nothing in the critical path of LCP except:

1. HTML (cached at edge, <100ms TTFB)
2. CSS (inlined critical CSS via Next.js, <30 KB inline)
3. The hero image (preloaded, fetchPriority="high")
4. The hero text (font-swap, system fallback while Inter loads)

JavaScript loads but does NOT block. Cookie banner, analytics, animation scripts — all defer.

## §9.9 Lighthouse CI

Run Lighthouse on every PR:

```yaml
# .github/workflows/lighthouse.yml
- run: pnpm build && pnpm start &
- run: npx wait-on http://localhost:3000
- run: npx lhci autorun --collect.url=http://localhost:3000 \
    --collect.url=http://localhost:3000/browse \
    --collect.url=http://localhost:3000/creators \
    --assert.preset=lighthouse:recommended \
    --assert.assertions.categories:performance.minScore=0.90
```

Failed runs block PR merge. Track scores over time.

## §9.10 Backend performance: FastAPI on K3s

Polar is async FastAPI with uvicorn. On a 1 GB pod budget:

- 2 uvicorn workers (matches 2 logical cores typical at this scale)
- `--limit-concurrency 200` per worker
- Async DB pool size 20 per worker (40 total)
- Async Redis pool size 10 per worker
- No blocking I/O — every DB call is `await`ed

Background work (image hashing on upload, search index rebuild, webhook fanout, email send) goes through Dramatiq, not the request thread.

## §9.11 Acceptance for §9

Performance is acceptable when:

- [ ] All public pages hit Lighthouse Performance ≥ 90 on mobile 4G simulation
- [ ] No marketplace bundle exceeds 180 KB gzipped
- [ ] Hero images render with LCP < 2.0s on a synthetic 4G run
- [ ] Real-user p75 LCP from PostHog Web Vitals ≤ 2.0s after first month of traffic
- [ ] No layout shift on initial render (CLS < 0.05)
- [ ] Cloudflare cache hit ratio ≥ 80% on `/product/*` after a week
- [ ] API p95 latency under target on staging load test
- [ ] Lighthouse CI gate is wired and blocks merges
- [ ] No `next dev` warnings about image without dimensions, layout shift, or missing `priority` on LCP image

# Phase 8 — SEO + performance polish

> Plan refs: [§8 SEO](../09-seo.md), [§9 performance](../10-performance.md). Goal: Lighthouse ≥ 90 perf / ≥ 95 a11y/seo/bp on every public page; structured data validates; fast on Kenyan 4G.

## 8.1 Per-page meta (§8.2)

- [ ] **8.1.1 Audit `app/layout.tsx` root meta** — set defaults: title template, description, OG defaults, Twitter card, `lang="en-KE"`, `viewport`
- [ ] **8.1.2 Add `generateMetadata()` to `app/(marketplace)/page.tsx` (home)** — per §8.2 home format
- [ ] **8.1.3 Add `generateMetadata()` to `/browse` with category-aware titles**
- [ ] **8.1.4 Add `generateMetadata()` to `/creators` and `/creators/[slug]`**
- [ ] **8.1.5 Add `generateMetadata()` to `/product/[id]`** with creator + product format
- [ ] **8.1.6 Add `generateMetadata()` to `/search` with query format**
- [ ] **8.1.7 Set canonical URLs on all public pages** — `alternates: { canonical }`
- [ ] **8.1.8 Verify `<meta name="robots">` defaults to `index, follow` on public pages, `noindex` on auth + checkout + portal**

## 8.2 Structured data (§8.3)

- [ ] **8.2.1 Inject home `WebSite` + `Organization` JSON-LD** via `<JsonLd>` (phase 4 task 4.14)
- [ ] **8.2.2 Inject product `Product` JSON-LD** with offers + aggregateRating + review (last 3)
- [ ] **8.2.3 Inject creator `Person` JSON-LD** with image + url + description
- [ ] **8.2.4 Inject browse `CollectionPage` + `ItemList` JSON-LD**
- [ ] **8.2.5 Inject `BreadcrumbList` JSON-LD on product + creator + browse pages**
- [ ] **8.2.6 Inject help `FAQPage` JSON-LD if FAQ section present**
- [ ] **8.2.7 Validate every page on Google Rich Results Test** — fix all errors

## 8.3 Dynamic OG images (§8.4)

- [ ] **8.3.1 Build `/api/og/site/route.tsx`** — Blyss wordmark + tagline default
- [ ] **8.3.2 Build `/api/og/product/[id]/route.tsx`** — product hero + name + price + creator + Blyss wordmark, 1200×630
- [ ] **8.3.3 Build `/api/og/creator/[slug]/route.tsx`** — creator banner + name + handle + Blyss wordmark
- [ ] **8.3.4 Build `/api/og/category/[slug]/route.tsx`** — category name + 4-image collage
- [ ] **8.3.5 Set Cache-Control on each: `public, max-age=31536000, immutable`** (cache by versioned URL if design changes)
- [ ] **8.3.6 Verify OG images render correctly when shared** — test on Twitter card validator + LinkedIn post inspector

## 8.4 Sitemap (§8.5)

- [ ] **8.4.1 Build `app/sitemap.ts`** — index pointing at 4 child sitemaps
- [ ] **8.4.2 Build `app/api/sitemaps/static/route.ts`** — home, browse, creators, help, terms, privacy, acceptable-use, refunds
- [ ] **8.4.3 Build `app/api/sitemaps/products/route.ts`** — paginated by 50k, includes `<image:image>` per product cover
- [ ] **8.4.4 Build `app/api/sitemaps/creators/route.ts`**
- [ ] **8.4.5 Build `app/api/sitemaps/categories/route.ts`**
- [ ] **8.4.6 Use real `lastmod` from DB** — never "today"
- [ ] **8.4.7 Cache sitemaps via Cloudflare 1 hour**

## 8.5 robots.txt (§8.6)

- [ ] **8.5.1 Build `app/robots.ts`** — host-aware: `blyss.co.ke` allows public, disallows `/dashboard`, `/api/`, `/_ops`, `/checkout/`, `/search?q=*`, `/*?cursor=*`, `/*?sort=*`
- [ ] **8.5.2 Verify `buy.blyss.co.ke/robots.txt` blocks all** — `Disallow: /`
- [ ] **8.5.3 Verify `my.blyss.co.ke/robots.txt` blocks all**
- [ ] **8.5.4 Verify `cdn.blyss.co.ke/robots.txt` allows all**

## 8.6 IndexNow (§8.7)

- [ ] **8.6.1 Generate IndexNow key, store in `INDEXNOW_KEY` env**
- [ ] **8.6.2 Commit keyfile at `clients/web/public/{key}.txt`** so `https://blyss.co.ke/{key}.txt` is reachable
- [ ] **8.6.3 Build `app/api/indexnow/route.ts`** — POST endpoint that pings IndexNow on product/creator publish webhooks
- [ ] **8.6.4 Wire Polar `product.created` and `organization.updated` webhooks to call this endpoint**
- [ ] **8.6.5 Verify with a test publish** — IndexNow returns 200/202

## 8.7 Internal linking (§8.8)

- [ ] **8.7.1 Audit product page link count** — must include creator (1) + category (1) + 4 related + breadcrumbs (2) ≥ 7 links
- [ ] **8.7.2 Audit creator page** — links to all products + all categories used + 3 similar creators
- [ ] **8.7.3 Audit category page** — links to top 30 products + sibling categories

## 8.8 Image SEO (§8.9)

- [ ] **8.8.1 Audit all `<Image>` for descriptive `alt` text** — enforce in Vitest property test
- [ ] **8.8.2 Filename hygiene on upload** — store as `{product-slug}-{n}.jpg`
- [ ] **8.8.3 Add image sitemap entries** — included in `sitemap-products.xml` task 8.4.3

## 8.9 Cloudflare cache rules (§8.10)

- [ ] **8.9.1 Configure cache rules in Cloudflare dashboard** per §8.10 table
- [ ] **8.9.2 Set origin `Cache-Control` headers** — `public, s-maxage=60, stale-while-revalidate=600` on cacheable HTML
- [ ] **8.9.3 Set `Cache-Control: private, no-store` on /dashboard, /cart, /login, buy.*, my.***
- [ ] **8.9.4 Verify cache hit ratio** — after a week of traffic, Cloudflare dashboard shows ≥ 80% hit on `/product/*`

## 8.10 Search Console + Bing Webmaster (§8.11)

- [ ] **8.10.1 Verify domain in Google Search Console** via Cloudflare DNS TXT record
- [ ] **8.10.2 Submit `https://blyss.co.ke/sitemap.xml`**
- [ ] **8.10.3 Verify in Bing Webmaster Tools and submit sitemap**

## 8.11 Local SEO — Kenya (§8.12)

- [ ] **8.11.1 Confirm `<html lang="en-KE">` on root layout**
- [ ] **8.11.2 Confirm KES is default currency in product schema**
- [ ] **8.11.3 Confirm `+254` phone formatting throughout**

## 8.12 Performance (§9)

- [ ] **8.12.1 Set `output: 'standalone'` in `next.config.mjs`** — required for K3s image
- [ ] **8.12.2 Configure `images:`** per §9.5 (remotePatterns, formats avif+webp, deviceSizes, imageSizes)
- [ ] **8.12.3 Audit every page for `priority` on the LCP image**
- [ ] **8.12.4 Audit `loading="lazy"` on all below-fold images**
- [ ] **8.12.5 Set `experimental.optimizePackageImports`** for `lucide-react`, `date-fns`, `motion`
- [ ] **8.12.6 Verify per-route bundle sizes**
  - Marketplace ≤ 180 KB gzipped
  - Checkout ≤ 220 KB
  - Portal ≤ 200 KB
  - Dashboard ≤ 350 KB
  - Add CI check that `pnpm build` output respects budgets

- [ ] **8.12.7 Audit every `'use client'` directive** — remove if just CSS-needed
- [ ] **8.12.8 Defer all third-party scripts** — PostHog + Sentry use `strategy="lazyOnload"`
- [ ] **8.12.9 Subset Inter + Inter Display fonts** — latin + latin-ext only, ≤ 100 KB total
- [ ] **8.12.10 Verify CLS on home + product pages < 0.05**
- [ ] **8.12.11 Set up Web Vitals reporting via PostHog** — `web-vitals` library or Next.js built-in
- [ ] **8.12.12 Add Lighthouse CI gate to CI** — `.github/workflows/lighthouse.yml` per §9.9

## Acceptance for phase 8

- [ ] Every public page has unique title + description of correct length
- [ ] All structured data validates on Google Rich Results Test
- [ ] OG images render correctly on Twitter, LinkedIn, Facebook
- [ ] Sitemap index + 4 child sitemaps return valid XML
- [ ] `robots.txt` correct on all 4 hosts
- [ ] IndexNow keyfile reachable; ping flow tested
- [ ] Internal link audit ≥ 7 per product page
- [ ] All images have alts + correct filenames
- [ ] Cloudflare cache rules applied
- [ ] Search Console + Bing Webmaster verified
- [ ] Lighthouse CI gate blocks PRs below thresholds
- [ ] Bundle budgets enforced
- [ ] Real-user p75 LCP ≤ 2.0s after first month of traffic (deferred verification)

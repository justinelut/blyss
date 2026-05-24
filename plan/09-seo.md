# §8 SEO — incredible, not afterthought

> See also: [03-tech-stack.md](./03-tech-stack.md) (Cloudflare + ISR), [07-pages.md](./07-pages.md) (page-level meta), [10-performance.md](./10-performance.md) (Web Vitals targets)

The user named "incredible SEO" as a top requirement. Self-hosting on K3s instead of Vercel removes some defaults, so we engineer SEO explicitly across rendering, structured data, sitemaps, image optimization, edge caching, and indexing.

## §8.1 Rendering strategy

- **All public marketplace pages are server-rendered** (React Server Components, no `'use client'` at the page root). The HTML Google sees is the final HTML, not a JS shell.
- **ISR with `export const revalidate = 60`** on product, creator, category, and search pages. The Next.js standalone server caches the rendered HTML on disk; Cloudflare caches it again at the edge. A new product gets indexed within 60 seconds of publish.
- **Streaming with React Suspense** for below-the-fold content (related products, reviews) — the LCP block ships first, the rest fills in.
- **No SPA navigation for marketplace surfaces.** Use `<Link prefetch>` for in-app navigation, but the URL changes are real navigations. Server returns rendered HTML each time. (Dashboard can stay client-heavy; it's not indexed.)

## §8.2 Per-page meta tags

Every public page exports a Next.js `generateMetadata()` function that returns:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id)
  return {
    title: `${product.name} by ${product.creator.name} | Blyss`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 200),
      images: [{ url: `/api/og/product/${product.id}`, width: 1200, height: 630 }],
      type: 'website',
      siteName: 'Blyss',
      locale: 'en_KE',
    },
    twitter: { card: 'summary_large_image', images: [`/api/og/product/${product.id}`] },
    alternates: { canonical: `https://blyss.co.ke/product/${product.id}` },
    other: { 'price': `${product.price} KES` },
  }
}
```

Title format conventions:

| Page | Title |
|---|---|
| `/` | `Blyss — Kenya's Modern Creator Marketplace` |
| `/browse?category=X` | `{Category} on Blyss · Digital products from Kenyan creators` |
| `/creators` | `Kenyan Creators on Blyss · Digital products and subscriptions` |
| `/creators/[slug]` | `{name} on Blyss · {city} creator` |
| `/product/[id]` | `{product.name} by {creator.name} \| Blyss` |
| `/search?q=X` | `Search results for "{query}" on Blyss` |

Description format: 140–160 chars, real product/creator data, never lorem-ipsum or generic boilerplate. The first 50 chars are the most important — that's what shows in mobile search results.

## §8.3 Structured data (JSON-LD)

Every public page injects a `<script type="application/ld+json">` tag with schema.org structured data. This is what gets a product into Google's rich-result product cards with price + rating + image.

**Homepage (`/`):**

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Blyss",
  "url": "https://blyss.co.ke",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://blyss.co.ke/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

Plus `Organization` schema for Blyss itself.

**Product page (`/product/[id]`):**

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "description": "...",
  "image": ["..."],
  "brand": { "@type": "Person", "name": "Creator name", "url": "..." },
  "offers": {
    "@type": "Offer",
    "url": "...",
    "priceCurrency": "KES",
    "price": "1200",
    "availability": "https://schema.org/InStock",
    "seller": { "@type": "Person", "name": "Creator name" }
  },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "32" },
  "review": [/* last 3 reviews as Review schema */]
}
```

Plus `BreadcrumbList` for the breadcrumb (Browse → Category → Product).

**Creator page (`/creators/[slug]`):**

`Person` schema with name, url, image (avatar), description (bio), `subjectOf` linking to product list.

**Browse / Category page (`/browse?category=...`):**

`CollectionPage` with `mainEntity` being an `ItemList` of products (first 24 with name + url + image + price).

**Static pages (Help, Terms, Privacy):**

`Article` schema or `FAQPage` (for help) with date published / modified.

Helper: a single `<JsonLd data={...} />` server component renders structured data consistently. Validate with [Google's Rich Results Test](https://search.google.com/test/rich-results) before launch.

## §8.4 Dynamic OG images

Every shareable URL needs a custom OG image, not a generic logo placeholder.

Implementation: Next.js 16 has `next/og` built in. Routes:

```
app/api/og/site/route.tsx              # default: Blyss wordmark + tagline on warm bone background
app/api/og/product/[id]/route.tsx      # product hero image + name + price + creator + Blyss wordmark
app/api/og/creator/[slug]/route.tsx    # creator banner + name + handle + Blyss wordmark
app/api/og/category/[slug]/route.tsx   # category name + 4-image collage from top products
```

Each route returns `new ImageResponse(<JSX>, { width: 1200, height: 630 })`. Uses Inter font subset shipped with the route. Cache-Control: `public, max-age=31536000, immutable` once the asset is stable (cache by `?v=` param if we update the design).

Cloudflare caches these aggressively — second request to the same URL hits the edge in <50ms.

## §8.5 Sitemap

Single index sitemap at `/sitemap.xml` pointing at four child sitemaps:

```
/sitemap.xml                           # index
├── /sitemap-static.xml                # /, /browse, /creators, /help, /terms, /privacy, /acceptable-use, /refunds
├── /sitemap-products.xml              # all published products
├── /sitemap-creators.xml              # all published creator storefronts
└── /sitemap-categories.xml            # category landing pages
```

Implementation: `app/sitemap.ts` for the index + four route handlers under `app/api/sitemaps/{type}/route.ts` that page through the DB. Each child sitemap caps at 50,000 URLs (Google's limit); paginate via `?page=N` if a single type exceeds that. Regenerate on a 1-hour Cloudflare-cached basis.

`<lastmod>` field reflects the actual `updated_at` of the resource, not "today" — Google penalizes lying about lastmod.

## §8.6 robots.txt

```
User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /api/
Disallow: /_ops
Disallow: /checkout/
Disallow: /search?q=*
Disallow: /*?cursor=*
Disallow: /*?sort=*

Sitemap: https://blyss.co.ke/sitemap.xml
```

We disallow:

- `/dashboard` — auth-only
- `/api/` — internal API
- `/_ops` — backoffice
- `/checkout/` — confirmation pages with order IDs (these would crowd the index with low-quality URLs)
- Search results (`?q=`) and pagination (`?cursor=`, `?sort=`) — duplicate-content traps

We don't disallow `buy.blyss.co.ke` and `my.blyss.co.ke` via this file because they're separate hosts; each subdomain gets its own robots.txt:

- `buy.blyss.co.ke/robots.txt` → `User-agent: * \n Disallow: /` (entire host blocked from crawling — checkout pages should never be indexed)
- `my.blyss.co.ke/robots.txt` → `User-agent: * \n Disallow: /` (entire portal blocked)
- `cdn.blyss.co.ke/robots.txt` → `User-agent: * \n Allow: /` (image CDN allowed, but we don't link to the bare CDN URL anywhere)

Implement via `app/robots.ts` reading the request `Host` header.

## §8.7 IndexNow — instant indexing

When a creator publishes a new product, ping IndexNow so Bing and Yandex index it within minutes, and Google notices via the same shared crawler signal.

Flow:

1. After product publish (`POST /v1/products` returns 200), Polar fires a webhook event `product.created`
2. A small Next.js API route (`app/api/indexnow/route.ts`) listens for that webhook and pings:
   ```
   POST https://api.indexnow.org/IndexNow
   {
     "host": "blyss.co.ke",
     "key": "{INDEXNOW_KEY}",
     "keyLocation": "https://blyss.co.ke/{INDEXNOW_KEY}.txt",
     "urlList": ["https://blyss.co.ke/product/{id}"]
   }
   ```
3. The keyfile at `/{INDEXNOW_KEY}.txt` is a static file containing the same key

Same flow on creator publish (new storefront URL).

Generate a unique IndexNow key once, store in `.env` as `INDEXNOW_KEY`, commit the keyfile.

## §8.8 Internal linking density

Google ranks pages partly on inbound link graphs. Every product page must link to:

- The creator (1 link)
- The category (1 link)
- 4 related products (4 links)
- Sibling tabs (Description, Benefits, Reviews) — counted as in-page anchors, not external
- Breadcrumbs (Browse → Category → Product, 2 links)

Every creator page links to all their products + their categories + 3 similar creators.

Every category page links to top-30 products in that category + sibling categories.

This builds the dense internal link graph that Google rewards.

## §8.9 Image SEO

- All images use `<img alt="...">` with descriptive alt text. Empty alts only for decorative images.
- Filename hygiene: when a creator uploads a product image, store it as `{product-slug}-{n}.jpg` not `IMG_4729.jpg`.
- Image sitemap entries: include each product's first image in `sitemap-products.xml` with `<image:image><image:loc>...` per Google's image sitemap format.
- Image dimensions: serve at the right size via Next.js `<Image>` + `cdn.blyss.co.ke` — no oversized originals served to mobile.

## §8.10 Cloudflare caching configuration

Cloudflare proxies `blyss.co.ke`, `buy.blyss.co.ke`, `my.blyss.co.ke`, `cdn.blyss.co.ke` (orange cloud). DNS-only for `api.blyss.co.ke` (gray cloud — webhooks need direct origin).

Page rules / cache rules:

| URL pattern | Cache behavior |
|---|---|
| `cdn.blyss.co.ke/*` | Cache everything 30 days, ignore query strings on images |
| `blyss.co.ke/_next/static/*` | Cache everything 1 year, immutable |
| `blyss.co.ke/api/og/*` | Cache everything 7 days, key by full URL |
| `blyss.co.ke/sitemap*.xml` | Cache 1 hour |
| `blyss.co.ke/robots.txt` | Cache 1 day |
| `blyss.co.ke/product/*` | Cache HTML 60s (matches ISR), respect origin Cache-Control |
| `blyss.co.ke/creators/*` | Cache HTML 60s |
| `blyss.co.ke/dashboard/*` | Bypass cache (auth-only) |
| `blyss.co.ke/cart`, `/login` | Bypass cache (per-user) |
| `buy.blyss.co.ke/*` | Bypass cache (per-checkout state) |
| `my.blyss.co.ke/*` | Bypass cache (auth-only) |

Origin sets `Cache-Control: public, s-maxage=60, stale-while-revalidate=600` on cacheable HTML. Cloudflare honors `s-maxage`.

## §8.11 Search Console + Bing Webmaster

Verify both at launch via DNS TXT record (Cloudflare DNS makes this trivial). Submit:

- `https://blyss.co.ke/sitemap.xml`
- `https://blyss.co.ke` as the property

Monitor Search Console weekly for: indexing coverage, crawl errors, mobile usability, Core Web Vitals (Search Console pulls real-user data once we have traffic). Alert if indexing drops >10% week-over-week.

## §8.12 Local SEO — Kenya signals

Help Google understand we're for Kenyan users:

- `<html lang="en-KE">` on root layout
- `hreflang` not needed yet (single-language); add when we localize Swahili
- KES as default currency in product schema
- Kenya address in Organization schema (placeholder until we have a real office address)
- Phone numbers in `+254...` format
- Mention "Nairobi" and "Kenya" in homepage copy, footer, About page

## §8.13 Page speed as SEO

Google ranks Core Web Vitals as a search signal. Targets enforced by Lighthouse in CI:

| Metric | Target | What it means |
|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.0s | Hero image / headline visible quickly |
| INP (Interaction to Next Paint) | ≤ 150ms | Clicks feel instant |
| CLS (Cumulative Layout Shift) | ≤ 0.05 | Nothing jumps around |
| TTFB (Time to First Byte) | ≤ 200ms (cached) / ≤ 600ms (uncached) | Cloudflare + ISR makes the cached path fast |

Detailed performance work in [10-performance.md](./10-performance.md).

## §8.14 Acceptance for §8

The site is SEO-ready when:

- [ ] Every public page has a unique `<title>` and `<meta description>` of correct length
- [ ] Product, Creator, Category, FAQ pages emit valid JSON-LD passing Google's Rich Results Test
- [ ] OG images render correctly for product, creator, and category routes
- [ ] `sitemap.xml` index loads, lists 4 child sitemaps, each child sitemap returns valid XML
- [ ] `robots.txt` is correct on all 4 hosts
- [ ] IndexNow key file is reachable; ping flow tested manually
- [ ] Internal link audit on a sample product page hits ≥ 7 internal links (creator + category + 4 related + breadcrumbs)
- [ ] Image alts present everywhere; image sitemap includes all product covers
- [ ] Cloudflare cache rules applied; cache-hit ratio on `/product/*` ≥ 80% in Cloudflare dashboard after a week of traffic
- [ ] Search Console + Bing Webmaster verified, sitemap submitted
- [ ] Lighthouse SEO score ≥ 95 on home, browse, product, creator pages
- [ ] Real-world Core Web Vitals (Search Console field data) within target after first month of traffic

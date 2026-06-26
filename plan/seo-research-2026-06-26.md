# Blyss SEO Research — Keyword Map + Strategy

_Generated 2026-06-26 from Google autocomplete (sg=ke), DuckDuckGo competitor
SERPs, and direct competitor on-page SEO inspection._

## 1. What's actually being searched

### A. Kenyan creator-side intent (people who want to SELL)
The highest-volume Kenyan-context queries are creator-side:

- "digital products to sell in kenya"  ← evergreen, multiple sites ranking
- "how to develop / create digital products"
- "selling ebooks online in kenya"
- "how to sell ebooks online in kenya"
- "best side hustle kenya 2026"
- "make money online kenya" + "for free" / "via mpesa" / "without investment"
- "passive income kenya"
- "earning money online kenya"

**Implication:** /start (creator onboarding) page needs to rank for these. It's
the biggest traffic opportunity on the site.

### B. Buyer-side intent (people who want to BUY)
Less competitive, wide-open opportunity:

- "buy notion templates" (incl. "for students / productivity / adhd")
- "best lightroom presets" / "wedding lightroom presets" / "for portraits"
- "buy beats online" + "exclusive rights" / "cheap" / "south africa"
- "buy ebooks" + "for kindle" / "without drm" / "australia"
- "social media templates" + "etsy" / "canva" / "free"
- "instagram template canva" + "etsy"
- "fonts to buy for commercial use"
- "stock music / royalty free music"

**Implication:** Marketplace + category pages must target these. Currently the
marketplace title is generic — needs per-category SEO copy.

### C. Kenyan buyer-side intent (lighter volume, no competition)
Almost no good results exist for these in our actual SERP samples:

- "where to buy ebooks in kenya"
- "online courses kenya" (mostly university results — gap for paid niche courses)
- "kenyan author ebooks"
- "kenyan music producers" / "top kenyan music producers"
- "kenyan ebooks"

**Implication:** Each category page needs a "from Kenyan creators" angle and
canonical pages like /creators (already exists).

## 2. Competitor analysis — what they're NOT doing

| Site | Title | Description | JSON-LD | Country positioning |
| ---- | ----- | ----------- | ------- | ------------------- |
| Selar.com | "The best way to sell digital products online" | (empty) | 0 blocks | none — global |
| Gumroad | "Earn your first dollar online with Gumroad" | "Start selling what you know..." | 0 | none |
| Vendblue (KE) | "Sell Your Digital product with Ease" | "powerful e-commerce platform..." | 1 (untyped) | none |
| Lemon Squeezy | "Payments, tax & subscriptions for software companies" | (empty) | 0 | none |
| Sellfy | "Online Store Builder: Create a Free Online Store" | (empty) | 1 (untyped) | none |

**Key gaps Blyss can win:**

1. **Structured data.** None of the major competitors emit proper schema.org
   JSON-LD on their homepage. Blyss already ships Organization + WebSite.
   Add Product, ItemList, Person, BreadcrumbList and we lap them.
2. **Geo positioning.** None mention Kenya / M-Pesa / Africa. The "in kenya"
   modifier is HOT — own it.
3. **Description quality.** Selar, Lemon Squeezy, Sellfy have no meta
   description. Vendblue's is AI-slop ("powerful"). Blyss's anti-slop
   description ("templates, ebooks, beats, presets, courses. M-Pesa or
   card. Paid within 24 hours.") is already a concrete winner — just
   needs per-page differentiation.
4. **Per-product schema.** None have Product schema with offers + ratings
   on listing pages. Blyss has the data (orders_count, review_rating_avg
   from last week's work) — emit it.

## 3. Per-route keyword map

### `/` (home — both audiences)
- **Primary:** digital products marketplace Kenya, buy digital downloads
- **Secondary:** templates / ebooks / beats / presets / courses, M-Pesa, instant download
- **Title:** "Blyss — Digital products from Kenyan creators · Templates, ebooks, beats, presets, courses"
- **Description:** Already strong. Tighten to lead with the Kenya angle.

### `/start` (creator onboarding — Kenyan creator-side)
- **Primary:** sell digital products kenya, make money online kenya, side hustle kenya 2026
- **Secondary:** mpesa shop, passive income kenya, kenya creator economy, sell ebook kenya
- **Title:** "Sell digital products in Kenya · Start selling on Blyss"
- **Description:** Make money selling templates, ebooks, beats, presets, or courses to buyers across Kenya. Get paid to your M-Pesa within 24 hours. No setup fee.
- **Need: FAQ JSON-LD** with the 6–8 most-asked creator questions

### `/marketplace` (all products — buyer-side)
- **Primary:** buy digital downloads, digital products, creator marketplace
- **Secondary:** templates, ebooks, beats, presets, courses, instant download
- **Title:** "Browse digital products · Instant download · Blyss marketplace"
- **Need: ItemList JSON-LD** of the products on page

### `/categories` + `/category/[slug]` (buyer-side, long-tail)
Each category is its own long-tail page:
- `/category/ebooks` — "Buy ebooks online · Kenyan + global authors"
- `/category/notion-templates` — "Buy Notion templates · Productivity, students, ADHD, work"
- `/category/lightroom-presets` — "Buy Lightroom presets · Wedding, portraits, mobile"
- `/category/beats` — "Buy beats online · Exclusive rights, instrumentals"
- `/category/courses` — "Buy online courses · Self-paced, instant access"
- `/category/canva-templates` — "Buy Canva templates · Instagram, social media"
- `/category/fonts` — "Buy fonts for commercial use"
- `/category/stock-music` — "Buy royalty-free music · Commercial use"
- **Need: CollectionPage / ItemList JSON-LD** + intro long-form copy (200–400 words) targeting that category's top long-tail query

### `/creators/[slug]` (creator storefronts)
- **Primary:** {creator name}, {creator name} {product type}
- **Secondary:** "{creator name} blyss", "buy {product type} {creator name}"
- **Title:** "{Creator name} · {Product types they sell} · Blyss"
- **Need: Person/Organization JSON-LD** with sameAs + per-product ItemList

### `/product/[id]` (product detail)
- **Primary:** {product title} + maybe "buy"
- **Need: Product JSON-LD** with offers (price, currency, availability),
  aggregateRating (when reviews exist), brand (creator), category

### `/about`, `/help`, `/terms` etc.
- Keep existing; add BreadcrumbList JSON-LD

## 4. Lighthouse improvements (perf, not SEO)

| Issue | Fix | Files |
| ----- | --- | ----- |
| LCP 2.7–4.3s | Hero images need `priority` + correct `sizes` | `Hero.tsx`, `StorefrontHero.tsx`, layout heroes |
| Font swap latency | Preload Inter Display latin-only subset; defer everything else | `fonts/fonts.ts` |
| Render-blocking JS | Move PostHog, GA init to `next/script strategy="afterInteractive"` | `AnalyticsTag.tsx`, providers |
| `/ke` SEO 92 | Missing canonical / description on locale-prefixed routes | next.config proxy + layout |
| `/categories` SEO 100 but Perf 73 | LCP image — investigate which one | `CategoriesIndexPage.tsx` |

## 5. Concrete deliverables (ranked by impact)

1. **Per-route generateMetadata()** with the title + description above (highest impact, lowest risk)
2. **JSON-LD coverage:** Product, ItemList, CollectionPage, Person, BreadcrumbList, FAQPage on /start (highest rich-snippet eligibility)
3. **Sitemap rewrite:** drop the legacy Polar `/features/*`, `/resources/*`, `/customers/*`, `/docs`, `/careers` routes (404'd); add dynamic creator + product URLs
4. **Robots.txt:** disallow `/api/*`, `/dashboard/*`, `/login/*`, `/cart`, `/wishlist`, `/verify-email/*`, `/_next/*`
5. **Long-form category copy:** 200–400 words per top category page, targeting the top long-tail query
6. **LCP fix:** add `priority` + accurate `sizes` to every above-the-fold image; preload Inter Display

## 6. Anti-slop boundaries

Per `/plan/04-ui-direction.md` and `.kiro/skills/anti-slop-writing` skill:
- No "discover", "seamless", "powerful", "modern", "transform your", "unlock"
- Concrete product types: "templates, ebooks, beats, presets, courses"
- Specific payment rails: "M-Pesa, Visa, Mastercard"
- Specific timeframes: "paid within 24 hours"
- Specific places: "Nairobi", "Kenya" — not "African ecosystem"

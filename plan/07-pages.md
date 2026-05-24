## §6 Page-by-page spec — public marketplace

Every page lives in the same Next.js app at `clients/web/src/app/`. Multi-domain routing happens in `middleware.ts` reading the `Host` header:

| Host header | Rewrites to |
|---|---|
| `blyss.co.ke` (default) | `/(marketplace)/*` |
| `buy.blyss.co.ke` | `/(checkout)/*` |
| `my.blyss.co.ke` | `/(portal)/*` |
| `cdn.blyss.co.ke` | served by Traefik → MinIO directly, never hits Next.js |
| `api.blyss.co.ke` | served by Traefik → Polar API directly, never hits Next.js |

Each route group has its own `layout.tsx` with surface-specific navigation. The same component library and design tokens (§3) drive all three.

Every public page (under `(marketplace)`) is **server-rendered** (React Server Component, no `'use client'` at the page root), with ISR `revalidate: 60` for product, creator, and category pages. Interactive components are isolated client islands.

### §6.0 Component redesign principle: ecommerce, not SaaS

Every existing Polar component that survives the §4 strip — atoms, molecules, the dashboard chrome, modals, dropdowns, form inputs, tables — gets a visual pass to make it feel like a Kenyan editorial ecommerce site, not a billing dashboard. Concretely:

- **Cards** lose their borders and shadows; they sit on `--surface-sunken` blocks instead.
- **Buttons** swap Polar's grey-blue defaults for the Blyss palette (§3.2).
- **Tables** become typographic lists where possible — not zebra-striped data grids. Where a table is genuinely the right pattern (orders list, payouts), it uses ample whitespace, no vertical lines, no hover-zebra.
- **Empty states** lose Polar's developer-style "Get started with the API" copy and replace it with creator-voice editorial copy.
- **Iconography** moves entirely to Lucide; any Material Icons / FontAwesome / Heroicons refs are replaced.
- **Form inputs** match §3.4 (background, no border, focus underline only).
- **Loading skeletons** use `--surface-sunken` pulse, not grey rectangles.
- **Density** loosens — Polar's UI is dense (information-rich for power users); Blyss breathes (info-thin per screen, more screens). The marketplace especially.

Walk-through approach: when a Polar component is first touched in any §6 page, the AI agent does the visual pass on it then. By the time §6.1–§6.13 are built, every reused component has been redesigned.

If a Polar component still feels like SaaS after the pass — Linear-grade dashboard cleanliness, not Etsy editorial — scrap and rebuild from scratch using shadcn primitives.

### §6.1 `/` — Marketplace home (blyss.co.ke)

The conversion-critical page. A first-time Kenyan visitor decides in 3 seconds whether Blyss is for them.

**Sections, in order:**

1. **Header** (sticky, blurred on scroll). Logo wordmark left → `Browse · Creators · Subscriptions · Help` center → search icon, cart icon (with count), `Sign in` + `Start selling` right.

2. **Hero** — full-bleed background using a single hand-picked editorial image (initially: a curated Kenyan creative workspace photo, sourced from a brief. Until creators upload, use commissioned photography with `placeholder: true` flag in Settings.) Two layers of overlay text:
   - Eyebrow `DIGITAL PRODUCTS · NAIROBI` in tracked uppercase (Inter 600 11px, accent color)
   - Headline in Inter Display 600 italic-on-one-word: *"Make. **Sell.** Get paid."* — clamp(48px, 6vw, 88px)
   - Lede in Inter 22px max 60ch: "The modern marketplace for Kenyan creators. Templates, ebooks, beats, presets, courses, subscription tiers. M-Pesa or card. Paid out within 24 hours."
   - Single primary CTA `Start selling` (filled accent). NO secondary CTA above the fold. NO scroll-down arrow.
   - **Motion:** GSAP-style sequenced reveal via `motion`'s `useScroll` and stagger animations — eyebrow fades up 200ms, headline word-by-word 300ms, lede + CTA together 200ms. Background image scales from 1.04 to 1.0 over 800ms. Full sequence respects `prefers-reduced-motion`.

3. **Trending products** (eyebrow `WHAT'S SELLING`). 8-card grid (4×2 desktop, 2×4 tablet, 1-col mobile). Pulled from `GET /v1/products/public?sort=trending&limit=8`. Card uses §3.4 imagery rules (4:5 aspect ratio, warm overlay on hover, no shadow). Hover: image scales 1.04 over 350ms, accent text underline appears under product name. No "Add to cart" button on the card — click takes you to the product page where the buy decision is made. (Adding to cart from grid is too quick; it inflates abandonment metrics and ruins our conversion analytics.)

4. **By craft** (eyebrow `BROWSE BY CRAFT`). 6-tile category grid (3×2 desktop, 2×3 tablet). Each tile is `--surface-sunken` background, 1:1 aspect ratio, category name in Inter Display 500 24px, item count in 13px muted. Categories pulled from `GET /v1/categories/`. Tile hover: background brightens to `--surface-elevated`. Click → `/browse?category={slug}`.

5. **Featured creators** (eyebrow `MEET THE MAKERS`). 4 creators, edited in dashboard via `is_featured` flag on organizations. Each creator is a tall card (4:5) showing creator avatar with their work as a 4-image collage background, name + handle, one-sentence bio, count of products sold. Click → `/creators/[slug]`.

6. **Subscriptions worth it** (eyebrow `RECURRING ACCESS`). 6 subscription products from `GET /v1/subscriptions/public?is_featured=true&limit=6`. Card shows: subscription name, creator name + small avatar, "From KSh X / month" tabular numerals, the first benefit description. Card click → `/product/{id}`.

7. **A note from the makers** (full-bleed, max 60ch centered, single column). An editorial paragraph, signed off `— Blyss · Nairobi`. Pulled from a `Settings` global (admin-editable). Default copy: *"Blyss is built for Kenyan creators tired of foreign platforms taking 10% and refusing M-Pesa. We charge 20%, pay out in 24 hours, and don't pretend you're not here."* Audit before launch.

8. **How it works** (eyebrow `HOW IT WORKS`). 4 numbered steps as a horizontal scroll on desktop, vertical on mobile. Numbers in Inter Display 300 96px accent color. Each step gets one sentence:
   1. *Set up your storefront in 10 minutes.*
   2. *Upload your work — files, links, or markdown.*
   3. *Buyers pay with M-Pesa or card.*
   4. *We pay you out within 24 hours.*

9. **Closing CTA band** (dark mode). Full-bleed `--background` (dark). Single line in Inter Display italic 56px: *"Your storefront is one signup away."* Below: `Start selling` button (accent), and a small text link `Already selling? Sign in`.

10. **Footer**. Wordmark + tagline `The modern marketplace for Kenyan creators`. Three small link columns:
    - **Browse** — All products · Categories · Creators · Subscriptions
    - **Sell** — Start selling · Pricing · Help center · Creator handbook
    - **Blyss** — About · Contact · Terms · Privacy · Acceptable use
    - Social icons (Instagram, X, TikTok) muted accent
    - `© 2026 Blyss · Nairobi · Made in Kenya` in 12px tracked uppercase

**Data fetches (server component):**

```typescript
const [trending, categories, featuredCreators, subscriptions, settings] = await Promise.all([
  api.GET('/v1/products/public', { params: { query: { sort: 'trending', limit: 8 }}}),
  api.GET('/v1/categories/', { params: { query: { limit: 6 }}}),
  api.GET('/v1/organizations/public', { params: { query: { is_featured: true, limit: 4 }}}),
  api.GET('/v1/subscriptions/public', { params: { query: { is_featured: true, limit: 6 }}}),
  api.GET('/v1/settings/site'),
])
```

ISR: `export const revalidate = 60` — page rebuilds at most once per minute.

**SEO meta:**

- `<title>Blyss — Kenya's Modern Creator Marketplace</title>`
- `<meta name="description" content="Buy and sell digital products in Kenya. Templates, ebooks, beats, courses, subscriptions. Pay with M-Pesa or card.">`
- OG image: hero composition with the headline burned in, generated via `next/og`
- JSON-LD: `WebSite` with `SearchAction` pointing at `/search?q={query}`

### §6.2 `/browse` — Catalog browse

The serious shopper. Filter, sort, find.

**Layout:** Two-column on desktop (240px filter rail left + product grid right), single-column on mobile with filters in a bottom sheet.

**Filter rail (left, sticky):**

- **Category** — checkboxes from `/v1/categories/`
- **Price** — min/max inputs (KES tabular numerals) + slider
- **Type** — `One-time purchase` / `Subscription` (radio)
- **Currency** — `KES` / `USD` pill toggle (USD shows automatic conversion)
- **Sort** — `Newest` / `Trending` / `Price: low to high` / `Price: high to low` (select)

All filter state lives in URL query params via `nuqs` (already a dep) so users can share filtered views.

**Grid:** 4 columns desktop / 3 tablet / 2 mobile. Same `ProductCard` as §6.1. Pagination via cursor (`?cursor=...`) at 24 per page. Empty state: editorial message, no cartoon. *"No products match these filters yet. Try widening your price range or clearing a category."*

**Search bar:** sticky at top of right column, autocomplete dropdown showing top 5 product matches + "See all results for X" link.

**Mobile:** filter bottom-sheet triggered by `Filters` button + chip row showing active filters with X to remove each.

**Performance:** the grid is a client island, but the first 24 products render server-side and stream in. Subsequent pages fetch client-side with TanStack Query infinite query.

### §6.3 `/creators` — Creators directory

The discovery surface. Browse the makers, not the products.

**Sections:**

1. Eyebrow `MEET THE MAKERS` + headline `Kenya's creative class, online.` (clamp(36px, 4vw, 56px))
2. Filter strip — `All` · `Designers` · `Writers` · `Musicians` · `Educators` · `Photographers` · `Developers` (filter by primary category of their work)
3. Featured creator spotlight — 1 large editorial card, full-width, hero image with their work, bio, top product, `View storefront` CTA. Edited in `/admin` via `is_featured_spotlight`.
4. Creator grid — 12 cards 3×4 desktop / 2×6 tablet / 1×12 mobile. Card: avatar (1:1, 96px), name, @handle, one-line bio (max 80 chars), product count, `Visit storefront →`. Light hover lift via `translate-y(-2px)` over 200ms.
5. Pagination at 24 per page.

Empty / loading / error states all use the editorial voice — no skeleton greys, just `--surface-sunken` pulse blocks.

### §6.4 `/creators/[slug]` — Creator storefront

Each creator's own page. The single most-shared URL in our entire product (creators paste this in their TikTok / Instagram / X bios). Must be beautiful.

**Sections:**

1. **Storefront hero** — full-bleed banner the creator uploads (16:9, 1920×1080 minimum). Overlay at the bottom-left: avatar (1:1, 88px) + name (Inter Display 600 48px) + @handle + one-line bio + city. Right side: small `Subscribe` button (jumps to subscriptions tab) and `Tip` button (opens donation modal).

2. **Tabs** — `All work` (default), `Subscriptions`, `Wishlist this creator` (saved searches across all their work for the logged-in user). On scroll, tabs become sticky at the top.

3. **All work tab** — 4-col masonry grid of all their products. ProductCard. Each card uses 4:5 aspect ratio.

4. **Subscriptions tab** — 1-3 tiers in a horizontal row (single column on mobile). Each tier card shows: name, monthly KES price (tabular), "X subscribers", first 3 benefits as bullet markdown-rendered, `Subscribe` CTA. Cards have no shadow, just `--surface-sunken` background. Featured tier has a thin `--accent` left border 4px wide.

5. **About** — long-form bio (markdown, up to 1000 chars), contact links (creator's social handles, email if they made it public).

6. **Reviews of this creator** — aggregate review count + average across all products, then last 6 reviews in a 2-col grid. Click `View all reviews` → `/creators/[slug]/reviews`.

7. **Footer** — same as marketplace footer.

**Server data fetch:**

```typescript
const [creator, products, subscriptions, reviewSummary, recentReviews] = await Promise.all([
  api.GET('/v1/organizations/public/{slug}'),
  api.GET('/v1/products/public', { params: { query: { organization_id, limit: 24 }}}),
  api.GET('/v1/subscriptions/public', { params: { query: { organization_id }}}),
  api.GET('/v1/reviews/summary', { params: { query: { organization_id }}}),
  api.GET('/v1/reviews', { params: { query: { organization_id, limit: 6 }}}),
])
```

**SEO:**

- Title: `{creator.name} — Digital products on Blyss`
- OG: dynamic, generated with creator avatar + name on Blyss palette
- JSON-LD: `Person` schema with `image`, `url`, `description`, plus `subjectOf` linking to product list
- Canonical: `https://blyss.co.ke/creators/{slug}`
- Add `<link rel="alternate"` for variant URLs if the creator uses a custom subdomain (v1.1)

### §6.5 `/product/[id]` — Product detail

The page where the buying decision happens. This is the hardest page in the whole app to get right.

**Layout (desktop):** Two-column. Left: image gallery (sticky on scroll). Right: title, price, description, benefits, buy buttons, creator card, related products, reviews. Single column on mobile.

**Sections:**

1. **Breadcrumb** — `Browse > {category} > {product name}` (Inter 13px muted, accent on last segment).

2. **Image gallery** — first image is the hero (4:5 aspect), thumbnails strip below. Click thumbnail → swap hero. Hero supports zoom on hover (subtle scale, no lightbox jankiness). Mobile: horizontal swipe with dot pagination. Uses `OptimizedImage` (existing component, redesigned per §3).

3. **Product info column:**
   - Eyebrow: creator name + small avatar (link to `/creators/[slug]`)
   - Title in Inter Display 500 36-48px clamp
   - Price (large, tabular nums) — KES default, currency toggle inline
   - Lede description (1-2 sentences, 18px)
   - **Buy button** (filled accent, full width) — text changes by product type:
     - Digital download → `Buy for KSh X`
     - Subscription → `Subscribe — KSh X / month`
     - Free → `Get it`
   - Secondary: `Add to wishlist` (heart icon, ghost button) and `Share` (icon, opens copy-link)

4. **Tabs section** — `Description` (default) / `What's included` / `Benefits` / `Reviews`
   - **Description** — long-form markdown rendered safely (sanitized)
   - **What's included** — for digital downloads: file list (name, size, format icon). For subscriptions: list of tiers with their benefits.
   - **Benefits** — list of attached benefits with icons. Markdown content from custom benefits is shown as an unlock preview ("Subscribe to access").
   - **Reviews** — review list with rating distribution graph at top, individual review cards below.

5. **Creator card** — surface-sunken block, 32px padding. Avatar 64px + name + handle + bio + `Visit storefront` link + product count. The handoff back to the creator's universe.

6. **Related products** — 4-card grid pulled from same creator + same category mix. `GET /v1/products/public/related/{id}?limit=4`.

7. **Recently viewed** — 4-card horizontal scroll, client-only, from localStorage. Hidden on first visit.

**Buy flow:**

- One-time product → `Add to cart` (cart drawer slides in, "Continue shopping" or "Checkout" buttons), OR `Buy now` (skip cart, jump to `buy.blyss.co.ke/checkout?product_id=...`)
- Subscription → never goes through cart (one subscription per checkout), goes direct to `buy.blyss.co.ke/checkout?subscription_id=...`
- Free product → instant `Claim` button, no checkout, just adds to customer's portal.

**SEO:**

- Title: `{product.name} by {creator.name} | Blyss`
- Description: first 160 chars of product.description
- OG: dynamic with hero image + product name + price burned in
- JSON-LD: `Product` schema with `name`, `image`, `description`, `offers.price`, `offers.priceCurrency`, `brand` (creator), `aggregateRating` (if reviews), `review` (last 3)
- Canonical URL
- Open Graph image at 1200×630 served by `next/og`

**Performance:** product page is the most-trafficked route. ISR `revalidate: 60`. First image priority-loaded. All other images lazy. Description tab content streamed in.

### §6.6 `/cart` — Cart page (and cart drawer)

Two surfaces. The drawer (slides in from right, used from product page Add-to-Cart) and the full page (used from cart icon in nav).

**Drawer (`<Sheet>` from shadcn):**

- 420px wide on desktop, full-screen on mobile
- Header: `Your cart (3)` + close X
- List of cart items: thumbnail (4:5, 80px wide), name, creator name, qty controls (- 1 +), line price, remove icon
- Subtotal at the bottom
- `Checkout` primary CTA full-width
- `View full cart` ghost link

**Full page:**

- Page title `Your cart`
- Two-column: left = items list (table-ish, but typographic, no actual table borders), right = summary + checkout CTA (sticky on scroll)
- Empty state: editorial message with `Browse` CTA
- Logic: cart can mix only one-time products. Subscription products always check out alone (per Polar). If cart already has items and user clicks `Subscribe` on a subscription product, show modal: *"Subscriptions check out separately. Continue with this subscription, or finish your cart first?"*

**Cart persistence:** Polar's existing `polar/cart/` module handles this. Logged-in users → DB. Anonymous → cookie session token. Already implemented at `clients/web/src/stores/cartStore.ts`.

### §6.7 Hosted checkout — `buy.blyss.co.ke`

Routed via Next.js `middleware.ts`. The `(checkout)` route group serves three things:

1. **`buy.blyss.co.ke/`** — landing copy if someone visits the bare domain. Single sentence: *"buy.blyss.co.ke is where you check out and where Kenyan creators share their products. Visit a creator's storefront at blyss.co.ke."* with a `Go to Blyss` button. We never expect organic traffic here; this is a fallback.

2. **`buy.blyss.co.ke/checkout/[clientSecret]`** — the actual Paystack-powered checkout. This is Polar's existing `clients/web/src/app/checkout/[clientSecret]/page.tsx` route, redesigned per §3:
   - Top: small Blyss wordmark + breadcrumb back to creator
   - Left column: product summary card (image, name, price breakdown, line items)
   - Right column: form — email, name, country (KE default), phone (M-Pesa-eligible), discount code, total, primary `Pay KSh X` button
   - Payment method choice: M-Pesa STK Push (default for KE), card. Paystack widget embedded inline (not popup).
   - Trust signals: tiny `Secured by Paystack` line, `Refund within 14 days` line
   - Mobile: single column, sticky CTA at bottom
   - Confirmation screen after pay: editorial thank-you with delivery details (download link, subscription details, perk markdown rendered immediately)

3. **`buy.blyss.co.ke/[checkout-link-slug]`** — share-able checkout links. Polar's `polar/checkout_link/` module. Creator generates a link in their dashboard (e.g., `buy.blyss.co.ke/jane-doe-tiktok-pack`) and pastes it in their TikTok bio. The link is product-specific. Hitting this URL preloads the product into the checkout flow. No cart, no friction.

**Why a separate subdomain matters:** Paystack's M-Pesa flow uses STK Push to the user's phone. If checkout shares a domain with marketing/dashboard, cookies and session tokens get tangled and Paystack's CSP rules conflict. A clean checkout subdomain is the cleanest cookie + CSP boundary. Same Next.js app, just isolated route group.

### §6.8 Customer portal — `my.blyss.co.ke`

Where buyers manage their purchases. Polar's existing `polar/customer_portal/` powers all data; we redesign the UI.

**Routes (all under `(portal)` route group, host-routed by middleware):**

- `my.blyss.co.ke/` — overview: hello {name}, active subscriptions, recent orders, perks waiting
- `my.blyss.co.ke/orders` — order history table (typographic, not actual table)
- `my.blyss.co.ke/subscriptions` — active subscriptions, with "Manage" expanding into the perk content + cancel/upgrade controls
- `my.blyss.co.ke/subscriptions/[id]` — single subscription view: tier name, creator, started at, next billing date, payment method, perk content (rendered markdown), update payment method, cancel
- `my.blyss.co.ke/files` — all files purchased, downloadable list (name, creator, format, size, download button generates a 60s signed MinIO URL)
- `my.blyss.co.ke/wishlist` — saved products
- `my.blyss.co.ke/account` — email, name, phone, password (or magic-link toggle), payment methods, delete account

**Auth gate:** unauthenticated visitors → magic-link sign-in form (email-only). Polar's `login_code` module powers this.

**Visual:** softer than the marketplace. Slightly more generous spacing. The customer portal is the post-purchase emotional moment — they should feel like *they got something good*. Each subscription page leads with the perk content, not a billing summary. Confirmation that it was worth it.

### §6.9 `/search` — Search results

Triggered from the nav search icon (opens a `<CommandDialog>` first), or directly via URL with `?q=...`. The dialog suggests products as you type, with category filters; pressing Enter or clicking "See all" navigates to `/search?q=...`.

**Search results page:**

- Top: search bar prefilled with query, count of matches
- Tabs: `All` / `Products` / `Creators` / `Categories`
- Results in 3-col grid (or 1-col list view toggle)
- Empty: *"No matches for '{query}'. Try different keywords or browse all categories."* with a `Browse all` CTA
- Backed by Polar's Postgres FTS via `polar/search/`

### §6.10 Creator onboarding — `/start`

Replaces Polar's developer onboarding. New creator signs up → lands here. State stored in `creator_onboarding_state` table (§5.4).

**Steps (each is a section, not a separate page; checklist on the side shows progress):**

1. **Welcome** — Hello, what should we call your storefront? (handle, defaults to slugified name, must be unique). Slug becomes `blyss.co.ke/creators/{handle}` and `buy.blyss.co.ke/{handle}-{product-slug}`.
2. **Your work** — single dropdown: what do you sell? `Templates / Ebooks / Beats / Presets / Vector kits / Courses / Photography / Subscriptions only / Other`. Sets the default category for their products.
3. **Storefront looks** — upload a banner image (16:9), avatar (1:1), write a one-line bio. Live preview on the right side.
4. **Get paid** — phone number + M-Pesa name verification. (Paystack subaccount creation.) Or card payout setup if they prefer.
5. **First product** — add one product to seed the storefront. Title, price, description, file upload OR subscription tier benefit. Skip and finish later is allowed.
6. **Done** — `Your storefront is live at blyss.co.ke/creators/{handle}` + `Share` button + `Go to dashboard` CTA.

Skipped steps are reachable from the dashboard checklist later. The onboarding never blocks — a creator can publish with just steps 1, 2, 5 and add the rest after their first sale.

### §6.11 Auth pages — `/login`, `/signup`

Polar's existing pages, redesigned per §3:

- Single column, max 400px width, centered
- Logo wordmark top
- Tabs `Sign in` / `Sign up` (signup is just sign-in with a creator-flag)
- Email input → magic link button (primary)
- Divider `or`
- `Continue with Google` ghost button
- `Continue with Apple` ghost button
- (No GitHub button; deleted in §4.5)
- Footer: tiny `By signing in you agree to our Terms and Privacy.` link

Magic link flow uses Polar's `login_code` module. After link click, redirect to onboarding (`/start`) for new creators or to `/dashboard` for returning creators.

### §6.12 Static pages — Help, Terms, Privacy, Acceptable use

Long-form markdown pages rendered with `react-markdown`. Source files at `clients/web/src/content/legal/{slug}.md`. No CMS for v1. Edit-in-repo workflow.

**These are Blyss-original documents, not Polar's.** Polar's existing legal text is GDPR/EU-centric and references SaaS-developer terms. Blyss legal text must be:

- Kenya-jurisdiction (Kenya Data Protection Act 2019, Communications Authority of Kenya rules, Consumer Protection Act 2012)
- Marketplace-specific (creator vs buyer obligations, refund policy, IP/copyright takedown via DMCA-equivalent, what creators can and can't sell)
- Reviewed by Kenyan counsel before launch — flag this as a launch-blocker
- Plain-language voice matching Blyss's brand, not lawyer-boilerplate where avoidable

Pages and rough scope:

- **`/help`** — getting started for creators, getting started for buyers, payments & M-Pesa, payouts, refunds, account, contact (`hello@blyss.co.ke`), pre-launch FAQ
- **`/terms`** — Blyss Terms of Service. Defines: creator agreement, buyer agreement, fees (20% platform fee), payouts within 24 hours, dispute resolution, account suspension grounds, indemnification, limitation of liability, governing law (Kenya). Replace anywhere Polar referenced "Polar," "Stripe," "SaaS," "API," "developer."
- **`/privacy`** — privacy policy compliant with Kenya Data Protection Act 2019 + GDPR (for international buyers). Cover: what we collect (email, name, phone for M-Pesa, payment details via Paystack which we don't store, browsing analytics via PostHog, device data via Sentry), why, retention periods, third parties (Paystack, Resend, Loops, Cloudflare, Backblaze, MinIO), user rights, cookie policy, contact for data requests.
- **`/acceptable-use`** — what creators can and can't sell. Prohibited: malware, copyright violations, pirated content, hate speech, sexually explicit content involving minors (zero tolerance), illegal goods, get-rich-quick schemes, drop-shipping of physical goods, anything that violates Kenyan or international law. Process for takedowns and appeals.
- **`/refunds`** — refund window (14 days for unrelated downloads, 24 hours after first access for digital downloads; subscriptions cancellable monthly, prorated refunds at platform discretion). M-Pesa refund timeline (Paystack-dependent, typically 1-5 business days).

All four pages render with the same simple layout: max 64ch column, type scale per §3.3, last-updated date at top, table of contents on right (sticky on desktop, drawer on mobile), no decorative elements.

**Until counsel reviews:** ship `[BLYSS_LEGAL_PLACEHOLDER]` markers and a top banner reading *"Legal language under review by counsel. These terms become binding at launch."* Do not soft-launch with Polar's text under Blyss branding — that's a real legal risk.

### §6.13 Error and loading states

- **404** — editorial: *"This page got lost in the noise. Try the homepage or search."* with `Go home` and `Search` buttons. Background `--surface-sunken`.
- **500** — *"Something broke on our side. The team's been notified. Try refreshing in a minute."*
- **Loading skeletons** — every server component has a `loading.tsx` sibling using `<Skeleton>` from shadcn but recolored to `--surface-sunken` with subtle `motion`-driven pulse (no grey animated rectangles).
- **Empty states** — never use cartoon mascots. Always editorial copy with one CTA.

### §6.14 Routing summary

```
clients/web/src/app/
├── (marketplace)/              # Host: blyss.co.ke
│   ├── layout.tsx              # marketplace nav + footer
│   ├── page.tsx                # §6.1 home
│   ├── browse/page.tsx         # §6.2
│   ├── creators/
│   │   ├── page.tsx            # §6.3 directory
│   │   └── [slug]/page.tsx     # §6.4 storefront
│   ├── product/[id]/page.tsx   # §6.5 detail
│   ├── cart/page.tsx           # §6.6 cart full page
│   ├── search/page.tsx         # §6.9 search results
│   ├── start/page.tsx          # §6.10 onboarding
│   ├── login/page.tsx          # §6.11 auth
│   ├── help/page.tsx           # §6.12 static
│   ├── terms/page.tsx          # §6.12
│   ├── privacy/page.tsx        # §6.12
│   ├── acceptable-use/page.tsx # §6.12
│   ├── refunds/page.tsx        # §6.12
│   ├── dashboard/              # §7 — creator dashboard, kept from Polar, redesigned
│   └── _ops/                   # §4.6 — backoffice, untouched, mounted under marketplace host
├── (checkout)/                 # Host: buy.blyss.co.ke
│   ├── layout.tsx              # minimal trust-signal layout, no top nav
│   ├── page.tsx                # §6.7 fallback landing
│   ├── checkout/[clientSecret]/page.tsx
│   └── [linkSlug]/page.tsx     # share-able checkout links
├── (portal)/                   # Host: my.blyss.co.ke
│   ├── layout.tsx              # softer portal layout
│   ├── page.tsx                # §6.8 overview
│   ├── orders/...
│   ├── subscriptions/...
│   ├── files/...
│   ├── wishlist/...
│   └── account/...
├── api/                        # internal Next.js API routes (sitemap, OG, indexnow)
├── middleware.ts               # NEW — host-based routing
├── sitemap.ts                  # §8
├── robots.ts                   # §8
└── layout.tsx                  # root layout (fonts, providers)
```

---

> **End of chunk 3.** Chunks 4–6 to follow: dashboard pruning + SEO + performance + local dev workflow, then deployment + testing + acceptance, then references + skills appendix.

# Phase 5 — Public marketplace rebuild

> Plan refs: [§6 page-by-page spec](../07-pages.md). Goal: every public surface rebuilt per §6, passing §3.5 anti-pattern checklist.

This is the longest phase. **Each page is treated as its own micro-project**: read the relevant §6 sub-section, build, screenshot, run anti-pattern checklist, run Lighthouse, commit. Don't move on until the page passes.

## 5.0 Setup

- [ ] **5.0.1 Restructure routes into route groups**
  - Move marketplace pages to `app/(marketplace)/...`
  - Create empty `app/(checkout)/...` and `app/(portal)/...` route groups
  - Acceptance: directory matches §6.14 file-tree

- [ ] **5.0.2 Write `clients/web/src/middleware.ts` for host routing**
  - Per §6 intro + §10.5 local dev override
  - On `Host: blyss.co.ke` → marketplace; `buy.` → checkout; `my.` → portal
  - In dev with `localhost:3000`, fallback to path prefixes `/_buy/...`, `/_my/...`
  - Acceptance: visiting `localhost:3000/_buy` renders the checkout fallback page (§6.7)

- [ ] **5.0.3 Build the marketplace `Header` component**
  - Per §3.4 navigation pattern + §6.1 sticky-blurred behavior
  - Logo wordmark left + center nav (Browse · Creators · Subscriptions · Help) + right cluster (search, cart, sign-in / start-selling)
  - Acceptance: header renders, blur on scroll, mobile drawer works

- [ ] **5.0.4 Build the marketplace `Footer` component**
  - Per §6.1 section 10
  - Three small link columns + social icons + copyright
  - Acceptance: footer renders correctly on all viewports

## 5.1 Home — `/` (§6.1)

- [ ] **5.1.1 Build `HeroSection`** — full-bleed image + eyebrow + headline + lede + single CTA + motion sequence per §6.1 step 2
- [ ] **5.1.2 Build `TrendingProducts`** — 8-card 4×2 grid, no Add-to-cart on card
- [ ] **5.1.3 Build `BrowseByCraft`** — 6 category tiles 3×2
- [ ] **5.1.4 Build `FeaturedCreators`** — 4 tall creator cards 4:5 aspect
- [ ] **5.1.5 Build `FeaturedSubscriptions`** — 6 subscription product cards
- [ ] **5.1.6 Build `NoteFromMakers`** — single-column editorial paragraph from Settings
- [ ] **5.1.7 Build `HowItWorks`** — 4 numbered steps, horizontal scroll desktop / vertical mobile
- [ ] **5.1.8 Build `ClosingCtaBand`** — dark mode, single Inter Display italic line + CTA
- [ ] **5.1.9 Wire data fetches** — `Promise.all` for featured products, categories, creators, subscriptions, settings (§6.1)
- [ ] **5.1.10 Set ISR + meta** — `revalidate: 60`, JSON-LD `WebSite` with SearchAction + `Organization`
- [ ] **5.1.11 Anti-pattern checklist + Lighthouse** — must pass §3.5; Lighthouse Performance ≥ 92, Accessibility ≥ 95, SEO ≥ 95
- [ ] **5.1.12 Visual regression baseline** — commit Playwright screenshot

## 5.2 Browse — `/browse` (§6.2)

- [ ] **5.2.1 Build `FilterRail`** — sticky left rail, category checkboxes + price range + type radio + currency toggle + sort
- [ ] **5.2.2 Wire URL state via `nuqs`** — every filter change updates URL
- [ ] **5.2.3 Build `ProductGrid`** — 4-col desktop, infinite scroll via TanStack Query
- [ ] **5.2.4 Build empty + loading + error states** — editorial copy, no cartoons
- [ ] **5.2.5 Build mobile filter bottom sheet** — triggered by `Filters` button, chip row of active filters
- [ ] **5.2.6 Build search bar at top of grid** — autocomplete dropdown, top 5 results + "See all" link
- [ ] **5.2.7 Anti-pattern + Lighthouse** — pass §3.5; Performance ≥ 90

## 5.3 Creators directory — `/creators` (§6.3)

- [ ] **5.3.1 Build `CreatorsHero`** — eyebrow + headline + filter strip
- [ ] **5.3.2 Build `FeaturedCreatorSpotlight`** — 1 large editorial card from `is_featured_spotlight`
- [ ] **5.3.3 Build `CreatorGrid`** — 12 cards 3×4
- [ ] **5.3.4 Wire filter strip + pagination**
- [ ] **5.3.5 Anti-pattern + Lighthouse**

## 5.4 Creator storefront — `/creators/[slug]` (§6.4)

- [ ] **5.4.1 Build `StorefrontHero`** — full-bleed banner with avatar overlay + name + bio + Subscribe/Tip
- [ ] **5.4.2 Build `StorefrontTabs`** — All work / Subscriptions / Wishlist; sticky on scroll
- [ ] **5.4.3 Build `AllWorkTab`** — 4-col masonry of all creator's products
- [ ] **5.4.4 Build `SubscriptionsTab`** — 1-3 tiers in horizontal row, featured tier with accent left-border
- [ ] **5.4.5 Build `AboutTab`** — long-form bio markdown + contact links
- [ ] **5.4.6 Build `ReviewsBlock`** — aggregate rating + last 6 reviews 2-col grid
- [ ] **5.4.7 Build `FundraisingGoalWidget`** — progress bar, raised / target / % / Contribute CTA (depends on phase 7 wiring)
- [ ] **5.4.8 Wire data fetches** — creator + products + subscriptions + reviewSummary + recentReviews
- [ ] **5.4.9 ISR + meta + JSON-LD** — `Person` schema + canonical URL
- [ ] **5.4.10 Anti-pattern + Lighthouse**

## 5.5 Product detail — `/product/[id]` (§6.5)

- [ ] **5.5.1 Build `ProductBreadcrumb`** — Browse > category > product
- [ ] **5.5.2 Build `ProductImageGallery`** — hero 4:5 + thumbnail strip + zoom-on-hover; mobile swipe + dots
- [ ] **5.5.3 Build `ProductInfoColumn`** — eyebrow with creator + title + price + lede + Buy / Subscribe / Add-to-cart + Wishlist + Share
- [ ] **5.5.4 Build `ProductTabs`** — Description / What's included / Benefits / Reviews
- [ ] **5.5.5 Build `CreatorInlineCard`** — surface-sunken block with creator info
- [ ] **5.5.6 Build `RelatedProducts`** — 4 cards from same creator + category
- [ ] **5.5.7 Build `RecentlyViewed`** — client-only, localStorage-driven
- [ ] **5.5.8 Wire buy flow** — one-time → cart drawer or buy-now redirect to `buy.blyss.co.ke/checkout?product_id=...`; subscription → direct redirect; free → instant claim
- [ ] **5.5.9 ISR + meta + JSON-LD** — `Product` schema with offers + rating + reviews
- [ ] **5.5.10 Dynamic OG image** — `/api/og/product/[id]/route.tsx` returning ImageResponse
- [ ] **5.5.11 Anti-pattern + Lighthouse**

## 5.6 Cart — `/cart` + drawer (§6.6)

- [ ] **5.6.1 Build cart drawer** — `<Sheet>` from shadcn, 420px desktop, full-screen mobile
- [ ] **5.6.2 Build full cart page** — two-column with sticky summary
- [ ] **5.6.3 Build cart-item row** — thumbnail + name + creator + qty + line price + remove
- [ ] **5.6.4 Wire subscription-vs-one-time logic** — modal on conflict
- [ ] **5.6.5 Verify cart persistence** — Polar's existing `cartStore` handles this; just wire UI
- [ ] **5.6.6 Anti-pattern + Lighthouse**

## 5.7 Hosted checkout — `buy.blyss.co.ke` (§6.7)

- [ ] **5.7.1 Build `(checkout)` route group layout** — minimal trust-signal layout, no top nav
- [ ] **5.7.2 Build bare-domain landing fallback** — single sentence + Go to Blyss CTA
- [ ] **5.7.3 Rebuild `/checkout/[clientSecret]/page.tsx`** — Polar's existing route, redesigned per §6.7 case
- [ ] **5.7.4 Build product summary card (left column)** — image + name + price breakdown + line items
- [ ] **5.7.5 Build form (right column)** — email + name + country + phone + discount + total + pay CTA
- [ ] **5.7.6 Embed Paystack inline widget** — replace popup; verify M-Pesa STK push reaches phone
- [ ] **5.7.7 Build confirmation screen** — editorial thank-you + download / subscription perk markdown
- [ ] **5.7.8 Build `/[link-slug]` checkout link route** — preloads product into checkout flow
- [ ] **5.7.9 Verify cookies + CSP scoped to `buy.blyss.co.ke`** — no leakage to / from main site
- [ ] **5.7.10 Anti-pattern + Lighthouse**

## 5.8 Customer portal — `my.blyss.co.ke` (§6.8)

- [ ] **5.8.1 Build `(portal)` route group layout** — softer than marketplace
- [ ] **5.8.2 Build portal sign-in gate** — magic-link form for unauthenticated visitors
- [ ] **5.8.3 Build `my.blyss.co.ke/`** — overview: hello + active subs + recent orders + perks waiting
- [ ] **5.8.4 Build `my.blyss.co.ke/orders`** — typographic order history
- [ ] **5.8.5 Build `my.blyss.co.ke/subscriptions`** — list of active subs
- [ ] **5.8.6 Build `my.blyss.co.ke/subscriptions/[id]`** — single subscription with perk markdown rendered, cancel/upgrade controls
- [ ] **5.8.7 Build `my.blyss.co.ke/files`** — purchased files with signed-URL downloads
- [ ] **5.8.8 Build `my.blyss.co.ke/wishlist`** — saved products
- [ ] **5.8.9 Build `my.blyss.co.ke/account`** — email + name + phone + payment methods + delete
- [ ] **5.8.10 Anti-pattern + Lighthouse**

## 5.9 Search — `/search` + command palette (§6.9)

- [ ] **5.9.1 Build search command palette** — `<CommandDialog>` opened from nav search icon, autocomplete on type
- [ ] **5.9.2 Build `/search?q=...` results page** — tabs (All / Products / Creators / Categories) + 3-col grid
- [ ] **5.9.3 Wire Postgres FTS** — verify `polar/search/` returns relevant results; tune ranking if needed
- [ ] **5.9.4 Build empty state** — editorial copy + Browse all CTA
- [ ] **5.9.5 Anti-pattern + Lighthouse**

## 5.10 Creator onboarding — `/start` (§6.10)

- [ ] **5.10.1 Build `(marketplace)/start/page.tsx`** — single-page flow with checklist sidebar
- [ ] **5.10.2 Build step 1: handle picker** — slug uniqueness check, live preview of `/creators/{handle}`
- [ ] **5.10.3 Build step 2: what do you sell?** — single dropdown setting default category
- [ ] **5.10.4 Build step 3: storefront looks** — banner + avatar + bio uploads with live preview
- [ ] **5.10.5 Build step 4: get paid** — phone + M-Pesa name verification (Paystack subaccount); or card payout setup
- [ ] **5.10.6 Build step 5: first product** — minimal product creation (skip allowed)
- [ ] **5.10.7 Build step 6: done** — share buttons + dashboard CTA
- [ ] **5.10.8 Wire `creator_onboarding_state` table** — depends on phase 7 task 7.4
- [ ] **5.10.9 Allow skipping anywhere; never block publishing**
- [ ] **5.10.10 Anti-pattern + Lighthouse**

## 5.11 Auth — `/login`, `/signup` (§6.11)

- [ ] **5.11.1 Rebuild auth pages per §6.11** — single-column 400px max width
- [ ] **5.11.2 Tabs: Sign in / Sign up** — sign-up adds creator-flag
- [ ] **5.11.3 Email magic-link form** — primary CTA
- [ ] **5.11.4 Google + Apple OAuth ghost buttons**
- [ ] **5.11.5 Confirm GitHub button removed (phase 2 already deleted)**
- [ ] **5.11.6 Anti-pattern + Lighthouse**

## 5.12 Static pages — Help, Terms, Privacy, Acceptable use, Refunds (§6.12)

- [ ] **5.12.1 Create `clients/web/src/content/legal/{help,terms,privacy,acceptable-use,refunds}.md`** — initial content as `[BLYSS_LEGAL_PLACEHOLDER]` markers + counsel-review banner
- [ ] **5.12.2 Build `(marketplace)/[slug]/page.tsx`** routes for each — render with `LegalDoc` component (phase 4 task 4.13)
- [ ] **5.12.3 Build help-page categorization** — getting started for creators, for buyers, payments + M-Pesa, payouts, refunds, account, contact
- [ ] **5.12.4 Add table of contents (sticky right rail)** — desktop sticky, mobile drawer
- [ ] **5.12.5 Anti-pattern + Lighthouse**

## 5.13 Error pages (§6.13)

- [ ] **5.13.1 Rebuild `app/not-found.tsx`** — editorial 404 copy + Go home + Search CTAs
- [ ] **5.13.2 Rebuild `app/error.tsx`** — editorial 500 copy
- [ ] **5.13.3 Rebuild `app/global-error.tsx`** — last-resort error page
- [ ] **5.13.4 Add `loading.tsx` siblings** to each route group with `Skeleton`-based UIs
- [ ] **5.13.5 Verify all empty states use editorial voice, not cartoons**

## Acceptance for phase 5

- [ ] Every page in §6.1–§6.13 built and reachable
- [ ] Every page passes §3.5 anti-pattern checklist
- [ ] Every public page hits Lighthouse Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95
- [ ] Visual regression baselines committed for the 8 surfaces in §13.4
- [ ] Multi-host routing works: `localhost/_buy/*` + `localhost/_my/*` + default → correct route groups
- [ ] Cart drawer + full cart + checkout end-to-end tested with Paystack test mode
- [ ] M-Pesa STK push verified on a real Kenyan SIM in test mode
- [ ] No "Polar" string visible on any rendered page

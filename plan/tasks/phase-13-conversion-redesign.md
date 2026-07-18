# Phase 13 — Conversion-led frontend redesign

> Plan refs: [§0 mission](../01-mission.md), [§3 UI direction](../04-ui-direction.md), [§6 pages](../07-pages.md), [§13 testing](../14-testing.md), [§14 acceptance](../15-acceptance.md), [§15 do-not-do](../16-do-not-do.md), [Visual Bible](../17-references.md), and [§19 storefront themes](../19-storefront-themes.md).
>
> Goal: make Blyss a polished, buyer-first digital-products marketplace for a worldwide audience while making seller recruitment and onboarding unmistakably useful to Kenyan creators. East Africa is the next creator-expansion layer, but no country-specific payment or payout promise ships until its operational support is verified.

## Authority and scope override

This phase is the current product-owner instruction for the redesign cycle. Where it conflicts with older frontend tasks, this file wins.

In particular, it **supersedes the broad dashboard redesign described in `phase-06-dashboard.md` for this cycle**. Dashboard work is limited to:

1. User-facing `organization` → `shop` terminology where the entity is a creator shop.
2. The confirmed responsive defect where the Overview date control and **Customize** action overflow.
3. Small spacing, contrast, token, or wrapping corrections in files already touched by items 1–2.

Do not redesign dashboard navigation, analytics, finance, orders, customers, products, widgets, tables, or business workflows under this phase.

## Non-negotiable preservation contract

- Keep all existing public and dashboard URLs, including locale handling.
- Keep server data fetching, ISR, OpenAPI types, API payloads, and query parameters.
- Keep authentication, return URLs, session behavior, permissions, and memberships.
- Keep cart grouping and persistence, checkout-session creation, Paystack/M-Pesa/card logic, subscriptions, tips, donations, discounts, fulfilment, and customer portal behavior.
- Keep onboarding readiness checks, redirects, tracking, and existing persistence.
- Keep all five storefront layouts and their theme-token/layout/module persistence.
- Keep analytics events, SEO metadata, JSON-LD, robots, and sitemap behavior.
- Keep backend/domain terms such as `Organization`, `[organization]`, `organization_id`, API paths, database columns, schemas, providers, and analytics event names.
- Do not add a dependency, backend endpoint, migration, payment method, currency, locale, or new product feature.
- Do not use a global search-and-replace for `organization`.
- Do not delete a legacy component or route until usage is proven absent and its replacement passes regression tests.
- Do not begin visual implementation until task 13.1.1 is approved.

## Audience and message hierarchy

### Buyers — worldwide audience, primary on public marketplace pages

Buyer copy is country-neutral unless a payment method is actually available for that visitor. It should explain:

- What the product is.
- Who made it.
- Price and billing cadence in the currency shown.
- File, link, course, or subscription delivery.
- Licence/usage terms when supplied.
- Payment methods actually offered at checkout.
- What happens immediately after payment.

Do not claim that every product, currency, card, or payment method is available in every country. `Browse from anywhere`, `available worldwide`, and similar claims require an operational review before use.

### Creators — Kenya first, primary on `/start`, seller CTAs, sign-up, and onboarding

Creator copy may lead with verified Kenyan advantages:

- Shop setup without developer work.
- M-Pesa and card collection through the existing Paystack flow.
- Current payout destinations and timing.
- The configured 20% fee, with no hidden-fee wording unless verified.
- Product, order, customer, payout, and storefront management.
- `KSh 1,500`, `M-Pesa`, `+254`, and Kenyan English formatting.

### East African creators — next expansion, not a false launch claim

- Editorial positioning may say `Built in Kenya. Growing across East Africa.` after approval.
- Transactional pages must not promise Ugandan, Tanzanian, Rwandan, or other local payment/payout rails until a country-by-country capability matrix confirms them.
- If support is not operational, use neutral language or omit the claim; do not build a waitlist or new backend flow in this phase.

### Vocabulary contract

- **Shop**: the creator-managed selling entity.
- **Storefront**: the public page buyers visit.
- **Shop address** or **handle**: the visible creator slug.
- **Shop team**: members who manage the shop.
- **Business details**: legal/KYC details where `shop` would be inaccurate.
- **Organization**: retained only for internal code, structured data, genuine legal/company contexts, and third-party OAuth contexts that actually mean organization.

---

## 13.1 Approval gates and baselines — P0

- [x] **13.1.1 Approve the brand direction before visual code**
    - **Approved 2026-07-18:** ink actions + oxblood accent.
    - Structural actions: `#1A1A17`; hover: `#31312C`; foreground: `#FAFAF7`.
    - Editorial/commerce accent: `#9B352F`; hover: `#842B27`; foreground: `#FAFAF7`.
    - Dark-section action: `#F5F2EC`; foreground: `#1A1A17`.
    - Dark-section accent: `#E07A70`; hover: `#ED9188`; foreground: `#0F0E0C`.
    - Success, warning, and danger remain semantic and are not replaced by oxblood.
    - Product photography and creator storefront theme palettes remain unfiltered and independent of the Blyss chrome.
    - Acceptance: product owner selected the recommended direction in writing; implementation may begin.

- [ ] **13.1.2 Record the route and behavior baseline**
    - Capture desktop and mobile baselines for home, `/start`, marketplace, categories, category detail, creators, all five storefront layouts, product detail, cart, login, onboarding, checkout, portal, and the dashboard overview.
    - Record authenticated and anonymous behavior where applicable.
    - Record empty, sparse-data, loading, error, and populated states.
    - Acceptance: every route has a baseline reference and an owner-preservation note; screenshots contain no real PII.

- [ ] **13.1.3 Build a functionality-preservation matrix**
    - Map each redesigned surface to its data source, query parameters, mutation hooks, redirects, analytics events, SEO output, and tests.
    - Give checkout, cart, auth, onboarding, currency, tips, subscriptions, and storefront theme persistence explicit rows.
    - Acceptance: every mutable workflow has a before/after smoke-test description before its component is edited.

- [ ] **13.1.4 Establish visual and responsive regression coverage**
    - Add or update screenshot coverage at `320`, `375`, `414`, `768`, and `1440` CSS pixels.
    - Add a page-level assertion that `scrollWidth <= clientWidth` except inside intentionally scrollable tables, galleries, and filter strips.
    - Include reduced-motion and JavaScript-delayed/core-content checks.
    - Acceptance: baseline suite can detect the current mobile hero invisibility and Overview Customize overflow.

---

## 13.2 Foundation: first render, theme, tokens, and motion — P0

**Primary files:**

- `clients/web/src/app/providers.tsx`
- `clients/web/src/styles/globals.css`
- `clients/web/src/design/*`
- `clients/web/src/components/Marketplace/MarketplaceHeader.tsx`
- shared button, input, select, tabs, dialog, sheet, skeleton, and form primitives

- [ ] **13.2.1 Make light mode the deterministic default**
    - Change the theme provider from system default to light default.
    - Disable OS-driven first-visit selection.
    - Consolidate the independent `blyss-theme` local-storage behavior in `MarketplaceHeader` into the shared theme provider.
    - Preserve an explicit user-selected dark mode only if the product owner keeps the toggle.
    - Preserve forced themes only where an embed/checkout contract genuinely requires one.
    - Acceptance: a fresh profile with dark OS preference receives light Blyss; an explicit stored choice behaves as approved; no hydration flash.

- [ ] **13.2.2 Apply the approved semantic color roles**
    - Update semantic tokens rather than replacing arbitrary hex values page by page.
    - Separate structural actions from editorial accent, success, warning, and danger.
    - Validate normal text, large text, focus rings, selected states, disabled states, and dark accent sections against WCAG AA.
    - Acceptance: no public page depends on burnt orange after a different direction is approved; product photography remains natural and skin tones are unmodified.

- [ ] **13.2.3 Fix invisible core content before adding motion**
    - Audit `initial={{ opacity: 0 }}` and equivalent Motion states on headings, ledes, CTAs, filters, and first product rows.
    - Server-render core content visibly; enhance it after hydration instead of making hydration a prerequisite for visibility.
    - Keep decorative and below-fold reveals restrained.
    - Acceptance: home, `/start`, marketplace, categories, and creators communicate their purpose and expose a usable primary action with JavaScript delayed or disabled.

- [ ] **13.2.4 Normalize responsive type and spacing**
    - Keep Inter Display + Inter.
    - Define page-level scales that do not let a short headline consume an entire 375 px viewport.
    - Set content widths and gutters for 320–414, tablet, and desktop.
    - Retain generous editorial rhythm below the first conversion action.
    - Acceptance: no heading wraps one word per line unintentionally; the next useful section is visible or clearly signposted on common mobile heights.

- [ ] **13.2.5 Normalize shared interactive states**
    - Buttons retain width while loading and use `aria-busy`.
    - Form labels remain visible above inputs.
    - Focus is visible without default blue/purple styling.
    - Dialogs and sheets trap focus, restore focus, close by keyboard, and respect safe areas.
    - Loading, empty, and error states use Blyss tokens and editorial copy.
    - Acceptance: primitive tests pass and no touched primitive breaks checkout, auth, dashboard, or storefront-theme forms.

- [ ] **13.2.6 Enforce restrained motion**
    - Use `motion` only, with the shared easing and duration tokens.
    - Respect `prefers-reduced-motion` for page entry, drawers, galleries, and storefront intros.
    - No scroll-jacking, mouse-follow, bouncy transitions, or auto-rotating hero.
    - Acceptance: reduced-motion screenshots contain the final layout immediately and all interactions remain understandable without animation.

---

## 13.3 Shared public chrome and commerce primitives — P0

**Primary files:** `MarketplaceHeader`, `MarketplaceMobileNav`, `MarketplaceFooter`, `MarketplaceProductCard`, `MarketplaceCreatorCard`, currency/country controls, search components, and shared layout files.

- [ ] **13.3.1 Recompose the desktop public header**
    - Keep Browse, Creators, Subscriptions, Help, search, currency/country, cart, sign-in/account, and seller CTA behavior.
    - Make search prominent enough for buyers without creating a second competing search box on browse pages.
    - Ensure the seller CTA is present but visually subordinate to buyer navigation on public shopping pages.
    - Acceptance: every existing link, account state, cart count, country/currency control, and mobile equivalent works unchanged.

- [ ] **13.3.2 Recompose mobile navigation**
    - Preserve the useful fixed Browse/Cart navigation if retained after overlap testing.
    - Keep all desktop destinations reachable in the drawer.
    - Account for safe-area insets and sticky buy bars.
    - Acceptance: no fixed bar obscures checkout fields, product CTAs, consent controls, dialogs, or the last page content.

- [ ] **13.3.3 Consolidate the product-card contract**
    - One responsive card anatomy: cover, title, creator, price/cadence, delivery type, and restrained real proof where available.
    - Preserve wishlist, product links, recurring state, geo currency, review/order aggregates, and analytics.
    - Do not show five-star rows, fake badges, drop shadows, or an Add-to-cart button on discovery cards unless current functionality specifically requires it.
    - Acceptance: the same card works on home, marketplace, category, search, related products, recently viewed, wishlist, and storefronts.

- [ ] **13.3.4 Consolidate the creator-card contract**
    - Lead with real work or creator imagery; name, craft/category, concise bio, product count, and real stats follow.
    - Provide compact and editorial variants without separate behavioral implementations.
    - Acceptance: creator directory, homepage, search, and spotlight states share data behavior and accessible links.

- [ ] **13.3.5 Standardize section, filter, and state primitives**
    - Shared `SectionHeader`, result toolbar, applied-filter summary, filter sheet, empty state, error state, and skeleton geometry.
    - Skeletons must reserve final dimensions and never replace an entire first viewport with unlabelled blocks.
    - Acceptance: marketplace, category, creators, and search use the same filter/state semantics.

---

## 13.4 Worldwide buyer homepage — P0, key surface

**Primary files:** landing `HomePage.tsx`, `Hero.tsx`, `TrendingProducts`, `BrowseByCraft`, `FeaturedCreators`, `FeaturedSubscriptions`, `ContinueShopping`, `NoteFromMakers`, `HowItWorks`, and `ClosingCtaBand`.

- [ ] **13.4.1 Replace the seller-first hero with a buyer-first opening**
    - Move `Make. Sell. Get paid.` to seller recruitment where it belongs.
    - Write a concrete buyer proposition naming digital products and independent creators, with Kenya as the marketplace’s origin—not as a restriction on buyers.
    - Primary action: browse/search products. Secondary seller path: open a shop.
    - Use real product and creator imagery only.
    - Acceptance: within the first 375 px viewport, a buyer can identify what Blyss sells and begin browsing; claims pass the geography/payment capability review.

- [ ] **13.4.2 Put discovery immediately after the proposition**
    - Follow the opening with scannable categories and live products.
    - Preserve `ContinueShopping` for returning buyers without letting it displace first-time discovery when empty.
    - Avoid a manifesto paragraph before inventory.
    - Acceptance: first real product appears within a purposeful first scroll on mobile and within the first desktop viewport where data permits.

- [ ] **13.4.3 Rebalance homepage proof**
    - Use real products, creators, subscriptions, reviews, order counts, and payout totals only where they help a decision.
    - Hide zero or weak metrics instead of manufacturing scale.
    - Use one featured creator/editorial moment rather than repeated card bands.
    - Acceptance: no fabricated proof, logo strip, animated counter, five-star strip, or generic `Why Blyss` grid.

- [ ] **13.4.4 Separate buyer reassurance from seller recruitment**
    - Buyer reassurance: delivery, creator identity, file/licence details, and methods shown at checkout.
    - Seller band: shop setup, current fee, payout destination/timing, and management tools.
    - Link the seller band to `/start`; do not let it dominate the main marketplace opening.
    - Acceptance: every claim maps to existing product behavior or an approved policy.

- [ ] **13.4.5 Handle empty, sparse, and rich catalogs**
    - Define compositions for 0, 1–3, 4–8, and 9+ products/creators.
    - A fresh marketplace should invite first creators without looking broken.
    - Acceptance: no empty grid, orphan heading, duplicate section, or giant gap in any data state.

- [ ] **13.4.6 Preserve SEO and performance**
    - Retain existing metadata, WebSite/Organization JSON-LD, dynamic data, analytics, and ISR.
    - Prioritize one LCP image; lazy-load below-fold media; keep layout dimensions stable.
    - Acceptance: no metadata or structured-data regression; mobile Lighthouse targets pass.

---

## 13.5 Kenya-first seller recruitment homepage — `/start` — P0, key surface

- [ ] **13.5.1 Reframe `/start` as the seller homepage, not the onboarding form**
    - Give creator prospects a complete decision page before authentication.
    - Opening must state the concrete outcome, current setup cost, current platform fee, payout methods, and verified timing without vague `unlock/transform/seamless` language.
    - Primary CTA routes into the existing shop-creation/auth flow; secondary path shows live shops/products.
    - Acceptance: a Kenyan creator can understand what they can sell, what it costs, how buyers pay, how they receive money, and what happens after sign-up without opening an FAQ.

- [ ] **13.5.2 Show the product instead of generic feature cards**
    - Use real storefront, product, checkout, and order-management imagery or live UI compositions.
    - Show the path from shop address to product to payment to payout.
    - Do not use floating dashboard mockups, emoji cards, fake creator quotes, or decorative charts.
    - Acceptance: every visual is sourced from real Blyss state and contains no real PII.

- [ ] **13.5.3 Present what can be sold and who Blyss is for**
    - Use real product and creator categories.
    - Lead with Kenyan creator contexts without flattening creators into cultural clichés.
    - Mention East African growth only in approved editorial wording; do not imply unsupported payout coverage.
    - Acceptance: categories link to working discovery pages and fallback content never invents marketplace activity.

- [ ] **13.5.4 Make fees, payouts, and requirements explicit**
    - Explain the configured 20% fee, no-listing/subscription fee only if current policy confirms it, payout clearance/timing, M-Pesa/bank destination, verification, prohibited products, and refund responsibility.
    - Link to terms, acceptable use, refunds, and help.
    - Acceptance: product, finance, legal, and operations owners approve every transactional sentence.

- [ ] **13.5.5 Explain the existing setup sequence**
    - Shop details → first product → payout setup/review → live storefront, matching actual redirects and readiness behavior.
    - Distinguish required steps from tasks that can be completed later.
    - Acceptance: marketing sequence and actual onboarding cannot contradict one another.

- [ ] **13.5.6 Add decision-focused FAQ and final action**
    - Answer only real blockers: eligibility, product types, fees, payout timing, M-Pesa, cards, refunds, file delivery, subscriptions, verification, and supported countries.
    - No auto-rotating accordion and no SEO keyword stuffing.
    - Acceptance: FAQ schema remains accurate and no answer promises unverified regional support.

---

## 13.6 Sign-in, sign-up, verification, and account entry — P0

**Primary files:** `/login`, `LoginShell.tsx`, code verification, verify-email, `AuthModal`, OAuth authorization/selection, and shared auth forms.

- [ ] **13.6.1 Redesign the auth shell without changing auth**
    - Use a compact editorial split or single-column composition appropriate to the amount of content; no generic centered SaaS card floating in empty space.
    - Preserve magic-link, Google/Apple availability, error handling, loading, CSRF/session behavior, and all return URLs.
    - Acceptance: anonymous buyer, returning creator, and checkout-auth entry all return to their intended route.

- [ ] **13.6.2 Make intent-specific copy factual**
    - Buyer entry: save purchases, access downloads, manage subscriptions/wishlist.
    - Creator entry: continue shop setup or manage an existing shop.
    - Avoid presenting every sign-in as creator registration.
    - Acceptance: heading/body copy follows the real `returnTo`/entry context where safely available; default copy works for both audiences.

- [ ] **13.6.3 Redesign magic-link sent, verification, expired, and error states**
    - Explain where the email was sent, what to do next, how to resend, and how to change address.
    - Preserve rate limits and API errors.
    - Acceptance: all states are keyboard accessible, useful on mobile, and expose no account-existence information beyond current behavior.

- [ ] **13.6.4 Audit OAuth shop selection**
    - Where an external app connects to a creator storefront, use `Choose a shop` and `Create your shop` in visible copy.
    - Retain `organization` where the third-party protocol or legal context genuinely means organization.
    - Acceptance: OAuth scopes, identifiers, callbacks, and consent semantics are unchanged.

- [ ] **13.6.5 Validate auth privacy and analytics**
    - No session recording on auth routes; inputs redacted; no email/phone in analytics payloads.
    - Acceptance: existing security tests pass and manual back/forward/refresh behavior is stable.

---

## 13.7 Shop creation and creator onboarding — P0, key surface

**Primary files:** `OrganizationStep.tsx`, dashboard create pages, onboarding product/integrate pages, readiness checklist, finance setup steps, and related forms.

- [ ] **13.7.1 Rename the first step around a shop**
    - `Create a new organization` → `Add another shop`.
    - First shop: `Create your shop`.
    - `Organization Name` → `Shop name`.
    - `Organization Slug` → `Shop address` or `Shop handle`, with a live public URL example.
    - Preserve schemas, form field names, analytics names, API calls, category patch, redirects, and validation mapping.
    - Acceptance: first-shop and additional-shop branches submit exactly the same payloads as before.

- [ ] **13.7.2 Recompose the shop-details form**
    - Group identity, address, selling category, currency, terms, and supporting explanation in a clear order.
    - Replace placeholder brands such as `Acme Inc.` with creator-shop examples that contain no real identity.
    - Show labels above fields and explain why each item is needed.
    - Acceptance: usable at 320 px, errors remain attached to fields, and Enter/submission behavior is unchanged.

- [ ] **13.7.3 Recompose first-product onboarding**
    - Preserve current product mutations, upload behavior, price/currency rules, benefits, and skip/continue behavior.
    - Reduce the visible field set only through progressive disclosure; do not remove supported inputs or alter payloads.
    - Acceptance: one-time, free, and recurring products follow their current supported paths and reach the same dashboard/storefront destinations.

- [ ] **13.7.4 Recompose payout and verification onboarding**
    - Use `Business details` for legal/KYC content and `Shop` for the storefront entity.
    - Explain M-Pesa STK verification and payout destination without ever asking for an M-Pesa PIN.
    - Preserve Paystack status polling, review states, retries, errors, and redirects.
    - Acceptance: pending, active, denied, retry, M-Pesa, and bank states remain functional and accurately worded.

- [ ] **13.7.5 Align onboarding progress with actual readiness**
    - Keep the existing readiness source and dashboard checklist.
    - Present one next action at a time; clearly mark optional/later work.
    - Do not invent a second onboarding state machine or require completion of optional presentation work before publishing.
    - Acceptance: refresh resumes correctly, back navigation is safe, and a creator is never trapped by the new UI.

- [ ] **13.7.6 Design completion and handoff**
    - Show the real storefront URL, next recommended action, and dashboard destination.
    - Share controls use the real URL and native sharing/copy fallback.
    - No confetti, animated counters, or fabricated `you are live` claim before readiness confirms it.
    - Acceptance: completion status matches backend readiness and all links resolve.

---

> Continue with [Phase 13b — conversion surfaces and validation](./phase-13b-conversion-surfaces.md), beginning at task 13.8.

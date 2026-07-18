# Phase 13b — Conversion surfaces and validation

> Continuation of [Phase 13 — conversion-led frontend redesign](./phase-13-conversion-redesign.md). Phase 13 authority, audience hierarchy, preservation contract, and approval gates apply unchanged.
>
> This file begins at task 13.8 and covers marketplace discovery, creator storefronts, product/checkout surfaces, the deliberately narrow dashboard work, terminology checks, and release validation.

## 13.8 Marketplace, categories, and search — P1

- [ ] **13.8.1 Compress the marketplace opening**
    - Replace the oversized/blank first viewport with a concise heading, search, and category access.
    - Preserve URL-backed filters, SSR initial products, geo currency, pagination, and TanStack Query behavior.
    - Acceptance: products or a meaningful empty state appear in the first purposeful scroll; no duplicate search controls compete.

- [ ] **13.8.2 Refine desktop filtering**
    - Keep the existing filter rail and sort behavior.
    - Strengthen selected/applied state, result count, clear-all, and keyboard navigation.
    - No hidden filter side effects or URL-state changes.
    - Acceptance: deep-linked filters hydrate without reset or flash and browser history behaves as before.

- [ ] **13.8.3 Refine mobile filtering**
    - Search and one clear Filters action form the mobile toolbar.
    - Applied filters are readable and removable; the sheet exposes all existing controls.
    - Acceptance: no clipped controls, body-scroll leak, lost focus, or page-level horizontal scrolling at 320–414 px.

- [ ] **13.8.4 Redesign category index and category detail**
    - Keep the editorial index idea but reduce pre-list space and make rows visible on first render.
    - Category detail leads with category identity and products; retain SEO copy and JSON-LD without delaying shopping.
    - Acceptance: empty and zero-count categories are honest, useful, and do not produce dead links.

- [ ] **13.8.5 Unify search entry and results**
    - One shared query model between header search, search page, and marketplace filtering.
    - Preserve current FTS/API calls and query parameters.
    - Results distinguish products, creators, and categories without a generic card wall.
    - Acceptance: keyboard submission, clear, empty, typo/no-result, and back-navigation states work.

- [ ] **13.8.6 Validate international buyer states**
    - Test KES/M-Pesa-capable visitor, USD/card visitor, and unsupported/no-product currency state using current geo/currency behavior.
    - Copy should say `methods shown at checkout`, not universal availability.
    - Acceptance: no visitor sees a payment or availability promise the current checkout cannot fulfil.

---

## 13.9 Creator directory and all storefront layouts — P1

- [ ] **13.9.1 Reduce directory hero dominance**
    - Keep Kenya-forward creator identity while making the page legible to worldwide buyers.
    - Show creator inventory sooner and avoid a headline that consumes the entire mobile viewport.
    - Acceptance: first creator/spotlight appears within a purposeful first scroll in sparse and rich data states.

- [ ] **13.9.2 Replace clipped craft pills on mobile**
    - Use a compact selector/filter sheet or a clearly signposted horizontal control.
    - Preserve `nuqs` URL state and back/forward behavior.
    - Acceptance: every category is reachable at 320 px with no accidental page overflow.

- [ ] **13.9.3 Strengthen creator discovery cards and spotlight**
    - Lead with real work, then identity, craft, concise bio, and real product/stat evidence.
    - Spotlight appears only when backed by the configured real creator.
    - Acceptance: zero, one, two, and many creator states remain balanced without fake fillers.

- [ ] **13.9.4 Define one shared storefront identity layer**
    - Across Editorial, Gallery, Catalog, Portfolio, and Studio, consistently expose cover/hero, avatar, shop name, handle, useful bio, category, real stats, tip action, and primary shop navigation.
    - Do not erase layout personality or theme-token behavior.
    - Acceptance: buyers can identify who sells the work and what the shop offers before oversized product media dominates the mobile page.

- [ ] **13.9.5 Preserve and test storefront theming**
    - Verify every palette, typography, motion, layout, module order, preview token, save/reset, and public rendering path.
    - Global Blyss chrome must not override creator-owned theme variables inside the storefront boundary.
    - Acceptance: all five layouts render at all target widths using default and non-default themes; preview and persisted public output match.

- [ ] **13.9.6 Refine storefront product and subscription browsing**
    - Consistent product-card behavior, clear tabs/anchors, counts, active states, and empty sections.
    - Preserve tips, subscriptions, reviews, stats, wishlist, and share behavior.
    - Acceptance: all current storefront actions and analytics fire as before.

- [ ] **13.9.7 Preserve creator SEO**
    - Keep metadata, canonical URLs, Person/Organization structured data as technically appropriate, product lists, and dynamic sitemap inclusion.
    - Acceptance: visible `shop` language does not corrupt schema.org `Organization` usage.

---

## 13.10 Product detail, cart, checkout, donation, and confirmation — P1

- [ ] **13.10.1 Reorder product decision information**
    - Gallery → shop identity → title/price/cadence → buy action → delivery/payment reassurance → description/included/licence → creator → reviews → related.
    - Preserve geo currency, active-subscription protection, cart/checkout routing, wishlist, share, tips, reviews, related, and recently viewed.
    - Acceptance: one-time, recurring, free, archived, unavailable-currency, and already-subscribed states behave unchanged.

- [ ] **13.10.2 Replace hidden primary details with readable sections**
    - Reassess horizontal tabs for Description, Included, Benefits, and Reviews.
    - Prefer stacked sections on desktop and accessible disclosures on mobile while reusing the same data and review API.
    - Acceptance: deep links/focus are possible, disabled/empty sections are omitted cleanly, and no content becomes unreachable without JavaScript.

- [ ] **13.10.3 Refine media galleries and mobile buy bar**
    - Keep image priority/lazy loading, thumbnails, swipe behavior, and empty fallback.
    - Ensure active mobile pagination reflects actual scroll position.
    - Coordinate sticky buy bar with mobile marketplace navigation and safe areas.
    - Acceptance: no image-layout shift, hidden CTA, overlap, or unlabelled gallery control.

- [ ] **13.10.4 Refine cart drawer and cart page**
    - Preserve shop grouping, quantities where supported, discounts, recurring restrictions, persistence, totals, and checkout creation.
    - Use `shop` in visible grouping copy without renaming cart data fields.
    - Acceptance: anonymous/authenticated persistence and mixed-state protections pass existing tests.

- [ ] **13.10.5 Restyle hosted checkout without touching payment orchestration**
    - Stable order summary, creator/shop identity, total, discount, recurrence, email/address fields, payment method, and delivery outcome.
    - Show M-Pesa/card only from actual checkout availability.
    - Preserve Paystack handoff, polling, wallet/Stripe dormant compatibility where still required by upstream types, confirmation, fulfilment listener, CSP, and embed themes.
    - Acceptance: the before/after request sequence and payloads are identical for each supported checkout case.

- [ ] **13.10.6 Refine payment, pending, failure, and completion states**
    - M-Pesa instructions describe STK Push and never request a PIN.
    - Pending state remains calm and explicit; retry/failure does not create duplicate charges.
    - Confirmation leads with access/download/subscription outcome, then receipt/portal actions.
    - Acceptance: refresh, delayed webhook, failed charge, duplicate submit, and completed fulfilment smoke tests pass.

- [ ] **13.10.7 Align donation/tip surfaces**
    - Preserve amount, currency, creator, message, checkout, and success behavior.
    - Use the same shop identity and payment reassurance as product purchase.
    - Acceptance: tips from storefront and product detail arrive at the same existing route and complete unchanged.

---

## 13.11 Buyer portal, help, legal, and global states — P2

- [ ] **13.11.1 Normalize customer portal presentation**
    - Preserve portal authentication, organization-scoped routes, orders, subscriptions, downloads, wishlist, wallet/settings, cancellation, and payment-method behavior.
    - Visible copy refers to the seller as a shop/creator, not an organization.
    - Acceptance: every current portal deep link and customer-session token path still works.

- [ ] **13.11.2 Prioritize purchased value in portal views**
    - Lead with download, access, benefit, or subscription status before account administration.
    - Keep billing and legal details available but secondary.
    - Acceptance: buyer reaches a purchased file or active benefit with no additional business-logic step.

- [ ] **13.11.3 Redesign help and static-page shells**
    - Help routes clearly separate buyer and creator questions.
    - Keep legal content, metadata, and counsel markers intact; do not rewrite policy in a visual-redesign task.
    - Acceptance: headings, table of contents, anchors, and contact paths work at all widths.

- [ ] **13.11.4 Redesign loading, empty, 404, and error states**
    - Every state names what happened and offers one useful next action.
    - Core error content is server-visible; no cartoon, fake reassurance, or technical stack leak.
    - Acceptance: route-group errors do not expose sensitive details and can recover where Next.js provides reset.

- [ ] **13.11.5 Check cookie/consent and fixed overlays**
    - Consent, mobile navigation, chat/support (if any), sticky buy actions, and sheets must not collide.
    - Acceptance: all required consent actions remain reachable at 320 px and no analytics recording occurs on auth/checkout/portal inputs.

---

## 13.12 Dashboard — deliberately narrow scope — P0/P2

**Allowed primary files:** `DashboardOverview/OverviewSection.tsx`, the segmented-control primitive, visible shop switcher/sidebar/settings/onboarding copy, and directly affected tests. Touch other dashboard files only to fix a demonstrated terminology or overflow issue.

- [ ] **13.12.1 Fix the confirmed Customize overflow**
    - Desktop: retain current Overview title, segmented range control, and Customize action.
    - Tablet: permit clean wrapping without setting a minimum page width.
    - Mobile: replace the four-wide segmented control with a compact existing select/menu pattern; expose Customize as a compact labelled/icon or overflow action.
    - Add `min-w-0`, responsive widths, and wrapping at the component level—not horizontal page scrolling.
    - Acceptance: no dashboard page overflow at 320, 375, 414, 768, or 1440 px; every range and Customize modal remains keyboard accessible and functionally unchanged.

- [ ] **13.12.2 Replace visible organization language with shop language**
    - Sidebar switcher: `New Organization` → `Add another shop`.
    - Settings: `Organization Settings` → `Shop settings`.
    - Profile/name/team/owner/create/delete/status/toast/error copy changes per §13 vocabulary.
    - KYC/legal copy uses `business details` where appropriate.
    - Acceptance: no blind replacement of code, routes, API fields, analytics events, schemas, permissions, or structured data.

- [ ] **13.12.3 Make only small touched-file polish corrections**
    - Correct wrapping, spacing, contrast, focus, and off-token styling encountered in files touched by 13.12.1–13.12.2.
    - The storefront editor action row may wrap or move Reset/View public into overflow if it demonstrably overflows, but the editor is not redesigned.
    - Acceptance: each polish change is listed in the PR description and no unrelated dashboard component is changed.

- [ ] **13.12.4 Explicit dashboard non-goals gate**
    - No sidebar information-architecture redesign.
    - No dashboard homepage re-layout beyond the Overview action row.
    - No new `DashboardPageHeader` migration across all pages in this phase.
    - No analytics, widget, finance, product, orders, customers, payouts, table, or settings workflow redesign.
    - No new dashboard feature.
    - Acceptance: diff audit confirms dashboard changes remain within the approved boundary.

---

## 13.13 Contextual organization → shop language migration — P1

- [ ] **13.13.1 Build a user-facing terminology inventory**
    - Search JSX/TSX, translations, email/notification copy rendered by the web client, metadata, toast messages, dialogs, empty states, and form validation.
    - Classify each occurrence: `shop`, `storefront`, `business details`, genuine `organization`, or internal-only.
    - Acceptance: inventory is reviewed before edits and generated OpenAPI files are excluded.

- [ ] **13.13.2 Apply the approved copy map**
    - Required examples:
        - `Create organization` → `Create your shop`.
        - `Create a new organization` / `New Organization` → `Add another shop`.
        - `Organization name` → `Shop name`.
        - `Organization slug` → `Shop address` or `Shop handle`.
        - `Organization settings` → `Shop settings`.
        - `Organization profile` → `Shop profile`.
        - `Organization members` → `Shop team`.
        - `Organization owner` → `Shop owner`.
        - `Delete Organization` → `Delete shop` because current semantics delete/anonymize rather than merely pause.
    - Acceptance: copy remains grammatically correct in singular/plural and title/sentence case.

- [ ] **13.13.3 Preserve technical and semantic organization terms**
    - Keep route parameters, type names, function names, database fields, API paths, query keys, cache tags, analytics events, permissions, OAuth protocol identifiers, and schema.org `Organization`.
    - Acceptance: generated client diff is empty and backend tests require no change.

- [ ] **13.13.4 Add terminology regression checks**
    - Add focused tests or a lint/property check for prohibited user-facing phrases in known shop surfaces.
    - Maintain an allowlist for genuine organization contexts.
    - Acceptance: check catches reintroduction without flagging internal implementation names.

---

## 13.14 Accessibility, performance, SEO, and release validation — final gate

- [ ] **13.14.1 Responsive matrix**
    - Test every redesigned surface at 320, 375, 414, 768, and 1440 px.
    - Test short and long product/shop names, long prices, empty bios, many filters, validation errors, and enlarged 200% text.
    - Acceptance: no page-level horizontal scroll, clipped action, hidden form error, or fixed-overlay collision.

- [ ] **13.14.2 Accessibility pass**
    - Keyboard-only journeys: browse → PDP → cart/checkout; login; create shop; onboarding; Customize modal; storefront navigation.
    - Verify landmarks, heading order, names/descriptions, focus restoration, contrast, reduced motion, and live status announcements.
    - Acceptance: Lighthouse Accessibility ≥95 and no serious/critical automated accessibility issue.

- [ ] **13.14.3 Performance pass**
    - Home and discovery LCP image priority is deliberate; below-fold imagery lazy-loads; fonts do not cause layout shift.
    - Avoid page-root client conversion; keep interactive islands bounded.
    - Acceptance: public mobile Lighthouse Performance ≥90, CLS <0.05, and existing bundle budgets are not exceeded.

- [ ] **13.14.4 SEO regression pass**
    - Verify unique titles/descriptions, canonical URLs, locale handling, WebSite/Product/Person-or-Organization/Breadcrumb/FAQ structured data, robots, sitemap, and social images.
    - Buyer-global copy must not erase Kenya-focused long-tail seller SEO on `/start`.
    - Acceptance: structured data validates and key indexed URLs are unchanged.

- [ ] **13.14.5 Functional test pass**

    Run the most targeted available checks after each workstream and the full affected suite before release:

    ```bash
    cd clients/web
    npx tsc --noEmit
    npx vitest run
    pnpm build
    ```

    Plus manual/test-mode smoke journeys for:
    - Anonymous and authenticated cart.
    - One-time, free, recurring, and already-subscribed products.
    - KES/M-Pesa and available card checkout.
    - Failed/pending/completed payment.
    - Magic link and OAuth return URLs.
    - First shop and additional shop creation.
    - Onboarding resume and readiness.
    - All five storefront layouts and theme preview/save.
    - Tips/donations.
    - Customer portal access and downloads.
    - Dashboard range selection and Customize modal.

    Acceptance: no request-contract, redirect, analytics, SEO, or persistence regression.

- [ ] **13.14.6 Anti-slop and local-taste review**
    - Run §3.5 and §15 against every redesigned surface.
    - Confirm `M-Pesa`, `KSh 1,500`, Kenyan phone/address formats, and restrained local references.
    - Confirm no gradients, shadow-card grids, generic feature trios, fake proof, badge spam, oversized empty heroes, repeated eyebrows, purple/blue SaaS defaults, or tourist clichés.
    - Acceptance: a reviewer can point to the real product/creator content carrying the design rather than decoration.

- [ ] **13.14.7 Product-owner visual review**
    - Present desktop/mobile pairs in this order: homepage, `/start`, login, shop creation/onboarding, marketplace, creators, storefront layouts, PDP, cart/checkout, portal, narrow dashboard fixes.
    - Include before/after and list preserved functionality.
    - Acceptance: explicit approval before merge/deploy; no commit or push unless requested.

---

## Phase 13 completion gate

- [ ] Brand direction approved before visual implementation.
- [ ] Root homepage is buyer-first and useful to worldwide visitors without universal-payment claims.
- [ ] `/start`, seller sign-up, and onboarding are Kenya-first and operationally accurate.
- [ ] East African expansion copy is restrained and capability-checked.
- [ ] Core content never depends on Motion hydration to become visible.
- [ ] Light is the deterministic default regardless of OS preference.
- [ ] Public navigation, marketplace, categories, search, creators, all five storefronts, PDP, cart, checkout, auth, onboarding, portal, and global states are visually coherent.
- [ ] Existing routes, APIs, checkout, cart, auth, onboarding, themes, analytics, and SEO are preserved.
- [ ] Dashboard diff is limited to shop terminology, Customize responsiveness, and documented touched-file polish.
- [ ] No page-level horizontal overflow at 320/375/414/768/1440.
- [ ] All user-facing creator-entity copy follows the shop/storefront/business-details vocabulary.
- [ ] No generated API or backend/domain organization names are renamed.
- [ ] Accessibility, performance, SEO, functionality, anti-slop, and local-taste gates pass.
- [ ] Product owner approves the visual result before merge or deployment.

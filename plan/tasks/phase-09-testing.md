# Phase 9 — Testing

> Plan refs: [§13 testing](../14-testing.md). Goal: 6 must-pass E2E flows green; visual regression baseline; Lighthouse + axe gates wired.

Can run in parallel with phases 5 + 6 once any page is stable.

## 9.1 Backend tests (§13.1)

- [ ] **9.1.1 Run `uv run task test`** — full backend suite
- [ ] **9.1.2 Mark route-mounted tests for disabled modules with `@pytest.mark.skip`** — never delete the test
- [ ] **9.1.3 Verify `tests/platform_rebrand/` all pass**
- [ ] **9.1.4 Verify coverage ≥ 70% line on touched modules**
- [ ] **9.1.5 Add backend tests for new endpoints** — `creator_onboarding` (phase 7.4), `fundraising_goals` (phase 7.2), `dashboard/creator/earnings-summary` (phase 6.2.2)

## 9.2 Frontend Vitest (§13.2)

- [ ] **9.2.1 Run `pnpm test`** — Vitest passes
- [ ] **9.2.2 Verify `__tests__/brand-text-replacement.property.test.tsx` passes**
- [ ] **9.2.3 Verify `__tests__/image-reference-validity.property.test.tsx` passes**
- [ ] **9.2.4 Verify `__tests__/navigation-link-validity.property.test.tsx` passes**
- [ ] **9.2.5 Verify cart store property tests pass**
- [ ] **9.2.6 Verify currency conversion property tests pass**
- [ ] **9.2.7 Add markdown sanitization test** — feed `<script>`, `<iframe>`, `javascript:` URLs to `LegalDoc` / benefit renderer; assert all stripped
- [ ] **9.2.8 Add design-token usage property test** — assert no rendered component uses `text-blue-*`, `bg-green-*`, `text-purple-*`, `bg-gradient-*` Tailwind utilities

## 9.3 Playwright E2E — 6 must-pass flows (§13.3)

- [ ] **9.3.1 Configure Playwright** — 3 browsers (Chromium, WebKit, Firefox) × 2 viewports (375, 1440), against `localhost:3000` with seeded data
- [ ] **9.3.2 Mock Paystack API responses** — verify Polar fixtures exist; supplement if needed
- [ ] **9.3.3 Flow 1: anonymous buyer** — home → product → buy now → email + phone + M-Pesa → confirm → download
- [ ] **9.3.4 Flow 2: subscription** — creator storefront → tier → checkout with card → confirmation with rendered markdown perks
- [ ] **9.3.5 Flow 3: cart** — add 3 different one-time products → drawer → adjust qty → full cart → checkout → all items in portal
- [ ] **9.3.6 Flow 4: creator onboarding** — sign up → magic link → /start → 5 steps → publish first product → verify on storefront + product URL
- [ ] **9.3.7 Flow 5: subscription cancel** — subscribed customer → portal → subscription detail → Cancel → confirm → status updated, perks hidden after period end
- [ ] **9.3.8 Flow 6: search** — home → command palette type query → autocomplete → "See all" → results page

## 9.4 Visual regression (§13.4)

- [ ] **9.4.1 Capture baseline snapshot for marketplace home**
- [ ] **9.4.2 Capture baseline for product detail (stable seed product)**
- [ ] **9.4.3 Capture baseline for creator storefront (stable seed creator)**
- [ ] **9.4.4 Capture baseline for cart drawer (with 3 items)**
- [ ] **9.4.5 Capture baseline for checkout flow**
- [ ] **9.4.6 Capture baseline for customer portal home**
- [ ] **9.4.7 Capture baseline for dashboard overview**
- [ ] **9.4.8 Capture baseline for 404 page**
- [ ] **9.4.9 Set CI rule: max 1% pixel diff** — re-baseline only on intentional design changes

## 9.5 Lighthouse CI (§13.5)

- [ ] **9.5.1 Add `.github/workflows/lighthouse.yml`** per §9.9 / §13.5
- [ ] **9.5.2 Verify it runs on every PR touching `clients/web/`**
- [ ] **9.5.3 Confirm thresholds** — performance 0.90, a11y 0.95, seo 0.95, best-practices 0.95
- [ ] **9.5.4 Verify gate blocks PR merge on regression**

## 9.6 Accessibility (§13.6)

- [ ] **9.6.1 Add `@axe-core/playwright` to dev deps** (already in phase 4 task lookup)
- [ ] **9.6.2 Wrap each E2E test with axe analysis** — assert zero violations
- [ ] **9.6.3 Confirm zero violations on home, browse, product, creator, cart, checkout, portal**
- [ ] **9.6.4 Allow minor violations on dashboard but no critical/serious**

## 9.7 Manual QA matrix (§13.7) — pre-launch only

- [ ] **9.7.1 iPhone 12 mini iOS 16+ Safari + Chrome**
- [ ] **9.7.2 iPhone 14 iOS 17 Safari**
- [ ] **9.7.3 iPad Air iPadOS Safari**
- [ ] **9.7.4 Pixel 6 Android 13+ Chrome**
- [ ] **9.7.5 Tecno Camon (low-end Android, 360×800) Android 11+ Chrome** — typical Kenyan mobile
- [ ] **9.7.6 Desktop 1440 macOS Safari + Chrome + Firefox**
- [ ] **9.7.7 Desktop 1920 Windows 11 Edge + Chrome**
- [ ] **9.7.8 M-Pesa flow with real Kenyan SIM in Paystack test mode** — STK push arrives, prompt succeeds, order completes

## 9.8 Load test (§13.8) — pre-launch only

- [ ] **9.8.1 Write `load/marketplace.js`** with k6 — 200 VUs, 5 minutes sustained
- [ ] **9.8.2 Run against staging cluster** — p95 < 500ms, error rate < 1%
- [ ] **9.8.3 Document baseline numbers** — for comparison post-launch

## 9.9 Smoke tests in CI (§13.9)

- [ ] **9.9.1 Add smoke test step to `.github/workflows/deploy.yml`**
- [ ] **9.9.2 Smoke includes: api healthz, home page, stable product page, sitemap, Cloudflare cache header**
- [ ] **9.9.3 Failure triggers Slack alert** (or whatever notification channel is set up)

## Acceptance for phase 9

- [ ] Backend pytest passes including `platform_rebrand/`
- [ ] Frontend Vitest passes including all property tests
- [ ] All 6 E2E flows pass on Chromium + WebKit + Firefox at mobile + desktop
- [ ] Visual regression baseline committed
- [ ] Lighthouse CI gate active
- [ ] axe-core integrated; zero violations on public pages
- [ ] Manual QA matrix verified by a human before each prod deploy
- [ ] Load test run + reviewed before launch
- [ ] Smoke test passes after every CI deploy

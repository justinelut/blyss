# §13 Testing strategy

> See also: [10-performance.md](./10-performance.md) (Lighthouse CI), [11-local-dev.md](./11-local-dev.md) (test commands)

Polar already has substantial test infrastructure (~64 test directories under `server/tests/`, plus Vitest + Playwright in `clients/web`). We don't replace it. We add three thin layers on top: marketplace E2E flows, visual regression, brand-text and accessibility property tests.

## §13.1 Backend tests (Polar's existing pytest suite)

Run as-is, with audits:

```bash
cd server
uv run task test                  # full suite
uv run task lint                  # ruff
uv run task lint_types            # pyright
```

After §4 cleanup, expect some test failures from references to removed modules. Strategy:

- Tests under `server/tests/{license_key,meter,event,event_type,external_event,oauth2,personal_access_token,organization_access_token,billing_entry,customer_seat,pledge}/` — keep them passing if the underlying module is still in place (we disabled routes, didn't delete code). If a test specifically asserts the route is mounted, mark it `pytest.mark.skip(reason="route disabled per §4.4")` rather than delete.
- Tests under `server/tests/integrations/{github,stripe,loops}/` — keep, but mark integration tests against external services as `@pytest.mark.skip` if we're not exercising those paths.
- Tests under `server/tests/platform_rebrand/` — these MUST pass. They enforce the brand-name discipline from §4.11.
- Tests under `server/tests/rebrand/` (if present) — same.

Coverage target: maintain Polar's existing coverage. Don't drop below 70% line coverage on modules we touch.

## §13.2 Frontend unit tests (Vitest)

Polar ships a Vitest config with property tests at:

- `clients/web/src/__tests__/brand-text-replacement.property.test.tsx` — enforces no "Polar" literals
- `clients/web/src/__tests__/image-reference-validity.property.test.tsx` — image src checks
- `clients/web/src/__tests__/navigation-link-validity.property.test.tsx` — navigation links resolve

Run as part of CI:

```bash
cd clients/web
pnpm test               # Vitest run
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint + prettier
```

Add new tests for:

- Cart store property tests (already exist at `stores/__tests__/cartStore.properties.test.ts`)
- Currency conversion property tests (already at `lib/currency/index.property.test.ts`)
- Markdown sanitization (new — assert that benefit markdown rejects `<script>`, `<iframe>`, JS-on-attributes)

## §13.3 E2E tests (Playwright)

Critical user flows. Run on a local dev stack (full Docker compose + API + worker + web).

**The 6 must-pass flows:**

1. **Anonymous buyer flow:**
   - Land on home → click featured product → click Buy now → enter email + phone → choose M-Pesa → see Paystack mock confirm → land on confirmation with download link
   - Click download → file streams from MinIO

2. **Subscription flow:**
   - Land on creator storefront → click subscription tier → check out with card → see post-purchase markdown perks rendered → magic-link email triggered

3. **Cart flow:**
   - Add 3 different one-time products to cart → open cart drawer → adjust qty → go to full cart → click Checkout → complete payment → all items appear in customer portal

4. **Creator onboarding flow:**
   - Sign up via magic link → land on `/start` → complete steps 1–5 → publish first product → verify product appears at `/creators/{handle}` and `/product/{id}`

5. **Subscription cancel flow:**
   - Subscribed customer signs into portal → views subscription detail → clicks Cancel → confirms in modal → subscription marked cancelled, perk content hidden after period end

6. **Search flow:**
   - From home, type query in command palette → see autocomplete suggestions → click "See all" → land on `/search?q=...` → results match query

**Playwright config at `clients/web/playwright.config.ts`:**

- 3 browsers: Chromium, WebKit, Firefox
- 2 viewports: mobile (375×667), desktop (1440×900)
- Run against `http://localhost:3000` with seeded data
- Mock Paystack API responses (Polar likely already has fixtures for this)

**Run command:**

```bash
cd clients/web
pnpm test:e2e
```

In CI, run nightly + on every PR touching marketplace pages.

## §13.4 Visual regression

Playwright snapshot diffing on the 8 most-trafficked surfaces:

```typescript
// e2e/visual.spec.ts
test('marketplace home matches snapshot', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('home.png', { maxDiffPixelRatio: 0.01 })
})

test('product detail matches snapshot', ...)
test('creator storefront matches snapshot', ...)
test('cart drawer matches snapshot', ...)
test('checkout matches snapshot', ...)
test('customer portal home matches snapshot', ...)
test('dashboard overview matches snapshot', ...)
test('404 matches snapshot', ...)
```

Snapshots committed at `clients/web/e2e/__snapshots__/`. CI fails if pixel diff > 1%. Designer or developer reviews diffs in PR before re-baselining.

## §13.5 Lighthouse CI

Per §9.9. Runs on every PR touching `clients/web/`, fails if any of 4 budget thresholds breaks.

```yaml
# .github/workflows/lighthouse.yml
- name: Build + start
  run: cd clients/web && pnpm build && pnpm start &
- name: Wait
  run: npx wait-on http://localhost:3000 -t 60000
- name: LHCI
  run: |
    npx lhci autorun \
      --collect.url=http://localhost:3000 \
      --collect.url=http://localhost:3000/browse \
      --collect.url=http://localhost:3000/creators \
      --collect.url=http://localhost:3000/product/seed-product-1 \
      --collect.url=http://localhost:3000/creators/seed-creator-1 \
      --assert.assertions.categories:performance.minScore=0.90 \
      --assert.assertions.categories:accessibility.minScore=0.95 \
      --assert.assertions.categories:seo.minScore=0.95 \
      --assert.assertions.categories:best-practices.minScore=0.95
```

## §13.6 Accessibility tests

axe-core runs as part of every Playwright E2E test:

```typescript
import AxeBuilder from '@axe-core/playwright'

test('home is accessible', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
```

Zero accessibility violations on home, browse, product, creator, cart, checkout, portal pages. Dashboard allowed minor violations (color-contrast on metric chips) but no critical or serious violations.

## §13.7 Manual QA matrix (pre-launch)

Before declaring ship-ready, a human (not the AI agent) tests:

| Device | OS | Browser |
|---|---|---|
| iPhone 12 mini (375×812) | iOS 16+ | Safari, Chrome |
| iPhone 14 (390×844) | iOS 17 | Safari |
| iPad Air (820×1180) | iPadOS | Safari |
| Pixel 6 (412×915) | Android 13+ | Chrome |
| Tecno Camon (low-end Android, 360×800) | Android 11+ | Chrome | (typical Kenyan mobile)
| Desktop 1440 | macOS | Safari, Chrome, Firefox |
| Desktop 1920 | Windows 11 | Edge, Chrome |

Specifically test the M-Pesa flow on a real Kenyan SIM with real Paystack test mode. STK push must arrive on the phone, the prompt must succeed, the order must complete.

## §13.8 Load test (pre-launch)

`k6` script simulating realistic traffic on the live K3s cluster (test mode):

```javascript
// load/marketplace.js
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 200 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  http.get('https://blyss.co.ke/')
  http.get('https://blyss.co.ke/browse')
  http.get('https://blyss.co.ke/product/seed-1')
}
```

200 concurrent users sustained for 5 minutes. p95 < 500 ms (mostly Cloudflare cache hits). Error rate < 1%.

## §13.9 Smoke tests in CI deploy

After every deploy (per §12.5):

```bash
# Health
curl -sf https://api.blyss.co.ke/healthz | grep -q '"ok"'

# Home page renders
curl -sf https://blyss.co.ke -o /dev/null

# Product page renders (uses a known stable seed product ID)
curl -sf https://blyss.co.ke/product/$STABLE_TEST_PRODUCT_ID -o /dev/null

# Sitemap valid
curl -sf https://blyss.co.ke/sitemap.xml | grep -q '<urlset'

# Cloudflare cache responding
curl -sI https://blyss.co.ke/ | grep -i 'cf-cache-status'
```

Failed smoke = automatic Slack alert + investigation.

## §13.10 Test coverage acceptance

| Category | Target | Enforced where |
|---|---|---|
| Backend pytest | ≥ 70% line, all `platform_rebrand/` tests pass | `uv run task test` |
| Frontend Vitest | All property tests pass | `pnpm test` |
| Playwright E2E | All 6 must-pass flows green on all browsers + viewports | `pnpm test:e2e` |
| Visual regression | < 1% pixel diff on 8 surfaces | Playwright snapshot |
| Lighthouse | All public pages ≥ 90 perf, ≥ 95 a11y/seo/bp | LHCI |
| Accessibility | Zero violations on public pages, no critical/serious on dashboard | axe-core |
| Load test | p95 < 500 ms at 200 concurrent VUs, error rate < 1% | k6 |
| Manual device matrix | All 7 device/browser combos verified | human checklist |

## §13.11 Acceptance for §13

Testing is acceptable when:

- [ ] Backend pytest passes locally (`uv run task test`) — including all platform_rebrand tests
- [ ] Frontend Vitest passes (`pnpm test`)
- [ ] All 6 E2E flows pass on Chromium + WebKit + Firefox at mobile + desktop viewports
- [ ] Visual regression baseline established and committed
- [ ] Lighthouse CI gate wired and blocks PRs below thresholds
- [ ] axe-core integrated in Playwright runs
- [ ] Manual QA matrix verified before each prod deploy by a human
- [ ] Load test run + reviewed before launch
- [ ] Deploy smoke test passes after every CI deploy

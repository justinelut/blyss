# Phase 12 — Storefront themes

> Plan refs: [§19 storefront themes spec](../19-storefront-themes.md). Goal: ship the three-layer creator theming system (tokens → layouts → niche modules) without breaking the marketplace contract from §3.

The phase splits into five sub-phases (12.1 → 12.5) that ship in order. Sub-phase 12.1 ships v1 (tokens only); 12.2 lays the layout foundation; 12.3 ships v2 (gallery + catalog); 12.4 ships v3 (modules); 12.5 ships v4 (remaining layouts + modules).

Read [§19 storefront themes](../19-storefront-themes.md) end-to-end before starting any task. Read [§3 UI direction](../04-ui-direction.md) and [§15 do-not-do](../16-do-not-do.md) §15.4 before touching any visual work.

## 12.1 Tokens — v1 ship (1 week)

Goal: a creator can change accent, headline font, display style, motion intensity. Storefront updates within the cache TTL. Layout / modules untouched.

### 12.1.1 Token shapes + validation

- [ ] **12.1.1.1 Define token enums in shared types**
  - New file `clients/web/src/types/storefront-theme.ts`. Export `StorefrontTokens`, `StorefrontLayoutSlug`, `ModuleKind` types per §19.3.1 + §19.4.1 + §19.5.1.
  - Acceptance: types compile; importable from server-shared paths.

- [ ] **12.1.1.2 Build the curated palette catalogue**
  - New file `clients/web/src/design/storefront-palette.ts`. Export the 8 accents per §19.3.2 with each entry exposing `accent`, `accent_hover`, `accent_foreground` (always `#FAFAF7`), `secondary_default`. Each value is a frozen object literal.
  - Each accent passes WCAG AA on `--background #FAFAF7` and `--text-primary #1A1A17`. Add a unit test that asserts the contrast ratio per pair.
  - Acceptance: `import { STOREFRONT_PALETTE } from '@/design/storefront-palette'` returns 8 entries; contrast test passes for every entry.

- [ ] **12.1.1.3 Add Pydantic schemas server-side**
  - New file `server/polar/organization/theme_schemas.py` with `StorefrontTokens` Pydantic model mirroring §19.3.1. Use `Literal[...]` for every enum.
  - Add `validate_storefront_tokens(value: dict) -> StorefrontTokens` that rejects unknown keys (`Config.extra = 'forbid'`).
  - Acceptance: invalid token JSON returns 422 with field path; valid token JSON round-trips.

- [ ] **12.1.1.4 Add Zod schemas frontend-side**
  - New file `clients/web/src/types/storefront-theme.zod.ts` with the same shape via Zod. Used for the dashboard form validation.
  - Acceptance: same invalid JSON rejected by both Zod and Pydantic with matching field paths.

### 12.1.2 Database

- [ ] **12.1.2.1 Migration: add three theme columns + `theme_version_hash`**
  - `uv run alembic revision -m "add_storefront_theme_columns"`. Add `theme_layout` TEXT (default `'editorial'`, CHECK in `{editorial, gallery, catalog, portfolio, studio}`), `theme_tokens` JSONB (default the v1 baseline JSON in §19.10.1), `theme_modules` JSONB (default `'[]'`), `theme_version_hash` TEXT NULLABLE.
  - Backfill `theme_version_hash` for existing rows in the migration.
  - Acceptance: migration applies and reverses cleanly. Every existing org has the v1 baseline tokens + editorial layout + empty modules.

- [ ] **12.1.2.2 Add `theme_version_hash` recompute hook**
  - In `server/polar/models/organization.py`, add a SQLAlchemy `before_update` event that recomputes `theme_version_hash` whenever `theme_layout`, `theme_tokens`, or `theme_modules` changes. SHA-256 over the canonicalised JSON of those three fields.
  - Acceptance: a unit test that updates `theme_tokens.accent` and asserts `theme_version_hash` changes.

- [ ] **12.1.2.3 Expose theme on `OrganizationStorefrontSchema`**
  - Add `theme_layout`, `theme_tokens`, `theme_modules` fields to the schema returned by `/v1/organizations/creators/{slug}` and the SSR storefront fetch.
  - Acceptance: `/v1/organizations/creators/blyss-studio` returns the theme fields.

### 12.1.3 Backend endpoints

- [ ] **12.1.3.1 Build `PATCH /v1/organizations/{id}/storefront/tokens`**
  - Body: `StorefrontTokensUpdate`. Auth: `Authenticator(scopes={web_write}, allowed_subjects={User})` plus org-membership check.
  - Validates against the Pydantic schema + the curated palette + curated font registries.
  - Persists to the row, recomputes `theme_version_hash`, returns the updated organization.
  - Acceptance: ✅ valid update returns 200 + updated tokens. ❌ unknown key returns 422. ❌ unauthenticated returns 401. ❌ non-member returns 403.

- [ ] **12.1.3.2 Build draft preview cache (Redis)**
  - New module `server/polar/organization/theme_preview.py`. Exposes `save_draft(org_id, user_id, theme) -> token`, `get_draft(token) -> theme`, `delete_draft(token)`.
  - Token is `signed_id(org_id, user_id, draft_id)` using `polar.kit.crypto.sign_value`. TTL 30min. Redis key shape `storefront-theme-draft:{org_id}:{user_id}` per §19.6.3.
  - Acceptance: write a draft, sign a token, retrieve the draft via the token; tampered tokens reject; expired tokens return None.

- [ ] **12.1.3.3 Build `POST /v1/organizations/{id}/storefront/tokens/preview`**
  - Body: `StorefrontTokens`. Validates, saves to Redis, returns `{preview_token: string}`.
  - Acceptance: returns a token; the token resolves to the saved draft via 12.1.3.2 helpers.

- [ ] **12.1.3.4 Add `preview_theme` query support to `/v1/organizations/creators/{slug}`**
  - When `?preview_theme=<token>` is present, validate the token, fetch the draft from Redis, splice it onto the response in place of the org row's stored theme.
  - Reject unsigned / expired tokens with 401 (don't fall back silently — the dashboard expects a hard error if its draft is gone).
  - Acceptance: GET with valid `preview_theme` returns the draft theme; GET without it returns the row's theme.

### 12.1.4 Frontend ThemeProvider

- [ ] **12.1.4.1 Build `<ThemeProvider>` component**
  - New file `clients/web/src/components/Storefront/ThemeProvider.tsx`. Accepts `tokens: StorefrontTokens`. Renders a `<div data-storefront-theme style={{...cssVars}}>` wrapper.
  - Resolves token enums to concrete CSS variable values per §19.3.5 (accent / accent_hover / accent_foreground / font_display).
  - Acceptance: wrap a child component in `<ThemeProvider>`, verify `getComputedStyle(div).getPropertyValue('--accent')` returns the resolved hex.

- [ ] **12.1.4.2 Wire the provider into `/creators/[slug]`**
  - Update `clients/web/src/app/(main)/creators/[slug]/page.tsx` (or the equivalent CreatorStorefrontPage component) to wrap the storefront body in `<ThemeProvider tokens={creator.theme_tokens}>`.
  - Marketplace chrome (header, footer, cart, search) stays OUTSIDE the provider — chrome reads global tokens, never the creator's.
  - Acceptance: visit a creator with a custom accent; the storefront body uses it; the header is still Blyss orange.

- [ ] **12.1.4.3 Add the four headline fonts to the Next font config**
  - `clients/web/src/fonts/fonts.ts`: add `cormorant-garamond`, `space-grotesk`, `inter-tight` alongside the existing Inter Display. Self-host all three.
  - Each loads with `display: swap`, subset `latin + latin-ext`, weights 500 + 600.
  - Acceptance: bundle size for the storefront page increases by < 80 KB total across the 3 added fonts (subset).

- [ ] **12.1.4.4 Build the `display_style` token translator**
  - In `ThemeProvider`, when `display_style === 'editorial' | 'minimal' | 'bold'`, set extra CSS vars (`--storefront-headline-leading`, `--storefront-headline-tracking`, `--storefront-eyebrow-weight`).
  - Update existing storefront components to consume those vars where they hardcode line-height / tracking today.
  - Acceptance: switching `display_style` visibly changes line-height + tracking on the hero headline.

- [ ] **12.1.4.5 Build the motion-intensity translator**
  - The existing motion config (in `clients/web/src/components/Marketplace/...` or wherever motion is set up) reads from `--storefront-motion-multiplier`. `ThemeProvider` sets it to 0.5 / 1 / 1.2 based on the token.
  - `prefers-reduced-motion: reduce` always overrides to 0 regardless of token.
  - Acceptance: switching motion token changes a hero scale-in duration; OS reduced-motion forces no animation.

### 12.1.5 Dashboard — Brand tab

- [ ] **12.1.5.0 Restructure the dashboard "Storefront" nav from redirect → in-dashboard editor**
  - Today: `DashboardSidebar.tsx` line ~163 and `DashboardLayout.tsx` mobile topbar both link to `/creators/{org.slug}` directly, dropping the creator out of the dashboard.
  - Change: the "Storefront" sidebar entry now points to `/dashboard/{org}/storefront/theme` (the new editor).
  - Mobile topbar's "Storefront" icon button is replaced with a smaller "View public →" affordance that opens `/creators/{slug}` in a new tab (`target="_blank"`, `rel="noopener"`).
  - Add a "View public storefront →" pill button to the top-right of every page under `/dashboard/{org}/storefront/*` (uses `target="_blank"`).
  - Acceptance: clicking "Storefront" in the dashboard sidebar lands on the Theme editor, NOT the public site. The public site is reachable via the secondary "View public" link from any storefront editor page.

- [ ] **12.1.5.1 New route `/dashboard/{org}/storefront/theme`**
  - Add the dashboard nav item under "Storefront". Page renders three tabs (Brand / Layout / Sections) using shadcn `<Tabs>`. Layout + Sections tabs are present but disabled with a "Coming soon" badge until 12.3 + 12.4.
  - Acceptance: route mounts, Brand tab is the default.

- [ ] **12.1.5.2 Build the accent picker**
  - 8 swatch cards, 96px square each, wrap on mobile. Each card shows the accent + paired secondary as a horizontal split. Selected card has a hairline `--border-strong` highlight.
  - Click → updates local form state via React Hook Form; debounced 500ms → posts to the preview endpoint and updates the iframe.
  - Acceptance: clicking a swatch updates the iframe within 1 second.

- [ ] **12.1.5.3 Build the headline-font picker**
  - 4 cards rendering "Make. Sell. Get paid." in each font option at H2 size. Selected card highlighted. Same debounced preview hook.
  - Acceptance: clicking a card updates the iframe within 1 second.

- [ ] **12.1.5.4 Build the display-style + motion radio groups**
  - Two stacked radio groups, three options each. Same debounced preview hook.
  - Acceptance: clicking a radio updates the iframe within 1 second.

- [ ] **12.1.5.5 Build the live-preview iframe**
  - Right-column on desktop (`flex-1 max-w-[600px]`), bottom-drawer on mobile (collapsed by default with a "Preview" toggle button).
  - The iframe `src` is `/creators/{slug}?preview_theme={token}`. The token is obtained from the preview endpoint and updated on each form change.
  - Acceptance: iframe shows the storefront with the unsaved tokens applied.

- [ ] **12.1.5.6 Build the Save / Discard toolbar**
  - Sticky bottom bar that appears when the form is dirty. "Save changes" (primary) and "Discard" (secondary).
  - Save POSTs to `PATCH /v1/organizations/{id}/storefront/tokens`, invalidates relevant React Query caches, deletes the draft, shows a toast.
  - Discard resets the form to the saved tokens, deletes the draft, refreshes the iframe.
  - Acceptance: dirty state toggles the bar; save persists + clears dirty.

- [ ] **12.1.5.7 Build the "Reset to defaults" button**
  - Top-right button on the Brand tab. Confirms via shadcn dialog. On confirm, posts `tokens: STOREFRONT_DEFAULTS` to the same PATCH endpoint.
  - Acceptance: reset confirmed restores Blyss defaults; cancel leaves form unchanged.

### 12.1.6 Tests

- [ ] **12.1.6.1 Backend: tokens validation tests**
  - `server/tests/organization/test_storefront_tokens.py`. Cases: valid, invalid accent, invalid font, unknown extra key, missing required field.
  - Acceptance: pytest passes.

- [ ] **12.1.6.2 Backend: PATCH endpoint integration test**
  - Fixture creator → PATCH a new accent → fetch storefront via `/v1/organizations/creators/{slug}` → assert the accent appears in `theme_tokens`.
  - Acceptance: integration test passes (uses the existing pytest infra; pre-existing fixture fail is OK).

- [ ] **12.1.6.3 Frontend: ThemeProvider unit test**
  - Render with each accent, snapshot the resolved CSS custom property set, assert the WCAG contrast.
  - Acceptance: vitest passes.

- [ ] **12.1.6.4 Frontend: Brand tab Cypress / Playwright e2e**
  - Open `/dashboard/{org}/storefront/theme`, click an accent, observe iframe updates, click Save, navigate to the public storefront, observe the new accent.
  - Acceptance: e2e test passes locally; mark `@slow` in CI if it's flaky in the headless environment.

- [ ] **12.1.6.5 Performance gate**
  - Run Lighthouse against `/creators/blyss-studio` with the v1 default theme. Confirm scores match §19.11.
  - Run again with each of the 8 accents + each of the 4 fonts (16 combinations). Worst-case stays within budget.
  - Acceptance: every combination passes the gate.

### 12.1.7 Acceptance for v1 ship

- [ ] All 12.1.x tasks ticked.
- [ ] Backend boots ≥ existing baseline routes (the new endpoints add 2-3 routes).
- [ ] tsc baseline ≤ 474 errors.
- [ ] vitest passes ≥ 424 tests.
- [ ] Manual: pick a creator, pick an accent, pick a font, save, refresh `/creators/{slug}`, observe the change. Cart icon stays Blyss orange.
- [ ] Lighthouse: storefront page passes §19.11 budget on Moto G5 + Slow 4G simulation.

---

## 12.2 Layout abstraction (foundation for v2 — 1 week)

Goal: refactor the existing storefront into the `editorial` layout + introduce the `STOREFRONT_LAYOUTS` registry. No new layouts ship yet.

- [ ] **12.2.1 Extract the existing storefront body into `EditorialLayout.tsx`**
  - New file `clients/web/src/components/Storefront/layouts/EditorialLayout.tsx`. Lifts the body of `CreatorStorefrontPage.tsx` (everything below the chrome) into a layout component matching the §19.4.2 props contract.
  - Marketplace chrome stays in the route handler; only the storefront body moves.
  - Acceptance: `/creators/blyss-studio` renders pixel-identical to before the refactor (visual snapshot).

- [ ] **12.2.2 Define `STOREFRONT_LAYOUTS` registry**
  - New file `clients/web/src/components/Storefront/layouts/registry.ts`. Single entry: `editorial`. Use `next/dynamic` with `ssr: true`.
  - Acceptance: import from the route handler resolves to the EditorialLayout component.

- [ ] **12.2.3 Wire `theme_layout` into the route render**
  - Route handler reads `org.theme_layout`, dynamic-imports the layout, renders inside `<ThemeProvider>`.
  - Acceptance: hard-coding `theme_layout = 'editorial'` produces the same render; setting an unknown slug falls back to editorial with an error log (defensive — never crash a buyer's view).

- [ ] **12.2.4 Add `data-storefront-layout` attribute on `<ThemeProvider>` wrapper**
  - For diagnostic / Lighthouse reporting. The attribute carries the slug.
  - Acceptance: DOM inspection on a creator page shows the attribute matching the org row.

- [ ] **12.2.5 Performance baseline per layout**
  - Document JS / CSS / LCP / CLS / TBT for `editorial` in `plan/10-performance.md` so v2 layouts have a reference. Add a CI step that runs Lighthouse on the `editorial` storefront and fails the build if regressions exceed 5% on any of the 5 metrics.
  - Acceptance: CI step exists; a deliberately-bloated layout commit fails it.

---

## 12.3 Layouts v2 — gallery + catalog (3 weeks)

Goal: two new layouts shipped behind a feature flag, gradually rolled out per §19.10.2.

### 12.3.1 Gallery layout

- [ ] **12.3.1.1 Build `GalleryLayout.tsx`**
  - Image-first hero (full-bleed banner using `creator.banner_url`, identity overlay bottom-left). Dense 4–5 column masonry product grid using existing `<MarketplaceProductCard>` primitives in a tighter density variant.
  - Reviews surface as a thin strip at the bottom (Top reviews carousel, no body text by default).
  - Subscriptions surface as a sticky right-column on desktop, collapsed accordion on mobile.
  - Tip button stays in the same absolute position as `editorial` (top-right of identity).
  - Acceptance: visual snapshot review on staging; passes §19.11 perf budget; passes §19.12 a11y/SEO baselines.

- [ ] **12.3.1.2 Mobile responsiveness pass**
  - Test 375 / 414 / 768 / 1024 / 1440 viewports. Masonry collapses to 2 cols at < 768.
  - Acceptance: no horizontal scroll, touch targets ≥ 44px, focus rings visible.

### 12.3.2 Catalog layout

- [ ] **12.3.2.1 Build `CatalogLayout.tsx`**
  - Thin identity row (40px avatar + name + handle inline). List rows of products: 80px thumb + name + 1-line description + price + Add-to-cart, all on one line on desktop, two-line on mobile.
  - Reviews and Subscriptions render as inline blocks between every N products.
  - Acceptance: dense rendering of 50 products feels fast; passes perf budget.

- [ ] **12.3.2.2 Sticky filter sidebar (desktop only)**
  - When the creator has > 12 products, a sticky left sidebar with category / price / type filters. Mobile uses the existing filter modal pattern.
  - Acceptance: filters update the visible list without re-fetching; URL params persist filter state.

### 12.3.3 Registry + dashboard

- [ ] **12.3.3.1 Register both layouts in `STOREFRONT_LAYOUTS`**
  - Add entries with dynamic imports.
  - Acceptance: dashboard layout tab (when enabled) shows them.

- [ ] **12.3.3.2 Build the Layout tab UI**
  - 5 layout cards with screenshot thumbnails (200×260). Selected card has highlight. Click → updates form, debounced preview to iframe.
  - Save POSTs to a new `PATCH /v1/organizations/{id}/storefront/layout` endpoint.
  - Acceptance: clicking gallery + saving renders the public storefront with the gallery layout.

- [ ] **12.3.3.3 Layout-specific module slot warning**
  - When the creator has modules enabled that don't fit the chosen layout's slots, show a yellow inline warning: "Your selected modules won't appear with this layout."
  - Acceptance: switching from `editorial` (which has a sidebar) to `studio` (which doesn't) and having a sidebar module triggers the warning.

### 12.3.4 Feature flag rollout

- [ ] **12.3.4.1 Add `STOREFRONT_LAYOUTS_ENABLED` settings entry**
  - `server/polar/config.py` — list of slugs visible in the dashboard layout picker. Default `["editorial"]`. Add to env-var override.
  - Acceptance: changing the env var shows / hides layouts in the dashboard without a code change.

- [ ] **12.3.4.2 Phase A — staff orgs only**
  - Hard-code staff org IDs in a server-side allow-list. They see all layouts regardless of the env var. Run for 1 week of dogfood.
  - Acceptance: a staff creator can pick gallery; a non-staff creator sees only editorial.

- [ ] **12.3.4.3 Phase B — 5% creator rollout**
  - Enable for 5% of creators by `creator_category_slug` matching the layout's typical fit (gallery for photographer/designer; catalog for educator).
  - Acceptance: 5% of creators see the new layouts; the other 95% see only editorial.

- [ ] **12.3.4.4 Phase C — GA**
  - Set `STOREFRONT_LAYOUTS_ENABLED=editorial,gallery,catalog`. Document in the launch notes.
  - Acceptance: every creator sees all three layouts.

### 12.3.5 Performance gates per layout

- [ ] **12.3.5.1 Lighthouse CI per layout**
  - The CI Lighthouse step from 12.2.5 runs against each registered + flag-enabled layout. PR fails if any layout regresses.
  - Acceptance: a deliberately-bloated gallery commit fails CI.

- [ ] **12.3.5.2 Bundle-size gate per layout**
  - CI step that asserts each layout's chunk gzip size ≤ 40 KB additional vs editorial.
  - Acceptance: bloating gallery beyond budget fails CI.

---

## 12.4 Niche modules — v3 (3-4 weeks)

Goal: 4 niche modules (waveform_player, recipe_card, before_after_slider, curriculum_outline) live + Sections tab in the dashboard.

### 12.4.1 Module foundation

- [ ] **12.4.1.1 Define `ModuleKind` types + registry shape**
  - In `clients/web/src/types/storefront-theme.ts`: `ModuleKind` union, `ModuleSettings` indexed type, `EnabledModule` shape.
  - Acceptance: types compile.

- [ ] **12.4.1.2 Build the empty `MODULE_REGISTRY`**
  - New file `clients/web/src/components/Storefront/modules/registry.ts`. `Record<ModuleKind, ModuleSpec>` with no entries. Add helpers `getSuggestedModulesForCategory(slug)` and `getModulesForSlot(slot, modules)`.
  - Acceptance: imports compile; both helpers return empty arrays.

- [ ] **12.4.1.3 Add `<ModulesSlot>` component**
  - Renders modules into a layout slot. Each layout calls `<ModulesSlot slot="hero_below" modules={modules} />` etc.
  - Sorts by `display_order`, lazy-imports each module's component on demand.
  - Acceptance: rendering with empty modules outputs no markup; rendering with one stub module outputs that module.

- [ ] **12.4.1.4 Update layouts to mount their slots**
  - `editorial`: `hero_below`, `sidebar`. `gallery`: `hero_below`. `catalog`: `before_grid`. (Slots per §19.5.3.)
  - Acceptance: each layout has its declared slots wired.

- [ ] **12.4.1.5 Build the modules PATCH endpoint**
  - `PATCH /v1/organizations/{id}/storefront/modules`. Body: `EnabledModule[]`. Validates each entry against the registry's settings schema.
  - Acceptance: valid update persists; invalid module kind / extra settings rejected 422.

### 12.4.2 Module #1 — waveform_player

- [ ] **12.4.2.1 Build the waveform_player component**
  - Slot: `product_detail`. Reads `peaks_url` from settings (creator-uploaded JSON of audio peaks). Renders a clickable waveform; clicking plays the audio preview using HTMLAudio.
  - Mobile-friendly. Pauses on tab blur.
  - Acceptance: clicking the waveform plays the preview; pausing works; the bundle size of this module's chunk is ≤ 30 KB gzip.

- [ ] **12.4.2.2 Settings schema + form**
  - Zod schema: `{ peaks_url?: string (URL), audio_preview_url: string (URL, required), color?: 'accent' | 'foreground' }`. Form rendered in the dashboard configure modal from the schema.
  - Acceptance: creator can paste an audio URL, save, then a buyer hears it on the product detail page.

- [ ] **12.4.2.3 Register the module**
  - Add to `MODULE_REGISTRY` with `slot: 'product_detail'`, `suggestedFor: ['musician']`, default settings.
  - Acceptance: musician creators see it in the Sections tab "Suggested" section.

### 12.4.3 Module #2 — recipe_card

- [ ] **12.4.3.1 Build the recipe_card component**
  - Slot: `product_detail`. Reads `servings`, `prep_time_minutes`, `cook_time_minutes`, `ingredients[]`, `allergens[]` from settings.
  - Editorial card with structured fields. Print-friendly.
  - Acceptance: cook creator's product detail shows the recipe card; passes JSON-LD structured data validation (Recipe schema.org).

- [ ] **12.4.3.2 Settings schema + form**
  - Zod schema with the fields above. Form supports adding multiple ingredients + allergens. Validate `prep_time` + `cook_time` ≥ 0.
  - Acceptance: creator can fill a recipe; rendered on the page.

- [ ] **12.4.3.3 Register the module**
  - Slot, `suggestedFor: ['cook']`, defaults.
  - Acceptance: shows up for cooks.

### 12.4.4 Module #3 — before_after_slider

- [ ] **12.4.4.1 Build the before_after_slider component**
  - Slot: `product_detail` and `hero_below`. Reads `before_image_url`, `after_image_url`, `label_before`, `label_after` from settings.
  - Drag handle slides between the two images. Touch-friendly.
  - Acceptance: photographer creator's storefront shows a draggable before/after.

- [ ] **12.4.4.2 Settings schema + form**
  - Zod with image URLs (validated against the project's image domain allow-list) + labels (≤ 40 chars).
  - Acceptance: creator can configure; renders; mobile drag works.

- [ ] **12.4.4.3 Register the module**
  - `suggestedFor: ['photographer']`.
  - Acceptance: shows for photographers.

### 12.4.5 Module #4 — curriculum_outline

- [ ] **12.4.5.1 Build the curriculum_outline component**
  - Slot: `product_detail`. Reads `modules[] = [{title, lessons: [{title, duration_minutes}]}]` from settings.
  - Collapsible sections. Total course duration computed at the top.
  - Acceptance: educator creator's product detail shows a structured outline.

- [ ] **12.4.5.2 Settings schema + form**
  - Nested module / lesson form. Drag-to-reorder lessons within a module.
  - Acceptance: educator can build a 3-module outline with 5 lessons each in under 5 minutes.

- [ ] **12.4.5.3 Register the module**
  - `suggestedFor: ['educator']`.
  - Acceptance: shows for educators.

### 12.4.6 Sections tab in dashboard

- [ ] **12.4.6.1 Suggested + All modules sections**
  - Two list sections per §19.8.4. Suggested expanded by default; All collapsed.
  - Each row: toggle, configure link, drag handle.
  - Acceptance: a creator can enable a suggested module, configure it, save.

- [ ] **12.4.6.2 Drag-to-reorder within a slot**
  - Use existing dnd-kit setup (already in the project). Save order as `display_order` indexes.
  - Acceptance: dragging two modules in the same slot persists the new order.

- [ ] **12.4.6.3 Slot mismatch warning**
  - When a creator enables a module whose slot doesn't exist in their current layout, inline yellow warning: "This module won't show on the {layout_name} layout. Switch to {suggested_layout} or pick a different module."
  - Acceptance: enabling a sidebar-only module on the gallery layout triggers the warning.

### 12.4.7 Performance gates per module

- [ ] **12.4.7.1 Bundle-size gate per module**
  - Each module's chunk gzip ≤ 8 KB at registration baseline (see §19.11). Modules with media (waveform, before/after) get a higher cap of 30 KB documented in the spec.
  - Acceptance: CI fails on any module that exceeds its declared cap.

- [ ] **12.4.7.2 Lighthouse with all modules enabled**
  - Run Lighthouse on a synthetic creator with every suggested module enabled for their category. Confirm budget holds.
  - Acceptance: passes §19.11 budget.

### 12.4.8 Tests

- [ ] **12.4.8.1 Unit test each module's render**
  - Vitest unit tests with valid + invalid settings shapes.
  - Acceptance: passing.

- [ ] **12.4.8.2 E2E for each module enable + render**
  - Playwright: log in as a creator, enable a module, save, visit storefront, observe.
  - Acceptance: passing for all 4 modules.

---

## 12.5 v4 — remaining layouts + modules (optional, 4-6 weeks)

Goal: ship the last two layouts (`portfolio`, `studio`) and the last three modules (`palette_swatches`, `license_tier_picker`, `specimens`).

Tasks mirror 12.3 + 12.4 pattern. Don't start 12.5 until v3 has been live for 4+ weeks and we have data on which patterns earn use.

### 12.5.1 Portfolio layout

- [ ] **12.5.1.1 Build `PortfolioLayout.tsx`** — full-screen scroll-snap, one product per section.
- [ ] **12.5.1.2 Mobile fallback** — stacked vertical (no scroll-snap on mobile).
- [ ] **12.5.1.3 Register + flag-enable per phase A/B/C.**

### 12.5.2 Studio layout

- [ ] **12.5.2.1 Build `StudioLayout.tsx`** — minimal centered identity, single column body.
- [ ] **12.5.2.2 Sidebar slot for typography-heavy creators.**
- [ ] **12.5.2.3 Register + flag-enable.**

### 12.5.3 Module — palette_swatches

- [ ] **12.5.3.1 Build component** — render colour swatches with hex / RGB / OKLCH values; copy to clipboard on click.
- [ ] **12.5.3.2 Settings schema** — array of `{name, hex}`.
- [ ] **12.5.3.3 Register** — `suggestedFor: ['designer']`.

### 12.5.4 Module — license_tier_picker

- [ ] **12.5.4.1 Build component** — render the creator's license tiers (personal / commercial / enterprise) as a comparison matrix.
- [ ] **12.5.4.2 Tie to existing product variant data** — pull tier names from product prices, don't duplicate.
- [ ] **12.5.4.3 Register** — `suggestedFor: ['designer', 'musician']`.

### 12.5.5 Module — specimens

- [ ] **12.5.5.1 Build component** — typography specimen grid for type-design creators.
- [ ] **12.5.5.2 Settings schema** — array of `{font_family, sample_text, weights[]}`.
- [ ] **12.5.5.3 Register** — `suggestedFor: ['designer']`.

### 12.5.6 v4 acceptance

- [ ] All layouts at GA.
- [ ] All modules at GA.
- [ ] Performance budget unchanged.
- [ ] Documentation in `19-storefront-themes.md` updated to mark v4 complete.

---

## 12.6 Documentation + handoff

- [ ] **12.6.1 Add a creator-facing help article** at `/help#themes`. Step-by-step screenshots of the Brand / Layout / Sections flow.
- [ ] **12.6.2 Add operator docs** in `plan/12-deployment.md` covering the feature-flag rollout pattern.
- [ ] **12.6.3 Update `plan/15-acceptance.md`** with the §19.13 acceptance criteria as launch gates.
- [ ] **12.6.4 Add a row to the marketing site** (`/start`) under "What you can sell" with a screenshot strip showing 3 different theme variations.

---

## Acceptance — phase 12 done

- [ ] §19.13 acceptance criteria all checked.
- [ ] §19.11 performance budget held on every layout × every accent × every font combination.
- [ ] Lighthouse + a11y baselines from §19.12 pass on every shipped layout.
- [ ] Three columns + `theme_version_hash` live on the `organizations` table; every existing creator has the v1 baseline.
- [ ] Creator dashboard route `/dashboard/{org}/storefront/theme` reachable from the nav.
- [ ] Three sub-tabs (Brand / Layout / Sections) functional per the phases shipped.
- [ ] Marketplace chrome (header / footer / cart / search) confirmed unaffected on every theme combination.
- [ ] Cache hit rate on storefront pages ≥ 85% after 7 days of normal traffic.
- [ ] Backend boots ≥ existing baseline routes; tsc baseline ≤ 474 errors; vitest passes ≥ 424.

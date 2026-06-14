# §19 Storefront themes — non-negotiable spec

> See also: [04-ui-direction.md](./04-ui-direction.md) §3 (palette, type, patterns), [16-do-not-do.md](./16-do-not-do.md) §15.4 (visual anti-patterns), [07-pages.md](./07-pages.md) §6.4 (creator storefront page).

This section is the contract for how creators customize their storefronts. It supersedes any informal "let creators add CSS" idea elsewhere. Read fully before writing any storefront-theme code.

## §19.1 Mission

Let each creator on Blyss put their brand on their `/creators/{slug}` storefront — colour, type, page layout, niche-specific sections — without breaking the marketplace's coherence.

**Goals**

- A buyer landing on a musician's storefront feels like they're in that musician's space — not a generic Blyss page with their name on it.
- The same buyer clicking the Blyss header stays oriented in the marketplace — header, footer, search, cart never change.
- Creators can pick a theme in under five minutes from a curated set, no design experience required.
- Niche components (waveform players, recipe cards, before/after sliders) live as opt-in modules, not frozen defaults.
- Every theme passes the existing Lighthouse, a11y, SEO, and design gates from §3.5.

**Non-goals**

- A theme marketplace. No third-party themes, no paid themes, no theme imports. The set of layouts is closed and curated by Blyss.
- Free-form CSS, custom HTML, or `<script>` injection. Every customization is a typed value chosen from a registry.
- Per-subdomain creator hosting. Creators stay at `/creators/{slug}` on `blyss.co.ke`. Custom domains are post-v4.
- Editable Blyss chrome. The marketplace header, footer, cart drawer, search modal, sticky tabs above the storefront — all locked to Blyss tokens.
- Buyer-facing theme switchers. The creator's choice is final; the buyer cannot toggle "dark mode" on someone else's storefront.

## §19.2 Three-layer model

A theme is the composition of three independent concerns:

```
┌── Tokens ────────── colour, typography, motion intensity (CSS custom properties)
├── Layout ────────── the structural shape of the storefront body (one of a closed set)
└── Niche modules ─── waveform players, recipe cards, etc. (typed registry)
```

A creator picks one token set, one layout, and any number of modules. Every storefront ships with all three layers, so the foundation has to support all three from day one even though we ship them in phases.

Why split? Bundling tokens with layout is what makes Shopify-style theming a swamp — every visual change forks into a new "theme" and the matrix of features × layouts blows up. Splitting them keeps the feature surface linear: N tokens × M layouts × K modules instead of N × M × K themes to maintain.

## §19.3 Layer 1 — Tokens

The smallest, safest, most-shipped layer. Tokens override CSS custom properties on a `<ThemeProvider>` wrapper around the storefront subtree. Five fields, all enums:

### §19.3.1 The token shape

```ts
type StorefrontTokens = {
  /** Curated accent palette — see §19.3.2. Default: 'burnt-orange' (Blyss). */
  accent: 'burnt-orange' | 'forest' | 'clay' | 'ink' | 'oxblood' | 'bronze' | 'cobalt' | 'aubergine';
  /** Optional secondary accent for niches that need a paired colour
   *  (musicians often want a hot-pink secondary; designers go monochrome).
   *  Each accent has a default secondary; this overrides it. */
  accent_secondary?: StorefrontTokens['accent'];
  /** Curated headline-display fonts. Body is always Inter — locked. */
  headline_font: 'inter-display' | 'cormorant-garamond' | 'space-grotesk' | 'inter-tight';
  /** A few typography rules bundled into a name. Touches line-height,
   *  letter-spacing, eyebrow weight, headline italic frequency. */
  display_style: 'editorial' | 'minimal' | 'bold';
  /** Multiplier the existing motion config picks up. */
  motion: 'subtle' | 'standard' | 'expressive';
};
```

### §19.3.2 The palette catalogue

Eight accents. All hand-picked for `--background #FAFAF7` contrast (WCAG AA on 14px+) and harmony with the locked Inter body type. Each one ships with a `hover` shade and a paired secondary.

```
burnt-orange   #C2410C  hover #DD5818  pair #166534 (forest)
forest         #166534  hover #15803D  pair #C2410C (orange)
clay           #9A3412  hover #C2410C  pair #1E3A8A (cobalt-deep)
ink            #1E1B16  hover #2C2820  pair #B45309 (warning-amber)
oxblood        #7F1D1D  hover #991B1B  pair #FCD34D (mustard)
bronze         #92400E  hover #B45309  pair #134E4A (teal-deep)
cobalt         #1E3A8A  hover #1D4ED8  pair #D97706 (amber)
aubergine      #581C87  hover #6B21A8  pair #C2410C (orange)
```

Forbidden everywhere (this list extends the §3.2 forbidden colours):

- Any accent outside this catalogue.
- Pure black, pure white, neon, gradients.
- Any colour that fails WCAG AA on `--text-primary #1A1A17` or on `--background`.

### §19.3.3 Typography options

Four headline display fonts, all self-hosted. The body type is always **Inter** to keep cross-storefront reading consistent.

- `inter-display` — Inter Display 600. Default. Editorial precision.
- `cormorant-garamond` — Cormorant Garamond 500/600 italic-friendly. Editorial / boutique.
- `space-grotesk` — Space Grotesk 500/600. Modern / tech / studio.
- `inter-tight` — Inter Tight 600. Condensed / dense product walls.

Display style:

- `editorial` — line-height 1.05, letter-spacing -0.02em, italic eyebrows. Like Aimé Leon Dore.
- `minimal` — line-height 1.1, letter-spacing -0.01em, no italics. Like Linear.
- `bold` — line-height 0.95, letter-spacing -0.03em, sentence-case headlines. Like high-fashion editorials.

### §19.3.4 Motion intensity

The existing motion config (§3.4) sets durations and easings. Tokens scale them:

- `subtle` — durations × 0.5, no scroll-driven reveals.
- `standard` — Blyss default. Durations as-is.
- `expressive` — durations × 1.2, scroll-driven reveals on hero + product cards.

`prefers-reduced-motion` always overrides — `expressive` collapses to `subtle` for users with the OS preference.

### §19.3.5 Tokens render path

Single React provider component, mounted at the storefront layout root only:

```tsx
<ThemeProvider tokens={org.theme_tokens}>
  <Layout creator={creator} products={products} reviews={reviews} modules={modules} />
</ThemeProvider>
```

The provider sets CSS custom properties on a wrapper `<div>`:

```css
[data-storefront-theme] {
  --accent: <resolved>;
  --accent-hover: <resolved>;
  --accent-foreground: #FAFAF7;
  --font-display: <resolved>;
  /* display_style + motion translate to additional vars */
}
```

The marketplace chrome (header, footer, cart drawer, search modal, mobile nav) renders **outside** this provider. It always reads from the global Blyss `:root` tokens. So creator A's purple page doesn't paint creator B's cart icon purple — and the buyer never loses track of where they are.

## §19.4 Layer 2 — Layouts

A closed set of React layout components, all consuming the same `{creator, products, reviews, modules}` data. Different arrangement, identical primitives.

### §19.4.1 The catalogue (v2 + v3)

| Slug         | Best for                                           | Hero                          | Product display              | Notes                        |
| ------------ | -------------------------------------------------- | ----------------------------- | ---------------------------- | ---------------------------- |
| `editorial`  | default; ebooks, courses, mixed catalogue          | banner + identity overlay     | tabs + 3-col grid            | the layout we have today     |
| `gallery`    | photographers, illustrators, designers             | full-bleed image-first        | dense 4–5 col masonry        | image-led, minimal copy      |
| `catalog`    | many SKUs; ebooks, presets, audio packs            | thin identity row             | list rows w/ thumb + meta    | text-led, fast scanning      |
| `portfolio`  | musicians, designers shipping one polished release | full-screen scroll-snap       | one product per section      | cinematic                    |
| `studio`     | one-product specialists, writers                   | minimal centered identity     | single column, body-led      | calm, body-typography focus  |

Every layout MUST:

- Render `<StorefrontHero>` (or its layout-specific variant) with the same identity fields (avatar / name / handle / bio / city) above the fold.
- Accept the same `subscriptions`, `tips`, and `reviews` data and surface them somewhere in the body.
- Mount the marketplace chrome (handled at the route level — chrome is outside the layout).
- Pass §3.5 anti-pattern checklist (no shadows for sectioning, no gradients, no off-palette colours).
- Pass the same Lighthouse gates as `editorial`.

### §19.4.2 The data contract

A layout component is a typed React component:

```ts
type StorefrontLayoutProps = {
  creator: CreatorStorefrontSchema;        // org + bio + socials + links
  products: PublicProduct[];               // sorted by display_order
  reviews: OrganizationReviewPublic[];     // recent N
  modules: EnabledModule[];                // see §19.5
  preview?: boolean;                       // when true, suppress live tracking
};

type StorefrontLayoutComponent = React.FC<StorefrontLayoutProps>;
```

A registry maps slugs → components, dynamically imported so each storefront page only ships the JS for the chosen layout.

```ts
export const STOREFRONT_LAYOUTS: Record<StorefrontLayoutSlug, () => Promise<StorefrontLayoutComponent>> = {
  editorial: () => import('./layouts/EditorialLayout'),
  gallery:   () => import('./layouts/GalleryLayout'),
  catalog:   () => import('./layouts/CatalogLayout'),
  portfolio: () => import('./layouts/PortfolioLayout'),
  studio:    () => import('./layouts/StudioLayout'),
};
```

### §19.4.3 What stays shared across layouts

- `<MarketplaceProductCard>` (the primitive product card)
- `<ProductPrice>` (price formatting)
- `<ReviewList>`, `<ReviewForm>` (review surfaces)
- `<TierCard>` (subscription tier)
- `<CartItemRow>` is rendered in the cart, not the storefront — irrelevant here

Every layout MUST use these primitives. A layout cannot ship its own version of a product card.

## §19.5 Layer 3 — Niche modules

Real component bundles for category-specific behaviours. The creator opts in per module; the dashboard suggests defaults based on the creator's `creator_category_slug`.

### §19.5.1 The module shape

```ts
type ModuleKind =
  | 'waveform_player'         // suggested for: musician
  | 'before_after_slider'     // suggested for: photographer
  | 'recipe_card'             // suggested for: cook
  | 'curriculum_outline'      // suggested for: educator
  | 'palette_swatches'        // suggested for: designer
  | 'license_tier_picker'     // suggested for: designer / musician
  | 'specimens'               // suggested for: designer (typography)

type EnabledModule = {
  kind: ModuleKind;
  enabled: boolean;
  settings: ModuleSettings[ModuleKind]; // typed per kind
  display_order: number;                // within-slot ordering
};
```

### §19.5.2 The module registry

```ts
type ModuleSpec<K extends ModuleKind> = {
  component: () => Promise<React.FC<ModuleProps[K]>>;
  /** Which slot the module renders into. */
  slot: 'hero_below' | 'product_detail' | 'sidebar' | 'before_grid';
  /** Server-side validator for settings; identical pattern to Polar's
   *  Benefit properties validators. */
  settingsSchema: z.ZodType<ModuleSettings[K]>;
  /** Creator categories this module is suggested for; the rest see it
   *  in an "Other modules" expandable section. */
  suggestedFor: CreatorCategorySlug[];
  /** Default settings the creator gets when they enable the module. */
  defaultSettings: ModuleSettings[K];
};

const MODULE_REGISTRY: { [K in ModuleKind]: ModuleSpec<K> } = { ... };
```

### §19.5.3 The slots a layout exposes

Each layout declares which slots it renders. Modules go into matching slots by their `slot` field.

- `hero_below` — directly under the hero / identity row, before product grid.
- `before_grid` — between hero and product grid (different from `hero_below` only in spacing).
- `sidebar` — desktop-only sidebar column (only `editorial` and `studio` have one).
- `product_detail` — rendered on the product detail page, not the storefront. Owned by the same module registry but mounted from a different route.

A layout that doesn't have a `sidebar` slot just ignores any module asking for one — the dashboard warns the creator that the module won't show with their chosen layout.

### §19.5.4 Settings validation

`settingsSchema` is enforced both client-side (in the dashboard form) and server-side (in `PATCH /v1/organizations/{id}/storefront/modules`). The same Zod schema runs on both sides — frontend imports the schema from a shared `theme-types` package or generates from OpenAPI.

Reject any module config with unknown keys, wrong types, or values outside the spec. No "loose" JSON.

## §19.6 Data model

### §19.6.1 New columns on `organizations`

```sql
ALTER TABLE organizations
  ADD COLUMN theme_layout TEXT NOT NULL DEFAULT 'editorial'
    CHECK (theme_layout IN ('editorial', 'gallery', 'catalog', 'portfolio', 'studio')),
  ADD COLUMN theme_tokens JSONB NOT NULL DEFAULT '{
    "accent": "burnt-orange",
    "headline_font": "inter-display",
    "display_style": "editorial",
    "motion": "standard"
  }'::jsonb,
  ADD COLUMN theme_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN theme_version_hash TEXT;
```

`theme_version_hash` is a recomputed SHA-256 of `(theme_layout, theme_tokens, theme_modules)` set in a `before_update` SQLAlchemy hook. Used as a cache key for SSR and for layout JS bundles.

### §19.6.2 Validation at the model layer

A Pydantic schema for each token + module shape, mirroring the TS types in §19.3 and §19.5. The PATCH endpoint validates against these before writing the row. Invalid values rejected as 422 with the field path.

### §19.6.3 Draft tokens (preview flow)

Stored in Redis, NOT in the database. Key shape:

```
storefront-theme-draft:{org_id}:{user_id}  →  JSON of full theme  (TTL 30min)
```

The dashboard preview iframe carries a signed token in the query (`?preview_theme=<HMAC-signed-id>`), the storefront route reads the token, validates the signature, fetches the draft from Redis, and renders. Save copies draft → org row, deletes the Redis key.

Drafts never persist beyond the editing session. Refresh = lose the draft (we'll add an explicit "Discard / Save" toolbar so this is intentional).

### §19.6.4 No new tables yet

Three columns on `organizations` is enough for v1–v3. We promote `theme_modules` to a side table only if/when:

- Module ordering needs frequent partial updates (today's full-array PATCH is fine for ≤20 modules)
- A module needs its own indexable columns

For v4+ we'd introduce `creator_storefront_modules (id, organization_id, kind, enabled, settings, display_order)`. Don't pre-build it.

## §19.7 Render pipeline

### §19.7.1 Server-side render path

```
GET /creators/{slug}
  ↓
Next.js route handler
  ↓
Fetch organization (has theme_layout, theme_tokens, theme_modules, theme_version_hash)
Fetch storefront data (products, reviews, subscriptions)
  ↓
const Layout = await STOREFRONT_LAYOUTS[org.theme_layout]()
  ↓
Render <ThemeProvider tokens={org.theme_tokens}>
        <Layout creator={...} products={...} reviews={...} modules={enabledModules} />
       </ThemeProvider>
  ↓
HTML response includes:
  - inline <style> with the resolved CSS custom properties
  - server-resolved layout HTML (no client flash)
  - module slots rendered with the chosen modules
```

### §19.7.2 Cache key

The storefront response is cached per `(slug, theme_version_hash)`. When the creator saves a theme change, `theme_version_hash` updates and the cache key changes — the next visitor gets the fresh render. No explicit invalidation needed.

`Cache-Control: public, max-age=60, stale-while-revalidate=600` on the route. Marketplace chrome (which doesn't depend on theme) is cached separately at the layout level.

### §19.7.3 Preview render path

When the URL has `?preview_theme=<token>`:

1. Validate the HMAC signature (rejects tampered or expired tokens).
2. Fetch draft from Redis using the signed id.
3. Render with the draft tokens / layout / modules instead of the org row.
4. Add a `<meta name="robots" content="noindex">` so previews never get indexed.
5. Add a `<div role="region" aria-label="Preview">` banner pinned to the top showing "Preview — your changes are not live yet" with a "Save" button that POSTs to the dashboard.

### §19.7.4 Layout JS code-split

Each layout is `next/dynamic`-imported with `ssr: true`. Bundle stays per-layout — a buyer hitting an `editorial` storefront ships only the editorial-layout JS, not all five layouts.

Same for modules — each module is its own dynamic import.

### §19.7.5 OG / SEO

Every layout generates the same OG tags via the same `generateMetadata()` function. The metadata is independent of the chosen theme — title is `{Creator Name} on Blyss`, description is the creator's bio, OG image is the creator's cover image (or a default with the wordmark on `--background`). Theme choice does not change SEO output.

## §19.8 Creator dashboard UX

### §19.8.1 The route

`/dashboard/{org}/storefront/theme` — three tabs.

### §19.8.2 Brand tab

The cheapest-to-ship surface. Three controls:

- **Accent palette** — eight swatch cards (clickable, wrap on mobile). Each card shows the accent + paired secondary. Selected card has a hairline `--border-strong` highlight.
- **Headline font** — four cards rendering "Make. Sell. Get paid." in each font option at H2 size.
- **Display style + motion** — two stacked radio groups, three options each.

Single Save button at the bottom. Save POSTs to `PATCH /v1/organizations/{id}/storefront/tokens`, recomputes `theme_version_hash`, returns 200.

Live preview pane (right column on desktop, bottom drawer on mobile) shows the creator's actual storefront rendered with the unsaved tokens via the iframe + signed-draft-token mechanism in §19.7.3. Updates as the creator clicks options — debounced 500ms to avoid hammering Redis on every click.

### §19.8.3 Layout tab

Five layout cards, each with:

- Static thumbnail (200×260) of the layout rendered with a representative test creator
- Layout name + 1-line description
- A "Preview with my products" button that opens the iframe pane with the creator's data + that layout

Single Save button. Save POSTs to `PATCH /v1/organizations/{id}/storefront/layout`. Cache invalidation via theme_version_hash.

### §19.8.4 Sections tab

Two sub-sections:

- **Suggested for {creator_category_name}** — modules whose `suggestedFor` includes the creator's category. Toggled-off-by-default (creator opts in).
- **All other modules** — collapsed. Click to expand.

Each module row:

- Toggle (on/off)
- "Configure" link if the module has settings (opens a modal with the Zod-driven form)
- Drag-handle to reorder within its slot

Save persists the `theme_modules` array to the org row. Validates against the registry server-side.

### §19.8.5 Reset to defaults

Top-right "Reset to defaults" button on every tab. Confirms with a modal ("This will reset your storefront theme to the Blyss defaults. Your products, prices, and reviews are not affected."). Resets the relevant column (tokens / layout / modules) to the migration default.

## §19.9 Constraints — what themes cannot do

This list extends §15.4 and §3.5. If a future feature request would let any of these slip in, refuse it.

- **Custom CSS, custom HTML, or custom `<script>`.** Every customization is a typed value chosen from a registry. No exceptions.
- **Adding fonts outside the curated four.** No "upload your brand font". The four self-hosted fonts ship in the Blyss bundle — adding a fifth means a CSS bundle change and a design review.
- **Off-palette accents.** No hex picker. The eight palette options in §19.3.2 are the entire universe.
- **Editing the marketplace chrome.** Header, footer, cart drawer, search modal, sticky tabs — locked. The creator's theme tokens never bleed past the storefront body.
- **Per-product layout overrides.** A creator picks ONE layout for their whole storefront. No "this product has its own layout" until v4 minimum.
- **Subdomain hosting.** Creators stay at `/creators/{slug}`. Custom domains and subdomain hosting are post-v4.
- **Buyer-side theme switchers.** The buyer cannot toggle "dark mode" on someone else's storefront. A creator can choose dark mode IF we add a tokens.color_scheme = 'dark' option (out of scope until v3).
- **Theme imports / exports.** No "paste this JSON to copy your friend's theme". Don't add it.
- **Modules that fetch external scripts.** Every module renders from React components in our bundle. No `<script src="https://thirdparty">`.
- **Modules that touch order / payment / cart state.** Modules render product / creator data; they don't process payments, edit orders, or call mutation endpoints.
- **Themes that disable the review surface, the Tip button, or the Subscribe button.** These are marketplace contracts. A creator cannot hide them.

## §19.10 Migration & rollback

### §19.10.1 Default for existing creators

The migration sets every existing organization to:

```json
{ "theme_layout": "editorial",
  "theme_tokens": { "accent": "burnt-orange", "headline_font": "inter-display", "display_style": "editorial", "motion": "standard" },
  "theme_modules": [] }
```

This produces the exact same storefront rendering they have today. Zero visible change for opted-out creators.

### §19.10.2 Phased rollout per layout

New layouts (gallery, catalog, portfolio, studio) are added in v2 and v3. Each new layout gates behind a feature flag the operator flips:

- Phase A — staff orgs only (1 week of dogfood)
- Phase B — 5% of creators by `creator_category_slug` who match the layout's typical fit
- Phase C — GA, the layout appears in everyone's Layout tab

The `STOREFRONT_LAYOUTS` registry has every layout always in code; the dashboard tab filters which ones to show. Buyers don't see flag state — if a creator picked a flagged-off layout (e.g. as staff), buyers still get the rendered output.

### §19.10.3 Deprecating a layout

If we ship a layout and decide it doesn't earn its keep, the migration:

1. Mark it `'deprecated': true` in the registry.
2. Hide it in the Layout tab (existing pickers stay; new pickers don't see it).
3. Run a one-shot migration mapping deprecated → closest replacement (editorial is always the safe fallback).
4. Remove the layout component AFTER the column for every org has been migrated to a non-deprecated value.

### §19.10.4 Rollback per change

Theme changes are atomic — the `PATCH` endpoint either saves the whole new tokens / layout / modules object or none of it. There's no partial state to recover from.

For a creator who saves a regrettable change, the dashboard "Reset to defaults" button (§19.8.5) is the rollback path. We don't keep a per-creator history; that's optional v4 work.

## §19.11 Performance budget

Hard limits per storefront page:

- **Total JS shipped (gzip)** ≤ 280 KB (current editorial baseline ~240 KB; new layouts get 40 KB each max).
- **CSS shipped** ≤ 60 KB per page (Tailwind compiled subset + theme tokens; modules can each add ≤ 8 KB).
- **LCP** ≤ 2.0s on a Moto G5 + Slow 4G simulation.
- **CLS** ≤ 0.05.
- **TBT** ≤ 200ms.
- **Storefront-first-byte cache hit rate** ≥ 85% in steady state (driven by the `(slug, theme_version_hash)` cache).

A new layout / module that breaks any of these gates does not ship. The CI Lighthouse run blocks the PR.

## §19.12 Accessibility & SEO baselines

Every layout, every module, every token combination:

- Lighthouse accessibility ≥ 95.
- Lighthouse SEO ≥ 95.
- Lighthouse best-practices ≥ 95.
- All interactive elements have visible focus rings (the existing focus-ring styles use `--accent`, which becomes the creator's chosen accent — verified to pass contrast on every palette option in §19.3.2).
- All images have alt text or `role="presentation"`.
- `prefers-reduced-motion` collapses any layout's reveals/parallax/scroll-driven motion to instant.
- Server-rendered HTML works without JS (the JS layer adds polish only). Test with JS disabled; the storefront renders + the cart icon links to /cart.

OG / structured data (per §8 SEO):

- `Person` JSON-LD for the creator
- `Product` JSON-LD per product surfaced on the storefront
- `WebPage` JSON-LD with the canonical URL
- Theme choice does not affect any of these — they're built from the org + products data, not the theme.

## §19.13 Acceptance criteria

A creator can:

- [ ] Open `/dashboard/{org}/storefront/theme` from the dashboard nav.
- [ ] Pick any of the 8 palette accents and see the live preview update inside 1 second.
- [ ] Pick any of the 4 headline fonts and see the live preview update inside 1 second.
- [ ] Pick any non-deprecated layout and see the live preview update inside 2 seconds (layout JS lazy-load).
- [ ] Save the theme. Their public storefront updates within 60 seconds (cache TTL).
- [ ] Hit "Reset to defaults" and the storefront returns to the Blyss baseline within 60 seconds.
- [ ] Toggle a niche module on/off and see it appear/disappear in the preview.
- [ ] Configure a module's settings; invalid settings are rejected with a readable message.

A buyer can:

- [ ] Visit `/creators/{slug}` and see the creator's chosen theme — fonts, accent, layout.
- [ ] Click any product card and proceed through cart + checkout exactly as before. Theme does not affect cart, checkout, or confirmation.
- [ ] Click the Blyss header / footer / cart and see only Blyss tokens — never the creator's accent.
- [ ] Visit two different creators' storefronts and see two different themes; the marketplace chrome stays identical.
- [ ] Pass every Lighthouse gate from §19.11 / §19.12 on every layout.

A platform operator can:

- [ ] Add a new layout slug, register a component, and ship it behind a feature flag without migrating any data.
- [ ] Deprecate a layout via the migration in §19.10.3 without breaking creators on it.
- [ ] Watch storefront cache hit rates and per-layout LCP in the existing observability dashboard.

## §19.14 Rollout phases

### v1 — Tokens (1 week)

- Migration adds the three columns + `theme_version_hash`.
- Pydantic + Zod schemas for tokens.
- `<ThemeProvider>` component.
- Brand tab in the dashboard.
- Live preview iframe.
- Existing storefront becomes the `editorial` layout; all creators get default tokens; no buyer-visible change.

Ships ~1 week of focused agent work. Acceptance: creator can change accent + font + display_style + motion and see it on their public storefront.

### v2 — Layouts (3–4 weeks)

- Build `gallery` and `catalog` layouts.
- `STOREFRONT_LAYOUTS` registry with dynamic imports.
- Layout tab in the dashboard.
- Per-layout Lighthouse gates in CI.
- Migration: existing creators stay on `editorial`.
- Ship `gallery` first (highest demand from photographer creators); `catalog` second.

Acceptance: creator can pick a layout and their storefront renders with it. Performance budget holds.

### v3 — Niche modules (3–4 weeks)

- Module registry + slot system.
- Build `waveform_player`, `recipe_card`, `before_after_slider`, `curriculum_outline` (4 highest-leverage modules).
- Sections tab in the dashboard.
- Per-creator-category default suggestions.
- Module configuration form generation from Zod schemas.

Acceptance: a musician creator can enable `waveform_player` and their tracks render with playable waveforms. A cook creator can enable `recipe_card` and their recipes render structured.

### v4 — Layouts expansion + modules expansion (optional)

- `portfolio` and `studio` layouts.
- `palette_swatches`, `license_tier_picker`, `specimens` modules.
- Per-product theme overrides (one product, different layout).
- Drag-and-drop section ordering.

Optional. Driven by which v3 patterns earn use.

### Beyond v4 (out of scope for this plan)

- Custom domains for storefronts (`musician.blyss.co.ke` or `musician.com` mapped to `/creators/musician`).
- Theme A/B testing (run two themes for a creator, compare conversion).
- Per-creator dark mode.
- Editable component-level layouts (drag rows/columns).

These are real ideas. They are not in this plan. Re-evaluate after v3.

---

> **Reference DNA**: this spec is the bridge between §3 (the marketplace's locked design system) and the per-creator brand work that follows. Themes can extend the surface; they cannot rewrite the contract.

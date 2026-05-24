# §7 Dashboard — strip + redesign

> See also: [05-cleanup.md](./05-cleanup.md) (what's disabled), [04-ui-direction.md](./04-ui-direction.md) (visual rules), [07-pages.md](./07-pages.md) (public surface this borrows from)

The creator dashboard at `blyss.co.ke/dashboard` keeps Polar's functional skeleton. We do not rebuild the dashboard's data flows, queries, or page logic. We strip nav items that don't belong on a consumer marketplace, redesign the surface visually per §3, and rebrand any "Polar" references via §4.11.

## §7.1 Navigation strip

Polar's dashboard has a navigation tree built for SaaS developers. The full tree, before strip, lives in `clients/web/src/components/Dashboard/navigation.tsx`. Walk the tree and apply this strip list.

### Keep (creator marketplace surface)

```
Overview                            # creator earnings widget (rebuilt per §5.2)
Products
├── All products
├── Add product
└── Categories
Subscriptions
├── Active subscriptions
├── Tiers
└── Subscribers
Orders
Customers
Storefront
├── Profile (banner, avatar, bio, social links)
├── URL (handle / slug)
├── Featured products
└── Fundraising goal             # NEW per §5 pledge wiring
Discounts
Payouts
├── Balance
├── History
└── M-Pesa / Bank account
Newsletter                         # creator-to-fan emails via polar/newsletter/
Reviews                            # incoming reviews on products
Settings
├── Account (email, name, phone)
├── Notifications
└── Delete account
```

### Hide (developer/SaaS surface — these nav items are removed; underlying modules stay per §4.0)

```
Webhooks                           # outgoing webhook config (creators don't integrate)
API tokens                         # personal access tokens
OAuth apps                         # OAuth2 app management
GitHub integration                 # repo-as-benefit
License keys                       # software licenses
Meters                             # usage-based metering
Events                             # event ingestion
Custom fields (top-level)          # keep at the product-form level only
Sandbox                            # Polar's sandbox env switcher
Brand                              # Polar brand showcase page
Orbit                              # Polar Orbit design playground
Vision                             # Polar Vision careers page
Member model                       # B2B seat-based pricing toggle
Trial configuration               # SaaS trial settings (irrelevant for one-time digital + simple subs)
```

### Audit + decide

These exist in Polar's nav but their fit for a Kenyan creator marketplace is unclear. Audit each — if useful in v1, redesign per §3; if not, hide:

```
Benefits library                   # KEEP — needed for subscription perks (markdown content, files)
Checkout links                     # KEEP — they power buy.blyss.co.ke share-able URLs
Custom fields (per product)        # KEEP at the product form level only
Discounts                          # KEEP
Newsletter analytics               # KEEP if Polar has it; useful for creators
Tax forms / 1099                   # HIDE — US tax forms; Kenya has different requirements
EU VAT settings                    # HIDE
Account review / appeals           # KEEP — Polar's compliance workflow is still useful for moderation
```

### How to apply the strip

`clients/web/src/components/Dashboard/navigation.tsx` is a single file with a tree of nav definitions. Walk the tree, gate each entry behind a feature flag or just delete the entries from the tree:

- Preferred: delete entries directly. Cleaner code, no dead branches.
- Fallback: gate behind a `BLYSS_FEATURES` config object so we can flip features in v1.1 without code changes.

The corresponding `app/(main)/dashboard/{route}/page.tsx` files for hidden routes get deleted (per §4.5 frontend strip). Their data fetchers in `hooks/queries/{webhooks,license_keys,meters,events,oauth,personal_access_token}.ts` stay (they're data adapters; harmless).

## §7.2 Dashboard layout redesign per §3

The dashboard chrome (sidebar, top bar, content frame) follows §3 with adjustments for an info-rich workspace.

**Sidebar:**

- Width 260px on desktop, drawer on mobile
- Background `--surface` (slightly cooler than the marketplace `--background`)
- Logo wordmark + small "creator" badge top-left
- Nav items: 14px Inter weight 500, 36px height, `--text-secondary` default, `--text-primary` on hover/active, accent left-border 3px on active
- No icons next to most items (Linear-style restraint). Exceptions: Overview, Settings, the section dividers.
- Section dividers: small uppercase 10px tracked label in `--text-muted`
- Bottom: profile avatar + name + email + dropdown (View storefront, Sign out)
- No "Upgrade plan" CTA — Blyss is not a tiered SaaS

**Top bar:**

- 56px height, sticky
- Page title left, breadcrumb above (Inter 12px tracked uppercase muted)
- Right: search icon (opens command palette filtered to dashboard items), notifications bell, "View storefront" external-link button
- Hairline border-bottom — the only horizontal rule in the dashboard

**Content frame:**

- Max-width 1280px
- Padding 32px sides, 24px top
- Sections separated by `--surface-sunken` blocks, not by horizontal rules

**Density:**

- Tables: ample row height (56px+), no zebra-striping, no vertical lines, hover row gets `--surface-sunken` 50% opacity background
- Cards: `--surface-elevated` (white) on `--background`, no shadow, no border (the contrast does the work)
- Forms: vertical layout, generous label-input gap (8px), field groups separated by 32px, action buttons right-aligned in a sticky footer for long forms

## §7.3 Overview redesign — creator earnings widget

Replaces Polar's metrics overview (which is full of MRR / churn / customer LTV charts built for SaaS).

**Sections:**

1. **Greeting** — `Hello, {firstName}` in Inter Display 36px. One sentence under: *"Here's what's selling this week."*
2. **This month at a glance** — 4 stat boxes in a row:
   - Gross revenue (KSh, tabular)
   - Net after platform fee (KSh)
   - Orders count
   - Active subscriptions count
   Each box has the headline number in 32px tabular, label below in 12px muted, and a sparkline showing the last 30 days. No animated counters.
3. **Earnings chart** — single area chart, 30/90/365 day toggle, KSh on y-axis tabular, days on x-axis. Built with `recharts` (already a dep). No gradient fill — solid `--accent` at 12% opacity under the line.
4. **Recent orders** — last 5 orders with: product thumbnail, customer email partial (`s***@gmail.com` privacy), amount, date, status. Click row → order detail page.
5. **Onboarding checklist** (only if `creator_onboarding_state` not complete) — checklist of 6 onboarding steps with check marks, dismiss button.
6. **Active fundraising goal** (if creator has one) — progress bar widget, raised / target, `View on storefront`.

Data fetched server-side from the new `GET /api/v1/dashboard/creator/earnings-summary` endpoint (§5.2).

## §7.4 Product management redesign

Polar's product form is comprehensive and stays as-is structurally. Visual pass:

- Field groups: `Basics` (name, description, category) → `Media` (cover image, gallery) → `Pricing` (one-time / subscription, KES default) → `Files / Benefits` → `SEO` (slug, meta title, meta description) → `Visibility` (draft/published, featured)
- Markdown editor for description: use `@uiw/react-md-editor` or rebuild the existing editor with `react-markdown` preview
- File upload: drag-drop large area on `--surface-sunken`, file list below as typographic list (not grid of file icons)
- Pricing UI: clear toggle between one-time and subscription, subscription tier UI inherits from existing Polar pattern
- Benefit picker: shows existing benefits + "Create new benefit" inline modal. The custom (markdown) benefit is the primary type for subscription perks.
- Sticky save bar at bottom with `Save draft` / `Publish` / `Discard` and a `View live →` link when published

## §7.5 Subscriptions management

Polar already does this well. Visual pass + small additions:

- Tier list view: each tier as a row, not a card — name, price, subscriber count, action menu
- Tier detail: form for tier name, price, billing cycle, benefits attached
- Subscribers table: typographic, no zebra, columns email-partial, tier, started, next billing, status
- Cancel / refund a subscription: confirm modal with editorial copy, not "Are you sure?"

## §7.6 Storefront management

New section synthesizing what Polar split across "Profile" and "Settings":

- **Profile** — banner image (16:9), avatar (1:1), display name, handle (slug), bio (markdown, max 1000 chars), city
- **URL** — `blyss.co.ke/creators/{handle}` preview, change handle CTA (with redirect handling)
- **Featured products** — drag-to-reorder list of which products show first on the storefront
- **Fundraising goal** — one active goal at a time. Form: title, description, target amount (KSh), deadline. Toggle `Active` / `Paused`. Past goals archive below.
- **Social links** — Instagram, X, TikTok, YouTube, Discord (validated URLs only)

## §7.7 Payouts redesign

Critical for creator trust. Polar's payouts module already handles the data; redesign the UI.

- **Balance card** — large heading "Available to withdraw KSh X,XXX" in tabular nums, `Withdraw to M-Pesa` primary CTA
- **Schedule** — "Paid out automatically every Monday at 10:00 EAT" (or daily if creator opts in)
- **History table** — date, amount, method (M-Pesa / Bank), status, reference. Click row → payout detail with full breakdown.
- **M-Pesa setup** — phone number (verify via STK Push), name (matched to Paystack subaccount). Edit triggers re-verification.

## §7.8 Reviews

Creators see incoming reviews on their products. Polar's reviews module supplies the data.

- Tabs: `All` / `Needs response` / `Negative` (1-3 stars)
- Each review: product thumbnail, customer email partial, star rating, review text, date, `Reply` button
- Replies are public on the product page

## §7.9 Settings — pruned

Keep:

- Account (email, password / magic-link toggle, name, phone)
- Notifications (email frequency for: new orders, new subscribers, refunds, payouts)
- Delete account

Hide (per §7.1):

- API tokens / personal access tokens
- OAuth apps
- Webhooks
- GitHub integration
- Sandbox toggle
- Tax / 1099 forms
- EU VAT
- Custom domain (v1.1 feature)
- Member model

## §7.10 Brand consistency in dashboard

Per §4.11, all "Polar" references in the dashboard get replaced. Specific files to audit when stripping:

- `components/Organization/Footer.tsx` — 8 Polar references
- `components/Settings/...` — copy mentions Polar in several places
- `components/Onboarding/IntegrateStep.tsx` — entire file goes (Polar developer onboarding)
- Any `<Helmet>` / `<title>` strings

Run the existing rebrand property test after the pass:

```bash
cd clients/web
pnpm test brand-text-replacement
```

Zero "Polar" hits in user-facing strings.

## §7.11 Acceptance for §7

The dashboard is done when:

- [ ] Walking the sidebar reveals no developer/SaaS items (no Webhooks, no Meters, no API tokens, no OAuth, no GitHub, no Sandbox, no License Keys, no Brand/Orbit/Vision)
- [ ] Every page hit returns either a redesigned UI or a 404 — no half-redesigned half-Polar pages
- [ ] Overview shows creator earnings (KSh, tabular), not SaaS MRR
- [ ] Product form, subscription tier form, payouts table, customers list — all match §3 anti-pattern checklist
- [ ] Lighthouse on `/dashboard/overview`: Accessibility ≥ 95, Performance ≥ 85 (dashboard is allowed lower perf than the public site since it's behind auth)
- [ ] Brand-text rebrand test passes
- [ ] A creator can complete their onboarding (§6.10) and add their first product end-to-end without hitting a Polar-branded screen

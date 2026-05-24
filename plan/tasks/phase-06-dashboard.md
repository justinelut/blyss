# Phase 6 — Dashboard strip + redesign

> Plan refs: [§7 dashboard](../08-dashboard.md). Goal: dashboard feels like ecommerce, not SaaS billing. Polar's data flows kept, surface redesigned.

Run alongside late phase 5. Each redesigned section follows §3 + §6.0 component principle.

## 6.1 Navigation strip (§7.1)

- [ ] **6.1.1 Walk `Dashboard/navigation.tsx` and apply Keep / Hide / Audit lists from §7.1**
  - Acceptance: sidebar shows only the §7.1 keep tree

- [ ] **6.1.2 Confirm hidden routes return 404**
  - Acceptance: navigating to `/dashboard/webhooks`, `/dashboard/api-tokens`, etc. returns 404 (or redirect to overview)

- [ ] **6.1.3 Redesign sidebar visual per §7.2**
  - 260px width, `--surface` background, Inter 14px nav items, accent left-border on active
  - Section dividers use 10px tracked uppercase labels in `--text-muted`
  - Profile dropdown bottom-left with View storefront + Sign out
  - No "Upgrade plan" CTA
  - Acceptance: sidebar matches §7.2 spec; visual regression captured

- [ ] **6.1.4 Redesign top bar per §7.2**
  - 56px height, page title + breadcrumb, search icon (command palette), notifications bell, "View storefront" external-link button
  - Hairline border-bottom only
  - Acceptance: matches §7.2

## 6.2 Overview / earnings (§7.3)

- [ ] **6.2.1 Build `EarningsOverview` page**
  - Replaces Polar's metrics overview entirely
  - Sections: Greeting + This Month at a Glance (4 stat boxes) + 30/90/365 earnings chart + Recent orders + Onboarding checklist + Active fundraising goal widget
  - Acceptance: page renders with real seed data; KSh tabular numerals

- [ ] **6.2.2 Add `GET /api/v1/dashboard/creator/earnings-summary` backend endpoint**
  - Aggregates from existing `polar/order/`, `polar/payout/`, `polar/subscription/`
  - Returns: { gross_this_month, net_this_month, orders_count, active_subs_count, sparkline_30d }
  - Acceptance: endpoint returns valid JSON; covered by a backend test

- [ ] **6.2.3 Build the sparkline + earnings chart with `recharts`**
  - Single area chart, solid `--accent` 12% opacity fill, no gradient
  - Acceptance: chart renders 30 days of data

- [ ] **6.2.4 Build the onboarding checklist component**
  - Reads `creator_onboarding_state` (phase 7 task 7.4)
  - Shows on overview only when not complete
  - Acceptance: checklist disappears once onboarding complete

## 6.3 Product management (§7.4)

- [ ] **6.3.1 Visual pass on existing `Products/ProductForm.tsx`**
  - Field groups: Basics → Media → Pricing → Files/Benefits → SEO → Visibility per §7.4
  - Sticky save bar at bottom: Save draft / Publish / Discard / View live
  - Acceptance: form still works (no data loss); matches §3 component rules

- [ ] **6.3.2 Replace markdown editor for product descriptions**
  - Use `@uiw/react-md-editor` or rebuild on `react-markdown` with split preview
  - Acceptance: editor renders, preview updates, output is sanitizable markdown

- [ ] **6.3.3 Redesign file upload area**
  - Drag-drop large area on `--surface-sunken`, file list as typographic list
  - Acceptance: matches §7.4 spec

- [ ] **6.3.4 Redesign `EditProductPage.tsx` and `CreateProductPage.tsx`**
  - Same layout, applied palette + typography
  - Acceptance: forms work end-to-end

- [ ] **6.3.5 Redesign products list page**
  - `ProductListItem` rows with thumbnail, name, status, price, action menu
  - No table borders, no zebra
  - Acceptance: list renders; matches §3

## 6.4 Subscriptions (§7.5)

- [ ] **6.4.1 Redesign tier list view** — rows not cards
- [ ] **6.4.2 Redesign tier detail/edit form** — inherits product form pattern
- [ ] **6.4.3 Build subscribers table** — typographic, no zebra
- [ ] **6.4.4 Redesign cancel subscription flow** — editorial confirm modal
- [ ] **6.4.5 Verify markdown benefit editor for tier perks** — uses same markdown editor as 6.3.2

## 6.5 Storefront management (§7.6)

- [ ] **6.5.1 Build `Storefront/Profile` page** — banner upload + avatar + display name + handle + bio + city
- [ ] **6.5.2 Build `Storefront/URL` page** — handle preview + change CTA + redirect handling
- [ ] **6.5.3 Build `Storefront/Featured` page** — drag-to-reorder featured products list
- [ ] **6.5.4 Build `Storefront/FundraisingGoal` page** — one active goal at a time, archive of past goals (depends on phase 7 task 7.2)
- [ ] **6.5.5 Build `Storefront/Social` page** — Instagram + X + TikTok + YouTube + Discord URL inputs

## 6.6 Payouts (§7.7)

- [ ] **6.6.1 Redesign balance card** — large heading + Withdraw to M-Pesa CTA
- [ ] **6.6.2 Build payout history table** — typographic, no zebra, click row → detail
- [ ] **6.6.3 Redesign M-Pesa setup form** — phone + name verification via STK push
- [ ] **6.6.4 Show payout schedule** — "Paid out automatically every Monday at 10:00 EAT"

## 6.7 Reviews (§7.8)

- [ ] **6.7.1 Build reviews list with tabs** — All / Needs response / Negative
- [ ] **6.7.2 Build review reply UI** — public reply on product page
- [ ] **6.7.3 Wire reply submission via existing `polar/review/` endpoints**

## 6.8 Settings (§7.9)

- [ ] **6.8.1 Redesign Account settings page** — email + name + phone + magic-link toggle
- [ ] **6.8.2 Redesign Notifications settings page** — frequency for: new orders, new subs, refunds, payouts
- [ ] **6.8.3 Redesign Delete account flow** — confirm modal with editorial copy

## 6.9 Brand consistency (§7.10)

- [ ] **6.9.1 Sweep dashboard for "Polar" references**
  - `grep -rn '"Polar"\|polarsource' clients/web/src/app/(marketplace)/dashboard/` and `components/`
  - Replace all
  - Acceptance: brand-text-replacement test passes

- [ ] **6.9.2 Audit `Organization/Footer.tsx`** — 8 known Polar references; replace
- [ ] **6.9.3 Audit `Settings/...` copy** — replace any Polar mentions

## Acceptance for phase 6

- [ ] Sidebar shows only §7.1 keep items
- [ ] Every dashboard page hit returns either a redesigned UI or 404
- [ ] Overview shows creator earnings (KSh, tabular), no SaaS MRR
- [ ] Product / subscription / payouts / storefront forms all redesigned per §3
- [ ] Lighthouse on `/dashboard/overview`: Accessibility ≥ 95, Performance ≥ 85
- [ ] Brand-text rebrand test passes
- [ ] A creator can complete onboarding (§6.10) and add their first product end-to-end without hitting a Polar-branded screen

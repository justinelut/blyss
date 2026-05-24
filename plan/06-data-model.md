## §5 Data model changes

The Polar data model is mostly correct for a marketplace. We make four targeted changes.

### §5.1 Subscription perks via the existing markdown benefit

**No new benefit type.** We use Polar's existing `benefit` system with the `custom` type, which already supports markdown content per benefit. A creator selling a TikTok-perk subscription does this:

1. Creates a Subscription product in their dashboard
2. Adds a `custom` benefit with a markdown body containing the perk content:
   ```markdown
   ## Welcome to Tier 1

   Here are this month's exclusives:

   - [Behind the scenes — TikTok video](https://www.tiktok.com/@creator/video/123)
   - [Drive folder with raw files](https://drive.google.com/...)
   - [Discord access](https://discord.gg/...)
   - [Notion knowledge base](https://www.notion.so/...)
   ```
3. Subscribers see the rendered markdown in the customer portal at `my.blyss.co.ke` once their subscription is active.

The marketplace renders markdown safely with `react-markdown` + `remark-gfm`, sanitized through `rehype-sanitize` to allow only: paragraphs, headings, bold/italic, lists, links (with `rel="noopener noreferrer"`), blockquotes, horizontal rules, inline code. **No raw HTML, no script tags, no iframes.** Creators get a rich-text editor in the dashboard that produces this markdown.

The customer portal hides perk content behind subscription status. If the subscription is `cancelled` or `past_due`, the perk content is replaced with an upsell to renew.

**Why this works:** Polar's `benefit` system already handles grant/revoke lifecycle, joins to subscriptions, joins to orders, customer portal display logic, webhook events on grant/revoke. We don't write new code; we lean on what's there.

### §5.2 Creator earnings widget data

The creator dashboard needs an earnings widget (replaces Polar's metrics overview). The data already exists in:

- `polar/order/` — orders + creator payout amounts (the Paystack integration already added `creator_payout_amount` to `orders`)
- `polar/account/` and `polar/payout/` — payout schedule and history
- `polar/subscription/` — recurring revenue

We add **no new tables**. We add **one new endpoint**: `GET /api/v1/dashboard/creator/earnings-summary` that aggregates the existing data into the shape the widget needs (this month's gross, this month's net after platform fee, last payout, next payout date). Polar's `metrics` module gives us most of the SQL primitives.

### §5.3 Hide developer features cleanly

Per §4.4 we don't delete code; we disable inbound traffic. Specifically:

- Remove disabled module router includes from `polar/api.py`
- Comment out their scopes in `polar/auth/scope.py` (don't delete — keeps types intact if any code path still references them)
- Hide their UI from the creator dashboard nav (§7)
- Leave their tables in place. Empty tables cost nothing. Dropping them risks foreign-key cascades through `polar/order/`, `polar/subscription/`, `polar/webhook/`. Defer to v2.

### §5.4 New table: `creator_onboarding_state`

Polar's onboarding tracks "have you connected Stripe / GitHub / created a product / verified email." We rebuild it for a creator: "have you set up M-Pesa / verified phone / set up payouts / created your first product / customized your storefront URL."

A small new table keyed by `organization_id` with boolean columns for each step + a `completed_at` timestamp. Simpler than Polar's existing onboarding state which is scattered across multiple models. The dashboard's checklist component reads this. (We could also do this without a new table by checking the underlying conditions directly, but a denormalized state row makes the checklist a single fast query.)

This is the one new table we add.

### §5.5 Existing marketplace tables (already there, no changes)

These were added in `2026-03-20-0415_add_marketplace_features.py` and just need to be active:

- `cart_items`
- `product_categories`
- `product_category_assignments`
- `product_reviews`
- `product_views`
- `wishlist_items`
- `product_cart_events`
- `donations`
- `newsletter_subscriptions`

All keep.

### §5.6 Search vectors

Polar's search uses `tsvector` columns on `products`, `organizations`, `benefits`. The `search_vectors_backfill.py` script populates them. After cleanup, run it once to reindex. Add a Postgres trigger so new/updated products auto-update their search vector — Polar may already do this; verify in `polar/search/` and add the trigger if missing.

---

> **End of chunk 2.** Chunks 3–6 to follow: page-by-page spec for the public marketplace, dashboard pruning + cross-cutting concerns, deployment + testing, references + skills.

---


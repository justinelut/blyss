# Phase 7 — Data model additions

> Plan refs: [§5 data model changes](../06-data-model.md). Goal: pledge → fundraising goals; new `creator_onboarding_state` table; markdown benefit perks ready.

Can run in parallel with phases 5 and 6 once phase 3 is done. Each task is a small, testable migration.

## 7.1 Subscription perks via markdown benefit (§5.1)

- [ ] **7.1.1 Confirm Polar's `custom` benefit type supports markdown content**
  - Inspect `polar/benefit/` types — verify the custom benefit has a `content` text field
  - Acceptance: model field exists; documented

- [ ] **7.1.2 Build `MarkdownBenefit` rendering component**
  - Already specced in phase 4 task 4.13 (`LegalDoc` is the same renderer)
  - Use it for benefit content on product detail (§6.5 Benefits tab) and customer portal (§6.8 subscription detail)
  - Acceptance: a creator can add markdown to a custom benefit, and a subscriber sees it rendered safely

- [ ] **7.1.3 Build creator-side markdown editor for benefits**
  - In `Benefit/CreateBenefitModalContent.tsx` and `UpdateBenefitModalContent.tsx`, replace any plain text with the markdown editor (same as phase 6 task 6.3.2)
  - Acceptance: creator can write markdown with link autocomplete

- [ ] **7.1.4 Hide perk content for inactive subscribers**
  - In customer portal subscription detail, gate the markdown rendering on subscription status
  - Show upsell-to-renew when status is `cancelled` or `past_due`
  - Acceptance: cancelled subscriber sees the upsell, not the markdown

## 7.2 Pledge → fundraising goals (§5 §4.4 Step 6)

- [ ] **7.2.1 Create `creator_fundraising_goals` table migration**
  - Columns: `id`, `organization_id`, `title`, `description`, `target_amount`, `currency`, `deadline`, `raised_amount` (cached), `state` (active/paused/completed/cancelled), `created_at`, `updated_at`
  - `uv run alembic revision -m "add_fundraising_goals"`
  - Acceptance: migration applies cleanly

- [ ] **7.2.2 Add `goal_id` foreign key to `pledges` table**
  - Same migration or separate; nullable (existing pledges have no goal)
  - Acceptance: migration applies; old pledges still work

- [ ] **7.2.3 Add `polar/fundraising/` module**
  - Or extend `polar/pledge/` with goal endpoints
  - CRUD: `POST /v1/fundraising-goals/`, `GET /v1/fundraising-goals/{id}`, `PATCH /v1/fundraising-goals/{id}`
  - Acceptance: endpoints reachable; backend test passes

- [ ] **7.2.4 Wire goal selection into pledge create flow**
  - When pledger selects a goal, pledge is created with `goal_id` set
  - On successful pledge, `goals.raised_amount` is incremented in a transaction
  - Acceptance: pledging to a goal increments raised_amount

- [ ] **7.2.5 Build creator-side goal management UI** (depends on phase 6 task 6.5.4)
  - Form: title + description + target + deadline + active/paused toggle
  - Past goals archive
  - Acceptance: creator can create a goal, pause it, complete it

- [ ] **7.2.6 Build storefront goal widget** (depends on phase 5 task 5.4.7)
  - Renders on `/creators/[slug]` if creator has an active goal
  - Progress bar with raised / target / % / Contribute CTA
  - Click Contribute → `buy.blyss.co.ke/pledge/[id]` flow
  - Acceptance: visiting a creator with active goal shows the widget; contribute flow completes a pledge

- [ ] **7.2.7 Build pledge checkout flow at `buy.blyss.co.ke/pledge/[id]`**
  - Amount picker + email + phone + Paystack pay
  - On success: pledge marked completed, goal raised_amount updated, redirect to confirmation
  - Acceptance: contributor can pledge end-to-end

## 7.3 Hide developer features cleanly (§5.3)

- [ ] **7.3.1 Confirm phase 3 work intact**
  - `grep -rn 'meter\|license_key\|oauth2_app' polar/api.py` — only commented-out
  - Acceptance: routes still 404

- [ ] **7.3.2 Empty tables stay**
  - No DROP TABLE migrations
  - `\dt` in psql still shows the disabled tables
  - Acceptance: schema introspection still complete

## 7.4 Creator onboarding state table (§5.4)

- [ ] **7.4.1 Create `creator_onboarding_state` table migration**
  - Columns: `id`, `organization_id` (FK + unique), `step_handle_set` (bool), `step_category_set` (bool), `step_storefront_set` (bool), `step_payout_set` (bool), `step_first_product_published` (bool), `completed_at` (nullable timestamp), `updated_at`
  - Acceptance: migration applies

- [ ] **7.4.2 Add backend service `polar/creator_onboarding/`**
  - `get_state(organization_id) -> dict`, `mark_step_complete(organization_id, step)`, `is_complete(organization_id) -> bool`
  - Endpoints: `GET /v1/onboarding/state`, `POST /v1/onboarding/steps/{step}/complete`
  - Acceptance: endpoints work; backend test passes

- [ ] **7.4.3 Wire onboarding state into `/start` flow** (depends on phase 5 task 5.10.8)
  - Each step completion calls the API
  - Acceptance: progressing through onboarding updates state; refresh resumes where left off

- [ ] **7.4.4 Wire onboarding checklist on dashboard overview** (depends on phase 6 task 6.2.4)
  - Reads state, shows incomplete steps with click-to-resume links
  - Hides itself when complete
  - Acceptance: checklist updates as steps complete

## 7.5 Search vector reindex (§5.6)

- [ ] **7.5.1 Verify Polar's `polar/search/` triggers**
  - Check `tsvector` columns on `products`, `organizations`, `benefits` exist with auto-update triggers
  - If triggers missing, add via migration
  - Acceptance: editing a product updates its `search_vector` automatically

- [ ] **7.5.2 Run `search_vectors_backfill.py`**
  - One-time backfill for any rows missing vectors after migration
  - Acceptance: `SELECT count(*) FROM products WHERE search_vector IS NULL` returns 0

- [ ] **7.5.3 Verify search relevance**
  - Search "ebook" should return ebook products before others
  - Search by creator name should return their products
  - Acceptance: top 5 results match human expectation on 5 sample queries

## Acceptance for phase 7

- [ ] Markdown benefit perks render safely for active subscribers; gated for inactive
- [ ] Creators can create, edit, pause, complete fundraising goals
- [ ] Goal contributions go through Paystack; raised_amount updates in real-time
- [ ] Creator onboarding state persists across sessions
- [ ] Dashboard checklist reads state and updates as steps complete
- [ ] Postgres FTS triggers active; backfill ran successfully
- [ ] All new endpoints have backend tests
- [ ] Single new table (`creator_onboarding_state`) + one fundraising migration applied; no other schema changes

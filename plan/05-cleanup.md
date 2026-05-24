## §4 Aggressive cleanup — what gets deleted

This section is a delete list. Every path here is removed before any new code is written. The goal is to strip the repo from "Polar fork with marketplace bolted on" to "Blyss marketplace, lean."

### §4.0 Cleanup principle: never break what Polar built

The Polar engineers thought their architecture through carefully. Deleting backend modules cascades — `polar/api.py` imports them, `polar/auth/scope.py` defines their scopes, `polar/order/` and `polar/subscription/` may reference their models, `polar/webhook/` emits their events. Aggressive backend deletion breaks the dependency graph and the app crashes at boot.

**The rule for backend modules:**

- We **disable** routes by removing them from `polar/api.py`'s router includes.
- We **hide** UI surface by removing dashboard nav items and routes.
- We **skip** scopes from auth dependencies so endpoints, even if mounted, are not reachable.
- We **leave the module folders, models, services, and migrations in place.** Their tables stay. Their code stays. They just have no inbound traffic.

This is a one-day cleanup that ships safely. A future v2 can do proper module excision once we confirm nothing else depends on them.

**The rule for frontend, top-level files, docs, marketing routes, and infrastructure:**

- Aggressive deletion is fine. Next.js routes are independent. Top-level marketing files and infra folders have no runtime dependency on the API. Delete freely.

**The rule for the Polar backoffice:**

- **Do not touch.** Leave it where Polar mounted it, leave its UI, leave its routes. It's an internal ops tool the engineers designed for themselves; it works; we use it as-is.

### §4.1 Top-level directories to delete entirely

```
terraform/                          # multi-cloud IaC, not needed for single-server K3s
oracle/                             # 5-instance Tailscale setup, replaced by single-server
docs/                               # Mintlify docs site for Polar's API consumers; not user-facing
handbook/                           # internal Polar handbook
lambda/                             # AWS Lambda image-resizer; replaced by next/image + sharp
infra/                              # Tailscale Render configs
sdk/                                # generated SDK overlays, not used in monorepo deploy
marketplace-design-system/          # old HTML mockups (kept as reference earlier; superseded by §3 + §6)
.kiro/                              # entire spec folder; this plan supersedes all 6 specs
.agents/                            # stale agent skill folder (Polar internal)
.claude/                            # Claude-specific config and hooks (Polar internal)
.devcontainer/                      # dev container config; we use local Docker
.zed/                               # Zed editor config
.github/mcp/                        # old chrome-devtools MCP config; we re-add MCPs in Appendix B
```

### §4.2 Top-level files to delete

```
MARKETPLACE_MIGRATION_SUCCESS.md    # one-off migration log
VERCEL_BUILD_FIX.md                 # one-off bug log
CLAUDE.md                           # Polar's CLAUDE config
CONTRIBUTING.md                     # Polar contribution guidelines
CODE_OF_CONDUCT.md                  # Polar CoC; replace with simple Blyss CoC at launch if needed
DEVELOPMENT.md                      # superseded by §10 Local Dev Workflow
SECURITY.md                         # Polar-specific security policy
LICENSE                             # Polar's Apache 2.0; replace with our own (Apache 2.0 OK to keep, but our copyright)
README.md                           # rewrite to point at this plan and a one-line "what is Blyss"
app.json                            # Heroku button config
conductor.json                      # Conductor agent config
Brewfile                            # macOS brew bundle, Polar dev convenience
flake.nix / flake.lock              # Nix dev env, Polar internal
polar.code-workspace                # VS Code workspace pointing at old Polar layout
pyrightconfig.json                  # move into server/ (it references old paths)
.terraformignore                    # terraform is gone
.editorconfig                       # keep
.gitignore                          # keep, audit for stale entries (oracle/, terraform/ etc.)
.nvmrc                              # keep
```

After §4.1 and §4.2 the repo root contains only:

```
.editorconfig
.gitignore
.github/                # workflows, issue templates (audit and prune)
.nvmrc
.vscode/                # keep (it's user-tuned, not Polar)
README.md               # rewritten, one screen
plan.md                 # this document
clients/                # Next.js app, restructured per §4.5
server/                 # Polar API, restructured per §4.4
k8s/                    # NEW — manifests added in §11
dev/                    # local dev tooling (kept, audited)
```

### §4.3 GitHub Actions workflows — delete all 11, replace with one

The 11 existing workflows under `.github/workflows/` are all Oracle/Tailscale deployment plumbing for the old 5-instance setup:

```
check-server-logs.yml
quick-fix-minio.yml
minio-console-access.yml
deploy-backend.yml
setup-minio-api-subdomain.yml
grant-admin-access.yml
minio-test-connectivity.yml
fix-backend-config.yml
diagnose-backend.yml
check-upload-flow.yml
configure-minio-complete.yml
```

Delete all. Replace with a single `deploy.yml` (spec in §11). Keep `dependabot.yml` and the `ISSUE_TEMPLATE/` folder. Audit `.github/actions/maintenance-mode/` — keep only if we use it.

### §4.4 Backend: disable routes and hide UI, don't delete modules

Per §4.0, we don't delete backend module folders. We make their endpoints unreachable and their UI invisible.

**Step 1 — Remove from public API router (`server/polar/api.py`)**

Open `polar/api.py` and remove the `include_router` calls for these modules. The folders stay; the routes simply aren't mounted:

```
polar/license_key/                  # software license keys (developer benefit)
polar/meter/                        # usage-based metering
polar/customer_meter/               # per-customer usage tracking
polar/event/                        # ingestion events
polar/event_type/                   # event type definitions
polar/external_event/               # external event ingestion
polar/oauth2/                       # OAuth2 app registration (developer feature)
polar/personal_access_token/        # API tokens for developers
polar/organization_access_token/    # org-level API tokens
polar/billing_entry/                # usage-based billing entries
polar/customer_seat/                # B2B seat-based pricing
polar/integrations/github/          # GitHub OAuth + repo benefits
polar/processor_transaction/        # Stripe processor transaction model
```

**Step 2 — Hide UI surface (`clients/web/src/components/Dashboard/navigation.tsx`)**

Remove the nav entries for: license keys, meters, events, OAuth apps, access tokens, webhooks, GitHub integration. Spec in §7.

**Step 3 — Strip scopes from auth dependencies**

In `polar/auth/scope.py`, comment out the developer-only scopes: `meters_read`, `meters_write`, `events_read`, `events_write`, `customers_read` (keep this — marketplace needs it), `oauth2_apps_*`, `personal_access_tokens_*`, `organization_access_tokens_*`. We don't delete the constants — keeps the type system happy if anything still references them.

**Step 4 — `polar/integrations/loops/` (Loops.so email marketing)**

KEEP and use. Two-provider strategy:

- **Resend** — transactional only. Magic-link emails, order receipts, payout notifications, refund confirmations, password-style flows. Fast, low-volume, free up to 3k/day.
- **Loops** — marketing only. Welcome series for new creators, creator newsletters to their subscribers, platform broadcasts, lifecycle campaigns ("you haven't published a product in 30 days"), customer re-engagement. Loops handles audience segmentation, A/B variant copy, and visual templating that Resend doesn't.

Polar's existing `polar/integrations/loops/` module already syncs creator/customer data into Loops. Leave the module wired. Set `LOOPS_API_KEY` in `.env`. The marketing surface is added in v1.1; for v1 we just keep the sync running so audiences exist when we start sending.

**Step 5 — `polar/integrations/stripe/`**

Polar's Paystack integration was built next to Stripe, not as a replacement. The Stripe code is heavily wired into `polar/checkout/`, `polar/payment/`, `polar/order/`, `polar/refund/`, `polar/subscription/`, `polar/dispute/`, `polar/transaction/`, `polar/account/`. **Leave Stripe code in place.** The marketplace UI never calls Stripe routes; Paystack is the only payment route exposed at `buy.blyss.co.ke`. Removing Stripe is a v2 task.

**Step 6 — `polar/pledge/` — wire to donations + fundraising goals**

KEEP and use. Polar's `pledge/` module already implements the pledge lifecycle (created, pending, charge, refund, dispute), pledge-to-issue mapping, and email notifications. We repurpose it as **fundraising goals**:

- A creator can attach a fundraising goal to their storefront: *"Help me buy a new mic — KSh 50,000 goal"* with a target amount, a deadline, and a one-paragraph description.
- Visitors contribute via the existing pledge flow (Paystack-powered).
- A goal renders on `/creators/[slug]` as a horizontal progress bar with the raised amount in tabular numerals, the goal, % funded, and a `Contribute` button (opens an amount picker and takes the visitor through `buy.blyss.co.ke/pledge/[id]`).
- `polar/donation/` keeps handling one-off tips (non-goal-tied). Pledge handles goal-tied recurring + one-off contributions.
- A creator can have at most one active fundraising goal at a time. Past goals stay visible as a "supported by N people" archive.

Schema reuse: pledge already has `amount`, `currency`, `state`, `pledger_email`, `created_at`. Add a single column to `pledges` (`goal_id` foreign key) and a new tiny table `creator_fundraising_goals` (id, organization_id, title, description, target_amount, deadline, raised_amount cached, state). One migration. UI in §6.4 (creator storefront) and §7 (dashboard).

**Step 7 — `polar/integrations/aws/`**

Verify if it's used for `polar/file/` storage. If `polar/file/` already supports an S3-compatible adapter that talks to MinIO directly without the AWS integration, we ignore aws/. If file storage routes through `integrations/aws/`, we point its config at MinIO instead (MinIO is S3-compatible). Either way, the module folder stays.

**Step 8 — `polar/integrations/discord/`**

Stays. Used as a perk benefit type via markdown links. We don't need its OAuth flow exposed in dashboard, but the code is fine to leave dormant.

**Step 9 — `polar/customer_portal/`**

Keep entirely. We redesign the UI per §6.8 but don't touch backend logic.

**Step 10 — Migrations**

We do **NOT** drop tables. Empty tables cost nothing on Postgres and dropping them risks foreign-key cascade surprises. They stay. The single new migration we write is for `creator_onboarding_state` (§5.4).

**Backend modules we keep and use unchanged (just listing for clarity):**

```
polar/account/          polar/auth/             polar/benefit/
polar/cart/             polar/category/         polar/checkout/
polar/checkout_link/    polar/customer/         polar/customer_portal/
polar/customer_session/ polar/discount/         polar/dispute/
polar/donation/         polar/email/            polar/email_update/
polar/file/             polar/held_balance/     polar/invoice/
polar/kit/              polar/login_code/       polar/member/
polar/member_session/   polar/metrics/          polar/middlewares.py
polar/models/           polar/newsletter/       polar/notification_recipient/
polar/notifications/    polar/order/            polar/organization/
polar/organization_review/ polar/payment/       polar/payment_method/
polar/payout/           polar/pledge/           polar/postgres.py
polar/product/          polar/redis.py          polar/refund/
polar/review/           polar/search/           polar/sentry.py
polar/subscription/     polar/tasks.py          polar/tax/
polar/transaction/      polar/user/             polar/user_organization/
polar/wallet/           polar/webhook/          polar/wishlist/
polar/integrations/paystack/   # primary payment
polar/integrations/sentry/     # error tracking
polar/integrations/posthog/    # analytics
```

### §4.5 Frontend strip (in `clients/web/src/`)

**Routes to delete (`app/(main)/`):**

```
(website)/(landing)/blog/           # Polar marketing blog
(website)/(landing)/customers/      # Polar case studies
(website)/(landing)/downloads/      # Polar app downloads page
(website)/(landing)/features/       # Polar feature marketing pages (products, customers, finance, benefits, analytics, usage-billing — entire folder)
(website)/(landing)/resources/      # Polar resources (why, comparison, pricing, merchant-of-record)
(website)/(landing)/company/        # Polar about + investors
(website)/(landing)/(mdx)/          # MDX legal/blog pages
(main)/brand/                       # Polar brand showcase
(main)/orbit/                       # Polar Orbit design system playground
(main)/help/                        # Polar's help page (rebuild simpler in §6)
(main)/start/                       # Polar's get-started landing
(main)/onboarding/                  # rebuild from scratch as creator onboarding (§6.10)
api/cover/                          # OG image API for blog posts (irrelevant)
api/og/                             # rebuild for marketplace OG (§8 SEO)
```

**Components to delete (`components/`):**

```
Brand/                              # entire — Polar brand site components
Vision/                             # entire — Polar Vision careers page
Landing/                            # entire — Polar marketing landing components
                                    # (Adapters, BillingDiagram, Comparison, CreatorsSection,
                                    # Features, Hero, Logos, NavPopover, Products, Resources,
                                    # Testimonials, Vision, billing, comparison, features,
                                    # molecules, products, resources)
MDX/                                # MDX wrappers for Polar blog
Search/OmniSearch.tsx               # rebuild simpler for marketplace product search (§6.9)
Benefit/MeterCredit/                # meter credits benefit type
Benefit/LicenseKeys/                # license keys benefit type
Benefit/Downloadables/              # KEEP — file downloads benefit (rename to Files for clarity)
Meter/                              # entire
Events/                             # entire
CheckoutLinks/                      # rebuild leaner; current version is over-featured
Settings/Webhook/                   # webhook UI (creators don't need this)
Settings/OAuth/                     # OAuth app management (developer feature)
Settings/AccessTokenSettings.tsx    # API tokens
Settings/OrganizationAccessTokensSettings.tsx
Onboarding/v2/                      # Polar's AI-led developer onboarding; rebuild simpler for creators
Onboarding/AssistantStep.tsx        # AI assistant onboarding step
Onboarding/IntegrateStep.tsx        # developer integration step
Onboarding/ToolCallGroup.tsx        # tool calls UI
DashboardOverview/                  # SaaS metrics dashboard; rebuild as creator earnings widget (§7)
Metrics/                            # SaaS metric chart components; keep some basics for creator earnings
CustomFields/                       # keep for product detail fields
Sandbox/                            # Polar sandbox banner; remove
Customer/CustomerEventsView.tsx     # event-based customer activity (removed with events/)
Customer/CustomerUsageView.tsx      # meter usage view
Customer/CustomerMeter.tsx          # meter UI
```

**Components to keep, redesign per §3:**

```
Marketplace/                        # rebuild every component (HeroSection, ProductCard, CreatorCard, FilterSidebar, SearchBar, ProductGrid, CurrencyDemo)
Browse/                             # rebuild
Cart/                               # rebuild visually, keep store logic
Wishlist/                           # rebuild visually
Creators/                           # rebuild (CreatorsDirectory, StorefrontHero, StorefrontTabs, CreatorCard, FeaturedSpotlight, etc.)
CreatorStorefront/                  # rebuild (HeroBanner, ProductsGrid, ProfileHeader, SubscriptionTiers, TabsNavigation, ReviewSection)
Product/                            # rebuild (ProductDetailView, ProductImageGallery, RelatedProducts)
Products/                           # keep ProductForm, EditProductPage, etc. for creator dashboard; redesign UI per §3
Review/                             # rebuild
Newsletter/                         # rebuild
Donation/                           # rebuild (tip jar UX)
Category/                           # rebuild (CategoryNavigation)
Checkout/                           # rebuild visually, keep payment logic; this powers buy.blyss.co.ke (§6.7)
CheckoutStatus/                     # rebuild
PaymentStatus/                      # rebuild
CustomerPortal/                     # rebuild visually, keep logic; this powers my.blyss.co.ke (§6.8)
Layout/Header.tsx                   # already rebuilt with "The Modern Curator" — replace wordmark + redesign per §3.4
Layout/Public/                      # rebuild
Auth/                               # remove GithubLoginButton; keep Google, Apple, LoginCodeForm
Modal/, Toast/, Image/, Pagination/, Form/, Shared/   # keep, light visual refresh
ui/                                 # shadcn primitives — keep, palette via §3.2
atoms/, molecules/                  # keep, audit each for off-palette colors
```

**Marketing/branding metadata to update:**

- `app/sitemap.ts` — rewrite for marketplace URL structure (§8)
- `app/robots.ts` — rewrite, allow everything except `/dashboard`, `/api`, `/_ops`, `/checkout/*` confirmation pages
- `app/layout.tsx` — strip Polar metadata, replace with Blyss
- `app/humans.txt/route.tsx` — rewrite or remove
- `next.config.mjs` — set `output: 'standalone'`, add image domains for `cdn.blyss.co.ke`, MinIO local, configure `assetPrefix` if Cloudflare needs it

**Dependencies to remove from `clients/web/package.json`:**

```
@stripe/react-stripe-js                 # we are Paystack-only on the client
@stripe/stripe-js                       # Paystack uses its own popup/inline
@mdx-js/loader                          # blog/docs gone
@mdx-js/react                           # blog/docs gone
@next/mdx                               # blog/docs gone
@shikijs/rehype                         # code highlighting for docs/blog
shiki                                   # code highlighting for docs/blog
rehype-mdx-import-media                 # MDX
rehype-slug                             # MDX
remark-frontmatter                      # MDX
remark-gfm                              # KEEP — used for benefit perk markdown
remark                                  # MDX
remark-mdx                              # MDX
markdown-to-jsx                         # replaced by react-markdown
@stylexjs/stylex                        # Stylex unused, Tailwind v4 is the system
@stylexjs/babel-plugin                  # Stylex
@stylexjs/postcss-plugin                # Stylex
@emotion/react                          # unused with Tailwind
@emotion/styled                         # unused with Tailwind
@mui/material                           # MUI unused, shadcn is the system
@mui/icons-material                     # MUI icons
gsap                                    # we use motion only
@modelcontextprotocol/sdk               # not used at runtime
@ai-sdk/anthropic                       # AI features not in scope
@ai-sdk/google                          # AI features not in scope
@ai-sdk/mcp                             # AI features not in scope
@ai-sdk/react                           # AI features not in scope
@posthog/ai                             # AI analytics not in scope
ai                                      # Vercel AI SDK
@cloudflare/stream-react                # Cloudflare Stream not in scope
event-source-plus                       # used for AI streaming
import-in-the-middle                    # OTel server, not needed at runtime
require-in-the-middle                   # OTel server
@opentelemetry/api                      # not in scope yet
@opentelemetry/exporter-trace-otlp-http
@opentelemetry/sdk-trace-base
hash-wasm                               # was used for AI client; verify before removing
```

**Dependencies to add:**

```
motion                                  # replaces framer-motion (migrate imports)
react-markdown                          # render benefit perk markdown
```

After dependency cleanup, run `pnpm install` and verify the bundle size drops at least 30% from baseline.

### §4.6 Backoffice — leave entirely untouched

`server/polar/backoffice/` is Polar's internal HTMX + DaisyUI ops tool. Polar's engineers built it for themselves and it works. We don't redesign it, don't move it, don't strip it, don't gate it differently. Whatever route Polar mounts it on, whatever auth it uses, stays. If a backoffice page references a stripped module's data (license keys, meters, events) the page will simply show empty results — that's fine, the table just has no rows.

The marketplace surface and the backoffice are independent. Nothing on `blyss.co.ke` links to backoffice routes; admins reach it the way Polar engineers always have.

### §4.7 Tinybird

`server/tinybird/` is Polar's Tinybird usage analytics pipeline (events, datasources, pipes, endpoints, fixtures). It powers usage-based billing.

- Delete entirely — we don't have meters or events anymore.
- Remove Tinybird env vars from `.env.template`, `.env.production`, `.env.development`, `.env.testing`.

### §4.8 Scripts (`server/scripts/`)

Polar ships ~50 maintenance scripts. Delete every script that touches deleted modules:

```
DELETE: appeal_review.py, backfill_event_types.py, backfill_events_hyper.py,
backfill_meter_events.py, backfill_subscription_canceled_corrections.py,
backfill_tinybird_*.py, batch_orders_refund.py (keep), batch_subscriptions_cancel.py,
benefits_search_vector_backfill.py (keep), bulk_appeal_review.py,
checkout_require_3ds_backfill.py, cleanup_orphan_order_events.py,
cleanup_stripe_seeds.py, comment_review_actions.py, compare_faulty_webhooks.py,
create_review_tickets.py, customer_balance_migration.py, deleted_benefit_revoke.py,
discount_amounts_backfill.py, eval_organization_reviews.py, fix_alembic_*.py,
fix_migrated_subscription.py, fix_missing_refund_balance_reversals.py,
fix_organizations_socials_links.py, ingest_test_events.py, loadtest_setup.py,
loops_creator_import.sql, migrate_organizations_members.py, payment_order_link.py,
plain_comm.py, platform_fee_currency_backfill.py, platform_fees_migration.py,
presentment_amount_backfill.py, reconcile_tinybird_events.py,
remove_backfilled_events.py, remove_deprecated_scopes.py, search_vectors_backfill.py (keep),
shell.py (keep), stripe_processor_transactions_import.py, subscription_tax_exempt.py,
sync_waitlist_users.py, tax_filing_imports.py, tax_processor_backfill.py,
tinybird_events_cleanup.py, transfer_products_between_organizations.py,
trigger_payout.py (keep), unlink_organization_account.py, void_eligible_orders.py,
webhook_events_timestamp.py, webhook_events_type.py, webhook_trigger.py
```

KEEP: `seeds_load.py` (rebuild for marketplace seed data), `db.py`, `helper.py`, `generate_openapi.py`, `shell.py`, `search_vectors_backfill.py`, `benefits_search_vector_backfill.py`, `trigger_payout.py`.

### §4.9 Server-side root-level junk (`server/`)

Delete from `server/` root:

```
SYNC_WAITLIST_USERS.md              # internal doc
NEON_DATABASE_SETUP.md              # we're K3s + local Docker now
MIGRATION_STATUS.md                 # one-off log
GEMINI_DEPLOYMENT_SUMMARY.md        # AI provider doc
GEMINI_QUICK_START.md               # AI provider doc
MIGRATION_TO_GEMINI.md              # AI provider doc
AI_PROVIDER_SETUP.md                # AI provider doc
LOCAL_DEVELOPMENT.md                # superseded by §10
CLOUDFLARE_R2_CORS_SETUP.md         # we use MinIO not R2
CLAUDE.md                           # Polar internal
init-readonly-user.sql              # readonly user setup; recreate as a K3s init job if needed
make_admin.py, grant_permissions.py, check_permissions.py
fix_alembic_for_marketplace.py      # one-off fix
fix_alembic_version.py              # one-off fix
reset_and_migrate.py                # destructive, keep only if useful for local dev
reset_migration_state.py            # destructive
verify_marketplace_neon.py          # Neon-specific
verify_marketplace_tables.py        # one-off
test_connection.py                  # one-off
drop_db.py                          # destructive
.env.production, .env.template, .env.development, .env.testing
                                    # rewrite all four cleanly per §10 + §11
docker-compose.yml                  # rewrite leaner per §10
Dockerfile                          # rewrite for K3s production image per §11
```

KEEP: `alembic.ini`, `pyproject.toml`, `uv.lock`, `migrations/`, `polar/`, `tests/`, `scripts/` (after pruning), `emails/`, `.python-version`, `.dockerignore`, `monitoring/` (audit, Prometheus configs may be removable since we don't run Prom in v1).

### §4.10 Final repo shape after cleanup

```
blyss/
├── .editorconfig
├── .github/
│   ├── workflows/
│   │   └── deploy.yml              # NEW, one workflow
│   ├── ISSUE_TEMPLATE/
│   └── dependabot.yml
├── .gitignore
├── .nvmrc
├── .vscode/                        # keep
├── README.md                       # rewritten, ~30 lines
├── plan.md                         # this document
├── clients/
│   └── web/                        # one Next.js app, marketplace + dashboard + checkout + portal
│       ├── package.json            # ~70% of the deps after §4.5
│       ├── next.config.mjs         # standalone output, image domains
│       ├── src/
│       │   ├── app/                # routes, restructured per §6
│       │   ├── components/         # only marketplace + dashboard + shared, redesigned per §3
│       │   ├── design/             # NEW — palette tokens, motion tokens, typography helpers
│       │   ├── fonts/              # Inter + Inter Display
│       │   ├── hooks/, lib/, providers/, stores/, styles/, utils/
│       │   └── middleware.ts       # NEW — host-based routing for buy./my./blyss.
│       └── public/                 # logo, favicon, OG defaults
├── server/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── alembic.ini
│   ├── Dockerfile                  # NEW — production image
│   ├── docker-compose.yml          # local dev only — Postgres, Redis, MinIO, Mailhog
│   ├── polar/                      # ~70% of modules after §4.4
│   ├── migrations/
│   ├── scripts/                    # only the kept ones from §4.8
│   ├── emails/
│   └── tests/                      # prune tests for stripped modules
├── k8s/                            # NEW — manifests, see §11
├── dev/                            # local dev tooling, audit
└── (no other top-level dirs)
```

Repo size target after §4: **at least 50% smaller** by file count and bundle size, and the developer can describe what every top-level directory does in one sentence.

---

### §4.11 Centralized rebrand — find every "Polar" reference

Polar already built rebrand support: there's a top-level config variable controlling the brand name, plus property tests in `clients/web/src/__tests__/brand-text-replacement.property.test.tsx` that enforce no "Polar" appears in user-facing strings. We use that infrastructure.

**Backend — audit `server/polar/config.py`:**

| Setting | Current default | Change to |
|---|---|---|
| `EMAIL_FROM_NAME` | `"Blyss"` | already correct |
| `FAVICON_URL` | hardcoded `polarsource/polar` GitHub raw URL | `https://cdn.blyss.co.ke/brand/favicon.png` (creators upload to MinIO) |
| `INVOICES_ADDITIONAL_INFO` | `"[support@polar.sh](mailto:support@polar.sh)"` | `"[support@blyss.co.ke](mailto:support@blyss.co.ke)"` |
| `CHECKOUT_LINK_HOST` | comment says `"buy.polar.sh"` | example comment + production env: `"buy.blyss.co.ke"` |
| `FRONTEND_BASE_URL` fallback hostname | `"polar.sh"` | `"blyss.co.ke"` |
| Any other string defaulting to `polar.sh`, `polarsource`, or `polar.` | search and replace | `blyss.co.ke` |

Run a single sweep:

```bash
cd server
grep -rn 'polar\.sh\|polarsource\|polar\.com' polar/ --include='*.py' | grep -v 'polar/integrations/' | grep -v 'tests/'
```

Anything that surfaces in API responses, emails, or user-facing logs gets updated. Internal module names, Python class names, package paths (`polar.config`, `polar.organization`, etc.) stay — they're internal identifiers, not branding.

**Backend rebrand tests already exist:**

`server/tests/platform_rebrand/test_integration_email_branding.py` — run after config changes:

```bash
cd server
uv run pytest tests/platform_rebrand/ -v
```

Anything failing means a Polar string slipped through.

**Frontend — audit hardcoded strings in components:**

After §4.5 deletes the `(website)/(landing)/...` marketing routes, the remaining "Polar" hot-spots in `clients/web/src/` are roughly:

```
components/Organization/Footer.tsx          # 8 matches — replace with Blyss footer
components/Onboarding/IntegrateStep.tsx     # 5 matches — Polar dev integration step;
                                            # this whole file goes per §4.5 (Onboarding rebuild)
components/CheckoutLinks/...                # any hardcoded "buy.polar.sh"
components/Settings/...                     # Polar branding in settings copy
```

Plus Polar shipped a property test that enforces no "Polar" literals in components:

```
clients/web/src/__tests__/brand-text-replacement.property.test.tsx
```

Run it as part of CI:

```bash
cd clients/web
pnpm test -- brand-text-replacement
```

Update the test file's allow-list (the test allows certain internal references like the `polar.config` module name) to enforce Blyss.

**Environment variables — `.env.production` and `.env.development`:**

When we rewrite the env files in §4.9, every `BLYSS_*` / `EMAIL_FROM_NAME=Blyss` / `FAVICON_URL=...` / `CHECKOUT_LINK_HOST=buy.blyss.co.ke` / `FRONTEND_BASE_URL=https://blyss.co.ke` is set explicitly. Don't rely on defaults.

**Email templates — `server/emails/src/`:**

Polar's email templates use the `EMAIL_FROM_NAME` variable, but some templates hardcode "Polar" in copy. Audit:

```bash
cd server/emails/src
grep -rn 'Polar' . --include='*.tsx'
```

Replace with `{brand}` template variable that reads from config.

**Wordmark + favicon + OG defaults:**

Per the user's earlier instruction (DO NOT modify image files; user replaces images manually), we point the URLs at `cdn.blyss.co.ke/brand/...` placeholders. The user uploads the actual logo files to MinIO before launch. The plan does not commit any image files.

**Acceptance:** after §4.11, `grep -rn 'polar\.sh\|polarsource' clients/web/src server/polar` returns zero hits in user-facing strings. Both rebrand test suites pass.

---


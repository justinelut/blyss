# Phase 3 — Backend disable (no deletes)

> Plan refs: [§4.0 disable principle](../05-cleanup.md), [§4.4 step list](../05-cleanup.md), [§4.6 backoffice untouched](../05-cleanup.md). Goal: hide developer surface without breaking Polar's import graph.

**Critical:** do not delete module folders. Only modify routes, scopes, and UI nav. Run `uv run pytest -x` after every task to catch import-graph breakage immediately.

## Tasks

- [ ] **3.1 Audit `server/polar/api.py`**
  - Open the file, find every `app.include_router(...)` call
  - Acceptance: list of currently-included routers documented in this task's commit message

- [ ] **3.2 Comment out router includes for disabled modules**
  - Comment (don't delete) the `include_router` calls for: `license_key`, `meter`, `customer_meter`, `event`, `event_type`, `external_event`, `oauth2`, `personal_access_token`, `organization_access_token`, `billing_entry`, `customer_seat`, `integrations.github`, `processor_transaction`
  - **Keep included:** all marketplace modules + Paystack + auth + customer_portal + checkout + checkout_link + benefit + cart + wishlist + category + review + donation + newsletter + pledge (per §4.4 Step 6)
  - Acceptance: `uv run task api` boots cleanly; `curl http://localhost:8000/openapi.json | jq '.paths | keys[]' | grep -E 'meter|license_key|oauth2|webhooks|access_token|event'` returns 0 hits in user-facing endpoints

- [ ] **3.3 Audit `server/polar/auth/scope.py`**
  - List every Scope constant
  - Acceptance: list documented

- [ ] **3.4 Comment out scopes for disabled modules**
  - Comment (don't delete): `meters_read`, `meters_write`, `events_read`, `events_write`, `oauth2_apps_*`, `personal_access_tokens_*`, `organization_access_tokens_*`, `webhooks_read`, `webhooks_write` (creator-facing webhook UI hidden, but our internal webhooks still emit), `license_keys_*`
  - Keep: every marketplace + customer + creator scope
  - Acceptance: app still boots; `uv run pytest -x` passes

- [ ] **3.5 Verify Polar's tests still pass**
  - `cd server && uv run task test`
  - Some tests will fail because they assert disabled routes are mounted
  - Mark each failing test with `@pytest.mark.skip(reason="route disabled per §4.4")` — do not delete the test
  - Acceptance: full test suite green

- [ ] **3.6 Strip dashboard nav items for hidden modules**
  - Open `clients/web/src/components/Dashboard/navigation.tsx`
  - Remove entries for: Webhooks, API tokens, OAuth apps, GitHub integration, License keys, Meters, Events, Custom fields top-level item, Sandbox toggle, Brand, Orbit, Vision, Member model toggle, Trial configuration
  - Per §7.1 keep + audit + hide lists
  - Acceptance: dashboard sidebar shows only the "Keep" items in §7.1

- [ ] **3.7 Delete dashboard pages for hidden modules**
  - `cd clients/web/src/app/(main)/dashboard && rm -rf {webhooks,license-keys,events,meters,oauth,access-tokens,member-model}` — adjust paths to actual route names
  - These were noted in phase 2 task 2.12 — verify all gone
  - Acceptance: every nav item that remains points at a real, working route

- [ ] **3.8 Delete `clients/web/src/hooks/queries/{webhooks,license_keys,meters,events,oauth,personal_access_token}.ts`**
  - These data hooks have no callers after route deletes
  - Run `pnpm run typecheck` to confirm
  - Acceptance: typecheck passes

- [ ] **3.9 Confirm Polar backoffice untouched (§4.6)**
  - `git status server/polar/backoffice/` — should show no changes
  - Verify backoffice route still mounts and is reachable on localhost
  - Acceptance: backoffice loads at whatever path Polar mounts it; admin can sign in

- [ ] **3.10 Verify Stripe code is dormant (§4.4 Step 5)**
  - `grep -rn 'stripe\.' clients/web/src/ --include='*.ts' --include='*.tsx'` — should return 0 active usages in marketplace surface
  - `server/polar/integrations/stripe/` stays in place but unused on the marketplace path
  - Acceptance: marketplace and dashboard never show a Stripe-branded element; checkout uses Paystack only

- [ ] **3.11 Confirm `polar/integrations/loops/` stays active**
  - Per §4.4 Step 4: Loops handles marketing emails
  - `LOOPS_API_KEY` env var present (empty in dev = sync no-op, real key in prod)
  - Acceptance: `polar/integrations/loops/` still imported in `polar/api.py` if it has routes; no errors on app boot

- [ ] **3.12 Confirm `polar/integrations/discord/` stays in place**
  - Used as a perk benefit type via markdown links
  - Acceptance: file still there, no import errors

- [ ] **3.13 Confirm `polar/integrations/aws/` storage path points to MinIO**
  - Verify `polar/file/` storage adapter uses S3-compatible endpoint
  - In dev, points at `http://localhost:9000`; in prod, points at `http://minio:9000`
  - Acceptance: file upload from dashboard succeeds in dev; file appears in MinIO console

- [ ] **3.14 Confirm app boots end-to-end after the strip**
  - Restart all 3 terminals
  - Sign in as creator, navigate dashboard sidebar — every link works, every page renders
  - Marketplace homepage still loads with seed data
  - Acceptance: zero 500 errors, zero import errors, zero TypeScript errors

## Acceptance for phase 3

- [ ] No backend module folder deleted (per §4.0)
- [ ] Disabled module routes return 404 (not mounted in `polar/api.py`)
- [ ] Backoffice (`server/polar/backoffice/`) untouched, still working
- [ ] Dashboard sidebar shows only the §7.1 keep list
- [ ] All Polar tests pass (with skips for disabled routes only)
- [ ] App boots and serves marketplace + dashboard cleanly
- [ ] Pledge module still in place, ready for phase 7 fundraising wiring
- [ ] Loops integration still wired, ready for marketing email work in v1.1

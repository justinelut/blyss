# Commands to Run After Marketplace Implementation

## Migration Status ✅

- ✅ Marketplace migration applied: `2026-03-18-1619_add_marketplace_features.py`
- ✅ Database version: `4b1f5e85828f` (head)
- ✅ All 9 marketplace tables created
- ✅ PGGrantTable exclusion configured in `server/migrations/env.py`

## Backend Import Fixes ✅

- ✅ Fixed `organization_service` import in Paystack endpoints (use `organization as organization_service`)
- ✅ Fixed `paystack_service` → `paystack` in Paystack endpoints
- ✅ Fixed `ProductPublic` → `Product` in category endpoints
- ✅ Fixed `CheckoutCartCreate` removed from checkout schemas
- ✅ Fixed `WebUser` → `WebUserRead` in analytics endpoints
- ✅ Fixed `CartService` singleton pattern (no **init** with repository)
- ✅ Fixed `list[...]` → `List[...]` in organization endpoints (Python 3.14 compatibility)
- ✅ Fixed `WebUserOrAnonymous` import in product endpoints (from auth.dependencies, not product.auth)
- ✅ Fixed indentation in review service
- ✅ Fixed syntax error in webhook signature test file
- ✅ Fixed Dramatiq actor registration in tests (added StubBroker setup in conftest.py)

## Frontend Landing Page Redesign ✅

- ✅ Redesigned main landing page with marketplace-first approach
- ✅ Uses existing components: ProductCard, Button, Section
- ✅ Integrated with existing hooks: usePublicProducts, useCategories, useCreators
- ✅ Features: Hero with search, Featured products, Categories, Trending, Creators, Newsletter CTA
- ✅ Updated header navigation to marketplace-focused (Browse, Resources, Creators, Blog, Company)
- ✅ Updated footer with marketplace sections (Marketplace, Creators, Company, Support)
- ✅ Fixed import issues in categories.ts (api from @/utils/client)
- ✅ Fixed TypeScript error in PriceRangeFilter.tsx (React.ReactElement)

## Backend Validation Commands (Run when ready)

```bash
# 1. Run all tests (should pass now with Dramatiq fix)
cd server
uv run task test

# 2. Start backend server (should start without errors)
cd server
uv run task api

# 3. Start worker (in separate terminal)
cd server
uv run task worker

# 4. Run linting
cd server
uv run task lint

# 5. Run type checking
cd server
uv run task lint_types
```

## Frontend Commands (Run when ready)

```bash
# 1. Clear Next.js cache to fix useWishlist error and other cached issues
cd clients/apps/web
rm -rf .next
cd ../..

# 2. Clear turbo cache (optional but recommended)
cd clients
rm -rf .turbo

# 3. Start frontend dev server (all apps)
cd clients
pnpm run dev

# 4. Start web app only (faster)
cd clients
pnpm run dev-web

# 5. Generate API client to include KES currency (REQUIRED - backend must be running)
cd clients/packages/client
pnpm run generate
```

## Notes

- `creator_payout_amount` is part of Paystack integration (not original Polar)
- Polar already has full payout system (Payout, PayoutAttempt models)
- All marketplace backend modules implemented: cart, category, donation, newsletter, review, wishlist
- Backend should now start without import errors
- Dramatiq test issues fixed by setting up StubBroker in main conftest.py
- Landing page redesigned with marketplace-first approach using existing components
- If you see "Module not found" errors in Next.js, clear the .next cache folder
- **KES Currency**: KES is defined in backend (`server/polar/kit/currency.py` line 20) and now included in frontend after regenerating API client
- **Paystack Logging**: Removed initialization logging from Paystack service to match Stripe pattern (no logging during **init**, only during API calls)
- **Windows Cache Fix**: Disabled filesystem cache in development on Windows to prevent long compaction times and auto-refresh issues
- **Wishlist Hook**: Added `export * from './wishlist'` to queries index to make useWishlist available
- **Onboarding Flow**: Fixed start page to redirect new users to `/onboarding/start` instead of `/dashboard/create` to ensure proper onboarding
- **PostHog**: Added PostHog analytics keys to .env.local
- Next: Restart dev server to apply cache fixes and environment variable changes

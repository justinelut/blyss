# Vercel Build Fix Guide

## Problem
Frontend builds successfully locally (5+ minutes) but fails on Vercel with:
```
SyntaxError: Unexpected end of JSON input
at JSON.parse (<anonymous>)
at parseJSON (/vercel/path0/clients/packages/ui/node_modules/.pnpm/esbuild@0.27.4/node_modules/esbuild/lib/main.js:1882:15)
```

## Root Cause
Vercel free tier has resource limits (memory/time). The monorepo is too large and esbuild runs out of memory during the build process.

## Solutions Applied

### 1. Fixed Import Errors (DONE)
- Fixed `calendar.tsx` and `chart.tsx` imports from `@/lib/utils` to `../../lib/utils`
- These were causing build failures in the UI package

### 2. Added MinIO Domain to Next.js Config (DONE)
- Added `storage.blyss.co.ke` to CSP and images config
- This allows loading images from self-hosted MinIO storage

### 3. Recommended Vercel Configuration Changes

#### Option A: Sequential Package Build (Recommended)
In Vercel project settings, change the build command to:
```bash
turbo run build --filter=@polar-sh/client --filter=@polar-sh/ui --filter=web --concurrency=1
```

This builds packages one at a time (`--concurrency=1`) to reduce memory usage.

#### Option B: Build Only Web Dependencies
```bash
turbo run build --filter=web...
```

This builds only the web app and its dependencies (the `...` means "and dependencies").

#### Option C: Use pnpm Filters (If turbo still fails)
```bash
pnpm --filter=@polar-sh/client build && pnpm --filter=@polar-sh/ui build && pnpm --filter=web build
```

This bypasses turbo entirely and builds sequentially with pnpm.

#### Option D: Disable Turbopack (If memory issues persist)
If the build still fails, turbopack might be using too much memory. Update `apps/web/package.json`:
```json
"build": "next build"
```
(Remove `--turbopack` flag)

Then use Option A or B above.

#### Add Environment Variables
Add these in Vercel project settings → Environment Variables:

1. `NODE_OPTIONS=--max-old-space-size=4096`
   - Increases Node.js memory limit to 4GB

2. `VERCEL_FORCE_NO_BUILD_CACHE=1` (optional, try if still failing)
   - Forces fresh build without cache (can help with corrupted cache issues)

#### Alternative: Upgrade Vercel Plan
If the above doesn't work, consider upgrading to Vercel Pro ($20/month) which has:
- More build time (45 minutes vs 15 minutes)
- More memory (8GB vs 4GB)
- Better for monorepos

## Marketplace Features Migration Status

All marketplace features WILL be migrated when you run migrations:

### Database Tables Created:
- `products` - Product catalog
- `product_categories` - Categories (stored in user_metadata JSON field)
- `product_reviews` - Customer reviews
- `product_views` - View tracking
- `cart_items` - Server-side cart storage
- `product_cart_events` - Cart analytics
- `wishlists` - Saved products
- `orders` - Order records
- `order_items` - Order line items
- `checkouts` - Checkout sessions
- `discounts` - Discount codes
- `discount_redemptions` - Discount usage tracking
- `license_keys` - Digital product licenses

### How Cart Works:
- Client-side: localStorage (fast, works offline)
- Server-side: `cart_items` table (persistent, cross-device)
- Both sync automatically

## Next Steps

1. Go to Vercel project settings: https://vercel.com/[your-username]/[project-name]/settings
2. Update build command to: `cd apps/web && pnpm run build`
3. Add environment variable: `NODE_OPTIONS=--max-old-space-size=4096`
4. Trigger a new deployment
5. If still failing, add: `VERCEL_FORCE_NO_BUILD_CACHE=1`
6. If still failing, upgrade to Vercel Pro

## Files Modified
- `clients/packages/ui/src/components/ui/calendar.tsx` - Fixed import
- `clients/packages/ui/src/components/ui/chart.tsx` - Fixed import
- `clients/apps/web/next.config.mjs` - Already has MinIO domain configured

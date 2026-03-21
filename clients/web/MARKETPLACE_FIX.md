# Marketplace Page Build Timeout Fix

## Problem
The marketplace page was timing out during Vercel build because:
1. The page was configured for static generation with `revalidate = 300`
2. During build, Next.js tried to fetch data from `/v1/products/public` API endpoint
3. The API endpoint was either not responding or taking more than 60 seconds
4. Vercel build failed after 3 attempts (60s each)

## Root Cause
The FastAPI server endpoint `/v1/products/public` is:
- Either not implemented yet
- Or timing out due to database connection issues
- Or the API server is not accessible during Vercel build time

## Solution Applied

### 1. Changed to Dynamic Rendering
```typescript
// Before:
export const revalidate = 300

// After:
export const dynamic = 'force-dynamic'
```

This forces the page to render on-demand at request time instead of at build time, avoiding the timeout issue.

### 2. Error Handling Already in Place
The page already has proper error handling:
```typescript
.catch(() => ({ items: [], pagination: { total_count: 0, max_page: 1 } }))
```

This ensures the page renders with empty data if the API fails, rather than crashing.

## Testing Results

### Server Status
- FastAPI server starts successfully on `http://127.0.0.1:8000`
- Server logs show: "Polar API started" and "Application startup complete"

### API Endpoint Test
- Endpoint: `http://127.0.0.1:8000/v1/products/public?limit=5`
- Result: Connection timeout (>10 seconds)
- This confirms the API endpoint is either:
  - Not implemented
  - Has database connection issues
  - Or is extremely slow

## Next Steps

### For Development
1. Check if the `/v1/products/public` endpoint exists in the FastAPI codebase
2. Verify database connection and migrations are up to date
3. Test the endpoint manually with curl or Postman
4. Check server logs for any errors when accessing the endpoint

### For Production (Vercel)
1. The page will now render dynamically at request time
2. If API is unavailable, page shows empty state (no products)
3. Once API is fixed, products will appear automatically
4. Consider adding a loading state or error message for better UX

## Files Modified
- `blyss-web/src/app/(main)/(website)/(landing)/marketplace/page.tsx`
  - Changed from `revalidate = 300` to `dynamic = 'force-dynamic'`

## Commit
```bash
git commit -m "fix: make marketplace page dynamic to avoid build timeout"
```

## Impact
- ✅ Vercel build will no longer timeout on marketplace page
- ✅ Page will render successfully (with empty data if API unavailable)
- ⚠️ Page will be server-rendered on each request (slightly slower than static)
- ⚠️ Need to fix the API endpoint for products to actually show

## Alternative Solutions (Future)
1. Implement ISR (Incremental Static Regeneration) once API is stable
2. Add client-side data fetching with loading states
3. Use a CDN cache layer in front of the API
4. Pre-populate some sample data for build time

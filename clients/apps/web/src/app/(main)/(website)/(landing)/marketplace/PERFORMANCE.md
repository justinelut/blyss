# Marketplace Homepage Performance Optimizations

This document tracks the performance optimizations implemented for the marketplace homepage to meet requirements 10.1-10.5.

## Implemented Optimizations

### 6.1 Image Lazy Loading (Requirement 10.4)

**Implementation:**
- ✅ Next.js Image component with automatic lazy loading for products below the fold
- ✅ Priority loading for above-the-fold images (first 3 featured products, first 4 grid products)
- ✅ Proper `loading` attribute: `eager` for priority images, `lazy` for others
- ✅ Blur placeholder for smooth loading experience
- ✅ Optimized `sizes` attribute for responsive images

**Files Modified:**
- `clients/packages/ui/src/components/molecules/ProductCard.tsx`
- `clients/apps/web/src/app/(main)/(website)/(landing)/marketplace/MarketplaceContent.tsx`

**Technical Details:**
```typescript
// Priority images (above the fold)
<ProductCard priority={index < 3} /> // Featured products
<ProductCard priority={index < 4} /> // Grid products

// Image component configuration
<Image
  loading={priority ? 'eager' : 'lazy'}
  priority={priority}
  placeholder="blur"
  blurDataURL="..." // Inline base64 placeholder
/>
```

### 6.2 Image Caching Configuration (Requirement 10.5)

**Implementation:**
- ✅ Next.js image optimization with 1-year cache TTL
- ✅ AVIF and WebP format support for modern browsers
- ✅ Optimized device sizes and image sizes configuration
- ✅ Page-level cache headers with stale-while-revalidate strategy
- ✅ 5-minute revalidation for fresh content

**Files Modified:**
- `clients/apps/web/next.config.mjs`
- `clients/apps/web/src/app/(main)/(website)/(landing)/marketplace/page.tsx`

**Technical Details:**
```javascript
// Image optimization config
images: {
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 31536000, // 1 year
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}

// Page cache headers
{
  source: '/marketplace',
  headers: [
    {
      key: 'Cache-Control',
      value: 'public, s-maxage=300, stale-while-revalidate=600',
    },
  ],
}

// Page revalidation
export const revalidate = 300 // 5 minutes
```

### 6.3 Initial Page Load Optimization (Requirements 10.1, 10.2, 10.3)

**Implementation:**
- ✅ Server-side rendering for critical content (SEO-optimized)
- ✅ Minimal client-side JavaScript with proper code splitting
- ✅ Performance monitoring utilities for Core Web Vitals
- ✅ Optimized loading skeletons to prevent layout shift
- ✅ Reduced refetch frequency for better performance
- ✅ TanStack Query with keepPreviousData for smooth transitions

**Files Modified:**
- `clients/apps/web/src/app/(main)/(website)/(landing)/marketplace/page.tsx`
- `clients/apps/web/src/app/(main)/(website)/(landing)/marketplace/MarketplaceClientWrapper.tsx`
- `clients/apps/web/src/app/(main)/(website)/(landing)/marketplace/MarketplaceContent.tsx`
- `clients/apps/web/src/utils/performance.ts` (new file)

**Technical Details:**

**Server-Side Rendering:**
```typescript
// Server component fetches data before rendering
export default async function MarketplacePage({ searchParams }) {
  const [productsData, featuredData] = await Promise.all([
    unwrap(api.GET('/v1/products/public', { params: { query: {...} } })),
    unwrap(api.GET('/v1/products/public', { params: { query: { is_featured: true } } })),
  ])
  
  return <MarketplaceClientWrapper initialProducts={...} />
}
```

**Client-Side Optimization:**
```typescript
// Optimized TanStack Query configuration
usePublicProducts(params, {
  initialData: { items: initialProducts, ... },
  keepPreviousData: true,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
})
```

**Performance Monitoring:**
```typescript
// Track Core Web Vitals
initPerformanceMonitoring() // Measures FCP, LCP, TTFB

// Validates against requirements:
// - FCP < 1500ms (Requirement 10.1)
// - LCP < 2500ms (Requirement 10.2)
// - TTFB < 500ms (Requirement 10.3)
```

**Layout Shift Prevention:**
```typescript
// Skeleton loader matches actual card layout
<div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
  <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />
  <div className="flex flex-1 flex-col gap-2">
    <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
    <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
    <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
  </div>
  <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
</div>
```

## Performance Targets

| Metric | Target | Requirement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | < 1.5s | 10.1 |
| Largest Contentful Paint (LCP) | < 2.5s | 10.2 |
| API Response Time | < 500ms | 10.3 |
| Image Lazy Loading | Below fold | 10.4 |
| Image Cache TTL | 1 year | 10.5 |

## Testing Checklist

- [ ] Run Lighthouse audit and verify FCP < 1.5s
- [ ] Run Lighthouse audit and verify LCP < 2.5s
- [ ] Verify API response time < 500ms in Network tab
- [ ] Verify images below fold are lazy loaded (check Network tab)
- [ ] Verify AVIF/WebP formats are served to modern browsers
- [ ] Verify cache headers are set correctly (Cache-Control)
- [ ] Verify no layout shift during page load (CLS < 0.1)
- [ ] Test on slow 3G connection to ensure performance
- [ ] Verify server-side rendering works (view page source)
- [ ] Test with JavaScript disabled to ensure core content loads

## Monitoring

Performance metrics are automatically tracked in development mode via the `performance.ts` utility. In production, these can be integrated with PostHog or other analytics platforms.

To view performance metrics in development:
1. Open browser DevTools Console
2. Look for `[Performance]` logs
3. Check for warnings if metrics exceed targets

## Future Optimizations

Potential future improvements:
- Implement prefetching for next page on pagination hover
- Add service worker for offline support
- Implement progressive image loading with LQIP (Low Quality Image Placeholder)
- Add resource hints (dns-prefetch, preconnect) for external domains
- Implement virtual scrolling for very large product lists
- Add image CDN with edge caching

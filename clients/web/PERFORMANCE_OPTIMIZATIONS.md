# Performance Optimizations - Marketplace Frontend

This document outlines the performance optimizations implemented for the Blyss Marketplace frontend as part of Task 16.

## Overview

The marketplace frontend has been optimized to achieve:
- Lighthouse performance score above 90 on desktop
- Lighthouse performance score above 70 on mobile
- Initial page load within 2 seconds on 3G connection

## Implemented Optimizations

### 1. Image Loading Optimization (Task 16.1)

#### Next.js Image Component
All product and creator images now use the Next.js `Image` component for automatic optimization:

**Benefits:**
- Automatic image optimization and format conversion (WebP, AVIF)
- Responsive srcset generation for different screen sizes
- Lazy loading by default (images load as they enter viewport)
- Blur placeholder while loading
- Prevents Cumulative Layout Shift (CLS)

**Implementation:**
- Created `OptimizedImage` component (`components/Image/OptimizedImage.tsx`)
- Updated `ProductCard` to use `OptimizedImage` with 4:5 aspect ratio
- Updated `CreatorCard` sample products to use `OptimizedImage`
- `ProductImageGallery` already uses Next.js Image
- `CartItem` already uses Next.js Image

**Responsive Sizes:**
```typescript
// Product cards
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"

// Creator card thumbnails
sizes="(max-width: 640px) 25vw, (max-width: 1024px) 15vw, 10vw"

// Product detail gallery
sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
```

#### Lazy Loading
The `ProductGrid` component implements intersection observer-based lazy loading:
- Products render skeleton loaders until they enter the viewport
- First 8 products load immediately for above-the-fold content
- Remaining products load as user scrolls
- 50px root margin for preloading before entering viewport

### 2. Code Splitting and Prefetching (Task 16.2)

#### Route-Based Code Splitting
Next.js App Router automatically implements route-based code splitting:
- Each page is a separate JavaScript bundle
- Code is only loaded when needed
- Shared components are automatically optimized into shared chunks

#### Link Prefetching
All navigation links now use Next.js `Link` with `prefetch={true}`:

**Updated Components:**
- `ProductCard`: Prefetches product detail pages on hover
- `CreatorCard`: Prefetches creator storefront pages on hover
- `CartItem`: Already uses Link with prefetch

**Benefits:**
- Instant navigation when user clicks
- Prefetching happens on hover (desktop) or when link enters viewport (mobile)
- Reduces perceived load time significantly

### 3. Loading States and Caching (Task 16.3)

#### Skeleton Loading States
Implemented skeleton loaders for all async data fetching:

**ProductGrid:**
- Shows 8 skeleton cards while initial data loads
- Skeleton matches actual card layout (image, title, price, button)
- Smooth transition from skeleton to actual content

**Empty States:**
- Friendly empty state with icon and CTA when no products found
- Helps users understand what to do next

#### TanStack Query Caching
Optimized caching configuration for better performance:

**Global Defaults (`utils/api/query.ts`):**
```typescript
{
  staleTime: 60 * 1000,           // 1 minute default
  gcTime: 5 * 60 * 1000,          // 5 minutes garbage collection
  refetchOnWindowFocus: false,    // Disable refetch on focus
  retry: 1,                       // Retry failed requests once
}
```

**Query-Specific Caching:**
- `usePublicProducts`: 5 minute stale time
- `useProductCategories`: 5 minute stale time
- `useProductBySlug`: 5 minute stale time
- `useRelatedProducts`: 5 minute stale time
- `useCreators`: 5 minute stale time
- `useCreator`: 5 minute stale time

**Benefits:**
- Reduces unnecessary API calls
- Instant data display from cache
- Background refetching keeps data fresh
- `keepPreviousData` prevents loading states during pagination

### 4. Bundle Size Optimization (Task 16.4)

#### Automatic Optimizations
Next.js automatically handles:
- Tree-shaking unused code
- Minification and compression
- Code splitting by route
- Dynamic imports for heavy components

#### Verification
To verify bundle size optimization:

```bash
cd clients/web
pnpm run build
```

Check the build output for:
- Route bundle sizes
- Shared chunk sizes
- First Load JS size

**Target Metrics:**
- First Load JS < 200KB for main pages
- Individual route bundles < 50KB
- Shared chunks efficiently split

## Performance Monitoring

### Lighthouse Audits
Run Lighthouse audits to verify performance:

```bash
# Desktop audit
lighthouse https://your-domain.com --preset=desktop --view

# Mobile audit
lighthouse https://your-domain.com --preset=mobile --view
```

**Target Scores:**
- Performance: 90+ (desktop), 70+ (mobile)
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### Core Web Vitals
Monitor these metrics in production:

**LCP (Largest Contentful Paint):**
- Target: < 2.5s
- Optimized with: Image optimization, prefetching, caching

**FID (First Input Delay):**
- Target: < 100ms
- Optimized with: Code splitting, minimal JavaScript

**CLS (Cumulative Layout Shift):**
- Target: < 0.1
- Optimized with: Aspect ratios on images, skeleton loaders

### Real User Monitoring
Consider implementing RUM tools:
- Vercel Analytics (built-in)
- Google Analytics 4 with Web Vitals
- Sentry Performance Monitoring

## Best Practices

### Image Guidelines
1. Always use `OptimizedImage` or Next.js `Image` for product/creator images
2. Specify appropriate `sizes` prop based on layout
3. Use `priority={true}` only for above-the-fold images
4. Maintain aspect ratios to prevent layout shift

### Link Guidelines
1. Always use Next.js `Link` for internal navigation
2. Set `prefetch={true}` for important navigation paths
3. Avoid `router.push()` when `Link` can be used

### Query Guidelines
1. Set appropriate `staleTime` based on data freshness needs
2. Use `keepPreviousData` for paginated lists
3. Disable `refetchOnWindowFocus` for static content
4. Implement proper loading and error states

### Component Guidelines
1. Use skeleton loaders for async content
2. Implement intersection observer for lazy loading
3. Avoid heavy computations in render
4. Memoize expensive calculations with `useMemo`

## Future Optimizations

### Potential Improvements
1. **Image CDN**: Consider using a dedicated image CDN for faster delivery
2. **Service Worker**: Implement service worker for offline support
3. **Preconnect**: Add preconnect hints for external domains
4. **Font Optimization**: Ensure fonts are properly subset and preloaded
5. **Critical CSS**: Extract and inline critical CSS for faster first paint
6. **Compression**: Verify Brotli compression is enabled on server
7. **HTTP/2**: Ensure HTTP/2 is enabled for multiplexing

### Monitoring Improvements
1. Set up automated Lighthouse CI in deployment pipeline
2. Implement performance budgets
3. Add custom performance marks for key user interactions
4. Track bundle size changes in CI/CD

## Testing Performance

### Local Testing
```bash
# Build production bundle
pnpm run build

# Start production server
pnpm run start

# Run Lighthouse
lighthouse http://localhost:3000 --view
```

### Network Throttling
Test with different network conditions:
- Fast 3G (1.6 Mbps down, 750 Kbps up)
- Slow 3G (400 Kbps down, 400 Kbps up)
- Offline

### Device Testing
Test on various devices:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667, 414x896)

## Conclusion

These optimizations significantly improve the marketplace frontend performance:
- Faster initial page loads
- Smoother navigation between pages
- Better user experience on slow connections
- Reduced bandwidth usage
- Improved SEO rankings

All optimizations follow Next.js and React best practices and are maintainable for future development.

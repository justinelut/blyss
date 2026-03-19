# Implementation Plan: Marketplace Homepage

## Overview

This plan implements a public marketplace homepage at the root URL (/) that displays all products from all creators on the Blyss platform. The implementation uses Next.js 14 App Router with React Server Components for optimal SEO and performance, following established Polar patterns for data fetching, UI components, and state management.

## Tasks

- [ ] 1. Create backend API endpoint for public product listing
  - [x] 1.1 Add public products list endpoint in server
    - Create endpoint at `GET /v1/products/public` that doesn't require authentication
    - Accept query parameters: search, category, min_price, max_price, sort, page, limit, is_featured
    - Return paginated product data with creator information
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 1.2 Write unit tests for public products endpoint
    - Test pagination, filtering, sorting, and error cases
    - Test featured products filtering
    - _Requirements: 9.1, 9.2, 9.5_

- [x] 2. Create frontend data fetching hooks
  - [x] 2.1 Add usePublicProducts hook
    - Create hook in `clients/apps/web/src/hooks/queries/products.ts`
    - Support all query parameters (search, category, price range, sort, pagination, featured)
    - Use TanStack Query with keepPreviousData for smooth transitions
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 2.2 Add useProductCategories hook
    - Fetch available categories with product counts
    - Cache category data appropriately
    - _Requirements: 4.1, 4.5_

- [-] 3. Create reusable UI components
  - [x] 3.1 Create ProductCard component
    - Build component in `clients/packages/ui/src/components/molecules/`
    - Display product image, name, price, creator name, category
    - Make card clickable to navigate to product detail page
    - Use existing UI library components (Tailwind CSS, Radix UI)
    - _Requirements: 1.4_
  - [x] 3.2 Create HeroSection component
    - Build component with platform messaging
    - Include "Become a Creator" CTA button
    - Link button to creator sign-up page
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 3.3 Create SearchInput component
    - Build debounced search input field
    - Update URL query parameters on change
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 3.4 Create CategoryFilter component
    - Build single-select category filter
    - Display product counts per category
    - Update URL query parameters on selection
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 3.5 Create PriceRangeFilter component
    - Build min/max price input fields
    - Validate numeric input
    - Update URL query parameters on change
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 3.6 Create SortSelect component
    - Build dropdown with sort options (newest, price low-to-high, price high-to-low)
    - Update URL query parameters on selection
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 3.7 Create EmptyState component
    - Display message when no products match filters
    - Include "Clear Filters" button
    - Handle case when platform has no products
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 4. Checkpoint - Ensure all components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement marketplace homepage page
  - [x] 5.1 Create homepage route
    - Create page at `clients/apps/web/src/app/(main)/(website)/(landing)/marketplace/page.tsx`
    - Use React Server Components for initial data fetch
    - Implement server-side rendering for SEO
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 5.2 Implement URL state management
    - Use nuqs for URL query parameter synchronization
    - Sync search, category, price range, sort, and page parameters
    - Apply filters from URL on page load
    - _Requirements: 11.3, 11.4_
  - [x] 5.3 Build featured products section
    - Display featured products carousel above main grid
    - Show maximum 6 featured products
    - Hide section when no featured products exist
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 5.4 Build main product grid
    - Display products in responsive grid layout
    - Show 24 products per page
    - Apply all active filters and sorting
    - _Requirements: 1.1, 1.4, 1.5, 8.1_
  - [x] 5.5 Implement pagination controls
    - Display pagination UI when more than 24 products
    - Show current page and total pages
    - Scroll to top on page change
    - Update URL query parameters
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 5.6 Implement filter combination logic
    - Combine search, category, and price filters
    - Display total product count matching filters
    - _Requirements: 11.1, 11.2, 11.5_
  - [x] 5.7 Wire all components together
    - Integrate HeroSection, SearchInput, filters, sort, featured section, product grid, and pagination
    - Ensure all state updates trigger appropriate re-fetches
    - Handle loading and error states
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Implement performance optimizations
  - [x] 6.1 Add image lazy loading
    - Implement lazy loading for product images below the fold
    - Use Next.js Image component with appropriate loading strategy
    - _Requirements: 10.4_
  - [x] 6.2 Configure image caching
    - Set appropriate cache headers for product images
    - Use Next.js image optimization
    - _Requirements: 10.5_
  - [x] 6.3 Optimize initial page load
    - Ensure server-side rendering for critical content
    - Minimize client-side JavaScript for initial render
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 7. Final checkpoint - Ensure all functionality works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The implementation uses TypeScript with Next.js 14 App Router
- All components follow Polar's established patterns using Tailwind CSS and Radix UI
- Data fetching uses TanStack Query with the existing API client
- URL state management uses nuqs for query parameter synchronization
- Server-side rendering ensures optimal SEO and performance

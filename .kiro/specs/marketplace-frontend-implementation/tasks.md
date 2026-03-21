# Implementation Plan: Blyss Marketplace Frontend

## Overview

This plan implements the Blyss Marketplace frontend by converting 8 HTML design files into functional React/Next.js pages. The implementation updates 4 existing pages (Product Detail, Creator Storefront, Shopping Cart, Wishlist) and creates 4 new pages (Homepage, Browse Marketplace, Explore Creators, Help Center). All implementation reuses existing components from `clients/apps/web/src/components/` with styling updates to match the editorial design system.

## Tasks

- [x] 1. Configure Tailwind with editorial design tokens
  - Update `clients/apps/web/src/styles/globals.css` with color tokens (primary: #a73400, secondary: #006972, tertiary: #765700)
  - Add surface hierarchy colors (surface: #fcf9f7, surface_container_low: #f6f3f1, surface_container_lowest: #ffffff)
  - Configure typography (Epilogue for display/headline, Inter for body/labels)
  - Add Editorial shadow utility (Y: 12px, Blur: 32px, rgba(27, 28, 27, 0.06))
  - Configure spacing scale (4rem and 5rem for section padding)
  - Add dark mode color variants
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 18.1-18.10_

- [x] 2. Create base marketplace components
  - [x] 2.1 Create ProductCard component with editorial styling
    - Apply surface_container_lowest background with tonal layering
    - Use 4:5 aspect ratio for product images
    - Apply Editorial shadow on hover
    - Use Epilogue font for product name, title-lg for price
    - _Requirements: 11.4, 1.4, 1.5_

  - [ ]\* 2.2 Write unit tests for ProductCard
    - Test product information rendering
    - Test hover state styling
    - Test empty state handling
    - _Requirements: 19.1_

  - [x] 2.3 Create CreatorCard component
    - Display creator avatar, name, bio snippet, follower count
    - Show 3-4 sample product thumbnails
    - Include follow button with authentication check
    - Link to creator storefront
    - _Requirements: 7.5, 7.6, 7.7_

  - [ ]\* 2.4 Write unit tests for CreatorCard
    - Test creator information display
    - Test sample products rendering
    - Test follow button authentication check
    - _Requirements: 19.1_

  - [x] 2.5 Create FilterSidebar component
    - Add category checkboxes
    - Add price range slider respecting selected currency
    - Add clear filters button
    - Make collapsible drawer on mobile
    - _Requirements: 4.4, 4.5, 12.5_

  - [x] 2.6 Create SearchBar component with live results
    - Implement debounced search input (300ms)
    - Add live search results dropdown
    - Support keyboard navigation (arrow keys, enter, escape)
    - Add loading indicator
    - _Requirements: 4.3, 7.3_

  - [x] 2.7 Create ProductGrid component
    - Implement responsive columns (1/2/3/4 based on viewport)
    - Add skeleton loading states
    - Add empty state with CTA
    - Implement lazy loading with intersection observer
    - _Requirements: 4.6, 12.2, 14.2_

  - [x] 2.8 Create HeroSection component
    - Implement 7/5 asymmetric grid layout (desktop)
    - Stack layout vertically on mobile
    - Add gradient overlay on background
    - Include dual CTAs with primary/secondary styling
    - _Requirements: 3.2, 12.4_

- [x] 3. Implement API integration hooks
  - [x] 3.1 Create useProducts and useProduct hooks
    - Implement useProducts with filter parameters (category, organizationId, search, sortBy, priceRange, currency, page, limit)
    - Implement useProduct for single product fetch
    - Use TanStack Query with proper cache keys
    - _Requirements: 3.3, 4.2, 5.2_

  - [x] 3.2 Create useOrganizations and useOrganization hooks
    - Implement useOrganizations with filter parameters (category, search, sortBy, page, limit)
    - Implement useOrganization for single creator fetch
    - Implement useFollowOrganization mutation with cache invalidation
    - _Requirements: 3.8, 6.2, 6.5, 7.2_

  - [x] 3.3 Create useSubscriptions hook
    - Implement useSubscriptions with organizationId and featured filters
    - Use TanStack Query with proper cache keys
    - _Requirements: 3.6, 6.7_

  - [x] 3.4 Create useReviews hook
    - Implement useReviews for product reviews
    - Use TanStack Query with proper cache keys
    - _Requirements: 5.10_

  - [ ]\* 3.5 Write integration tests for API hooks
    - Test useProducts with various filter combinations
    - Test useOrganizations with search and sort
    - Test cache invalidation on mutations
    - _Requirements: 19.3_

- [ ] 4. Checkpoint - Verify base components and hooks
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Homepage (`/`)
  - [x] 5.1 Create homepage route at `app/(main)/(website)/(landing)/page.tsx`
    - Implement server-side data fetching for featured products, subscriptions, and creators
    - Use HeroSection component with asymmetric layout
    - Add CategoryPills for filtering (Digital Art, Templates, E-books, Music, Subscriptions)
    - Display featured products in 4-column bento grid
    - Display featured subscriptions in 3-column cards
    - Display trending creators in 2-column cards
    - Add social proof section with testimonials on primary background
    - Ensure public route (anonymous access)
    - _Requirements: 3.1-3.12_

  - [ ]\* 5.2 Write E2E test for homepage
    - Test hero section rendering
    - Test category pill navigation
    - Test featured products display
    - _Requirements: 19.6_

- [x] 6. Implement Browse Marketplace page (`/products`)
  - [x] 6.1 Create browse page route at `app/(main)/products/page.tsx`
    - Implement client-side filtering with useProducts hook
    - Add SearchBar in sticky header with live search
    - Render FilterSidebar on left (desktop) or drawer (mobile)
    - Display products in responsive grid (1/2/3/4 columns)
    - Add sort options (Newest, Popular, Price: Low-High, Price: High-Low)
    - Implement pagination or infinite scroll
    - Update grid without page reload on filter/sort changes
    - Ensure public route (anonymous access)
    - _Requirements: 4.1-4.12_

  - [ ]\* 6.2 Write property test for filter application
    - **Property 5: Filter Application Updates Display**
    - **Validates: Requirements 4.8**

  - [ ]\* 6.3 Write property test for sort parameter propagation
    - **Property 6: Sort Parameter Propagation**
    - **Validates: Requirements 4.9**

  - [ ]\* 6.4 Write property test for price filter currency respect
    - **Property 7: Price Filter Currency Respect**
    - **Validates: Requirements 4.11**

- [x] 7. Update Product Detail page (`/product/[slug]`)
  - [x] 7.1 Update existing product detail page styling
    - Apply editorial design system (tonal layering, Editorial shadow, Epilogue typography)
    - Update image gallery with 4:5 aspect ratio and thumbnail navigation
    - Update product info section with title, creator link, price, description
    - Update "Add to Cart" button to call POST /v1/cart/items
    - Update "Add to Wishlist" button to call POST /v1/wishlist/items with auth check
    - Display file details in tonal background section
    - Add creator profile card with follow button
    - Display related products in horizontal carousel
    - Display reviews with ratings
    - Show success feedback on cart/wishlist actions
    - Reuse existing components, update styling only
    - Ensure public route (anonymous access)
    - _Requirements: 5.1-5.14_

  - [ ]\* 7.2 Write property test for image gallery navigation
    - **Property 8: Image Gallery Navigation**
    - **Validates: Requirements 5.3**

  - [ ]\* 7.3 Write property test for product data completeness
    - **Property 9: Product Data Completeness**
    - **Validates: Requirements 5.4**

  - [ ]\* 7.4 Write property test for add to cart updates count
    - **Property 10: Add to Cart Updates Count**
    - **Validates: Requirements 5.11**

- [x] 8. Update Creator Storefront page (`/[organization]`)
  - [x] 8.1 Update existing creator storefront styling
    - Apply editorial design system to all sections
    - Update hero banner with creator avatar, cover image, bio
    - Display creator stats (product count, followers, joined date)
    - Update follow button to call POST /v1/organizations/{id}/follow with auth check
    - Implement tabs for Products, Subscriptions, About sections
    - Switch tab content without page reload using React state
    - Display products in grid matching browse page layout
    - Display subscription tiers if available
    - Reuse existing components, update styling only
    - Ensure public route (anonymous access)
    - _Requirements: 6.1-6.14_

  - [ ]\* 8.2 Write property test for tab switching
    - **Property 11: Tab Switching Updates Content**
    - **Validates: Requirements 6.9**

  - [ ]\* 8.3 Write property test for creator stats display
    - **Property 12: Creator Stats Display**
    - **Validates: Requirements 6.4**

- [x] 9. Implement Explore Creators page (`/creators`)
  - [x] 9.1 Create creators page route at `app/(main)/creators/page.tsx`
    - Implement client-side filtering with useOrganizations hook
    - Add SearchBar for finding creators by name
    - Add filter chips for category specialization
    - Display creator cards in responsive grid with avatar, name, bio, follower count
    - Display 3-4 sample products on each creator card
    - Add follow button on each card with auth check
    - Add sort options (Popular, Newest, Most Products)
    - Update grid without page reload on filter/sort changes
    - Implement pagination or infinite scroll
    - Navigate to creator storefront on card click
    - Ensure public route (anonymous access)
    - _Requirements: 7.1-7.12_
  - [ ]\* 9.2 Write property test for creator search filtering
    - **Property 13: Creator Search Filtering**
    - **Validates: Requirements 7.3**
  - [ ]\* 9.3 Write property test for creator sample products display
    - **Property 14: Creator Sample Products Display**
    - **Validates: Requirements 7.6**
  - [ ]\* 9.4 Write property test for creator card navigation
    - **Property 15: Creator Card Navigation**
    - **Validates: Requirements 7.10**

- [ ] 10. Checkpoint - Verify all pages render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update Shopping Cart page (`/cart`)
  - [x] 11.1 Update existing cart page styling
    - Apply editorial design system to all sections
    - Display cart items with product image, name, creator, price in selected currency
    - Update remove button to call DELETE /v1/cart/items/{id}
    - Update cart display without page reload on item removal
    - Calculate and display subtotal, tax, total in selected currency
    - Update "Proceed to Checkout" button to call POST /v1/checkout
    - Display empty cart state with "Browse Products" CTA
    - Add "Continue Shopping" link to browse page
    - Show loading states during cart operations
    - Display error message with retry on fetch failure
    - Reuse existing components, update styling only
    - Ensure protected route (authentication required)
    - _Requirements: 8.1-8.13_
  - [ ]\* 11.2 Write property test for cart item display completeness
    - **Property 16: Cart Item Display Completeness**
    - **Validates: Requirements 8.3**
  - [ ]\* 11.3 Write property test for cart item removal
    - **Property 17: Cart Item Removal Updates Display**
    - **Validates: Requirements 8.5**
  - [ ]\* 11.4 Write property test for cart total calculation
    - **Property 18: Cart Total Calculation**
    - **Validates: Requirements 8.6**
  - [ ]\* 11.5 Write integration test for cart operations
    - Test add to cart flow
    - Test remove from cart flow
    - Test checkout initiation
    - _Requirements: 19.3_

- [x] 12. Update Wishlist page (`/wishlist`)
  - [x] 12.1 Update existing wishlist page styling
    - Apply editorial design system to all sections
    - Display wishlist items in grid layout similar to browse page
    - Update "Move to Cart" button to call POST /v1/cart/items
    - Update remove button to call DELETE /v1/wishlist/items/{id}
    - Remove item from wishlist and show success feedback on move to cart
    - Update wishlist display without page reload on item removal
    - Display empty wishlist state with "Browse Products" CTA
    - Show product prices in selected currency
    - Show loading states during wishlist operations
    - Display error message with retry on fetch failure
    - Reuse existing components, update styling only
    - Ensure protected route (authentication required)
    - _Requirements: 9.1-9.13_
  - [ ]\* 12.2 Write property test for wishlist to cart transfer
    - **Property 19: Wishlist to Cart Transfer**
    - **Validates: Requirements 9.6**
  - [ ]\* 12.3 Write property test for wishlist item removal
    - **Property 20: Wishlist Item Removal Updates Display**
    - **Validates: Requirements 9.7**
  - [ ]\* 12.4 Write property test for wishlist currency display
    - **Property 21: Wishlist Currency Display**
    - **Validates: Requirements 9.9**
  - [ ]\* 12.5 Write integration test for wishlist operations
    - Test add to wishlist flow
    - Test move to cart flow
    - Test remove from wishlist flow
    - _Requirements: 19.4_

- [x] 13. Implement Help Center page (`/help`)
  - [x] 13.1 Create help page route at `app/(main)/help/page.tsx`
    - Display FAQ sections in accordion format
    - Expand/collapse FAQ answers on click without page reload
    - Add search input for filtering FAQ items
    - Filter FAQ items by matching keywords on search
    - Display community guidelines in readable format
    - Add links to creator resources
    - Add contact form for support requests with validation
    - Add newsletter signup form calling GET /v1/newsletter/subscribe
    - Validate form inputs before submission
    - Display success message on form submission success
    - Display error message with details on form submission failure
    - Ensure public route (anonymous access)
    - _Requirements: 10.1-10.13_
  - [ ]\* 13.2 Write property test for FAQ accordion toggle
    - **Property 22: FAQ Accordion Toggle**
    - **Validates: Requirements 10.3**
  - [ ]\* 13.3 Write property test for help search filtering
    - **Property 23: Help Search Filtering**
    - **Validates: Requirements 10.5**
  - [ ]\* 13.4 Write property test for newsletter form submission
    - **Property 24: Newsletter Form Submission**
    - **Validates: Requirements 10.9**
  - [ ]\* 13.5 Write property test for form validation rejection
    - **Property 25: Form Validation Rejection**
    - **Validates: Requirements 10.10**

- [x] 14. Implement multi-currency system
  - [x] 14.1 Verify CurrencySelector component exists and works
    - Check existing implementation at `clients/apps/web/src/components/CurrencySelector.tsx`
    - Verify support for all 37 currencies
    - Verify localStorage persistence
    - No changes needed if working correctly
    - _Requirements: 2.1-2.4_
  - [x] 14.2 Create currency formatting utility
    - Implement format_currency function dividing by 100 for most currencies, by 1 for zero-decimal (JPY, KRW, CLP, PYG, VND)
    - Display currency symbol with amount (KSh, $, €, £)
    - Use title-lg typography for price display
    - _Requirements: 2.6, 2.7_
  - [x] 14.3 Implement multi-price currency matching
    - Display price matching selected currency from product.prices array
    - Show fallback message if product lacks price for selected currency
    - _Requirements: 2.8, 2.9_
  - [ ]\* 14.4 Write property test for currency persistence
    - **Property 1: Currency Persistence**
    - **Validates: Requirements 2.5**
  - [ ]\* 14.5 Write property test for price display completeness
    - **Property 2: Price Display Completeness**
    - **Validates: Requirements 2.1, 2.7**
  - [ ]\* 14.6 Write property test for currency formatting correctness
    - **Property 3: Currency Formatting Correctness**
    - **Validates: Requirements 2.6**
  - [ ]\* 14.7 Write property test for multi-price currency matching
    - **Property 4: Multi-Price Currency Matching**
    - **Validates: Requirements 2.8**
  - [ ]\* 14.8 Write unit tests for currency formatting
    - Test zero-decimal currencies (JPY, KRW)
    - Test standard currencies (USD, EUR, KES)
    - Test missing price data handling
    - _Requirements: 19.1_

- [x] 15. Implement authentication integration
  - [x] 15.1 Configure route protection
    - Protect /cart and /wishlist routes requiring authentication
    - Allow anonymous access to /, /products, /product/[slug], /[organization], /creators, /help
    - Redirect unauthenticated users to login with returnUrl parameter
    - _Requirements: 13.2, 13.3, 13.4_
  - [x] 15.2 Add authentication checks to protected actions
    - Show login modal on "Add to Wishlist" click if unauthenticated
    - Show login modal on "Follow Creator" click if unauthenticated
    - Redirect to originally requested page after successful authentication
    - _Requirements: 13.5, 13.6, 13.7_
  - [x] 15.3 Update header with user state
    - Display user avatar and name when authenticated
    - Add logout functionality in user menu
    - Persist authentication state across page navigations
    - _Requirements: 13.8, 13.9, 13.10_
  - [ ]\* 15.4 Write property test for protected route authentication
    - **Property 26: Protected Route Authentication**
    - **Validates: Requirements 13.2, 13.4**
  - [ ]\* 15.5 Write property test for authentication redirect preservation
    - **Property 27: Authentication Redirect Preservation**
    - **Validates: Requirements 13.7**
  - [ ]\* 15.6 Write property test for authentication state persistence
    - **Property 28: Authentication State Persistence**
    - **Validates: Requirements 13.10**
  - [ ]\* 15.7 Write integration tests for authentication flows
    - Test protected route redirect
    - Test login modal for protected actions
    - Test post-login redirect
    - _Requirements: 19.5_

- [x] 16. Implement performance optimizations
  - [x] 16.1 Optimize image loading
    - Use Next.js Image component for all product and creator images
    - Implement lazy loading for product grids and creator cards
    - Add responsive srcset attributes
    - _Requirements: 14.1, 14.2, 12.7_
  - [x] 16.2 Implement code splitting and prefetching
    - Use route-based code splitting (automatic with Next.js App Router)
    - Prefetch linked pages on hover using Next.js Link component
    - _Requirements: 14.3, 14.4_
  - [x] 16.3 Add loading states and caching
    - Implement skeleton loading states for async data fetching
    - Cache API responses using TanStack Query with appropriate stale times
    - _Requirements: 14.5, 14.6_
  - [x] 16.4 Optimize bundle size
    - Tree-shake unused code (automatic with Next.js)
    - Verify bundle size is optimized
    - _Requirements: 14.7_

- [x] 17. Implement accessibility features
  - [x] 17.1 Add ARIA labels and semantic HTML
    - Add ARIA labels for all interactive elements
    - Use semantic HTML (nav, main, article, section)
    - Add alt text for all product and creator images
    - _Requirements: 15.1, 15.4, 15.5_
  - [x] 17.2 Implement keyboard navigation
    - Support full keyboard navigation (Tab, Enter, Escape, Arrow keys)
    - Maintain focus indicators with 3:1 contrast ratio
    - Add skip links to main content
    - _Requirements: 15.2, 15.3, 15.7_
  - [x] 17.3 Add screen reader support
    - Announce dynamic content changes using ARIA live regions
    - Support screen reader navigation with proper heading hierarchy
    - _Requirements: 15.8, 15.9_

- [x] 18. Implement SEO and metadata
  - [x] 18.1 Add page metadata
    - Include meta title and description for each page
    - Generate Open Graph tags for social media sharing
    - Set appropriate meta robots tags
    - _Requirements: 16.1, 16.2, 16.9_
  - [x] 18.2 Add structured data
    - Include JSON-LD structured data for products (Schema.org Product type)
    - Include structured data for creators (Schema.org Person/Organization type)
    - _Requirements: 16.3, 16.4_
  - [x] 18.3 Configure URLs and sitemap
    - Generate canonical URLs for all pages
    - Create sitemap.xml with all public pages
    - Use descriptive URLs (e.g., /product/savannah-mist-preset)
    - Implement proper heading hierarchy (single h1 per page)
    - _Requirements: 16.5, 16.6, 16.7, 16.8_

- [x] 19. Implement error handling and loading states
  - [x] 19.1 Add loading states
    - Display skeleton loaders while fetching product data
    - Display spinner indicators during cart and wishlist operations
    - _Requirements: 17.1, 17.2_
  - [x] 19.2 Add success and error notifications
    - Show success toast after successful operations (add to cart, follow creator)
    - Show error toast when operations fail
    - _Requirements: 17.3, 17.4_
  - [x] 19.3 Add error states and pages
    - Display error state with retry button on product fetch failure
    - Display 404 page for not found errors
    - Display 500 page for server errors
    - Display empty states with helpful CTAs when no data exists
    - Disable buttons during async operations to prevent double-submission
    - Log errors to console for debugging
    - _Requirements: 17.5, 17.6, 17.7, 17.8, 17.9, 17.10_

- [ ] 20. Final checkpoint and testing
  - [ ] 20.1 Run all tests and verify coverage
    - Run unit tests with `pnpm test`
    - Run E2E tests with Playwright
    - Verify 80% code coverage for business logic
    - _Requirements: 19.8_
  - [ ] 20.2 Test responsive design
    - Test layouts on mobile (320px-767px), tablet (768px-1023px), desktop (1024px+)
    - Test on iOS Safari, Android Chrome, desktop browsers
    - Verify touch targets are minimum 44px
    - _Requirements: 12.1-12.10_
  - [ ] 20.3 Run Lighthouse audits
    - Achieve performance score above 90 on desktop
    - Achieve performance score above 70 on mobile
    - Achieve SEO score above 90
    - Verify initial page load within 2 seconds on 3G
    - _Requirements: 14.8, 14.9, 14.10, 16.10_
  - [ ] 20.4 Test accessibility compliance
    - Test with NVDA, JAWS, and VoiceOver screen readers
    - Verify color contrast ratios meet WCAG AA standards (4.5:1)
    - Verify keyboard navigation works for all interactions
    - _Requirements: 15.6, 15.10_

- [ ] 21. Final integration and wiring
  - Ensure all pages are linked correctly in navigation
  - Verify all API endpoints are integrated
  - Test complete user journeys (browse → product detail → add to cart → checkout)
  - Verify currency selection persists across all pages
  - Ensure authentication state is consistent across all pages
  - _Requirements: All requirements_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All implementation reuses existing components from `clients/apps/web/src/components/`
- Styling updates only for existing pages (Product Detail, Creator Storefront, Cart, Wishlist)
- New pages: Homepage, Browse Marketplace, Explore Creators, Help Center
- Multi-currency support with KES as default
- Editorial design system with tonal layering and Editorial shadows

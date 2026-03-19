# Design Document: Marketplace Homepage

## Overview

The Marketplace Homepage is a server-side rendered Next.js page that serves as the primary product discovery interface for the Blyss platform. It displays all publicly available products from all creators, providing visitors with search, filtering, sorting, and pagination capabilities. The design follows Next.js 14 App Router conventions with React Server Components for optimal SEO and performance.

The homepage consists of three main sections:
1. A hero section with platform messaging and creator call-to-action
2. A featured products carousel (when featured products exist)
3. A filterable, sortable, paginated product grid

The implementation leverages existing Polar infrastructure including the product API, UI component library, and established patterns for data fetching and state management.

### Key Design Principles

1. **SEO-First**: Server-side rendering for optimal search engine indexing
2. **Performance**: Lazy loading, pagination, and caching for fast load times
3. **Reusability**: Leverage existing Product_Card and UI components
4. **URL State**: All filters reflected in URL for shareability
5. **Progressive Enhancement**: Core functionality works without JavaScript

## Architecture

### Component Hierarchy

```
MarketplaceHomepage (Server Component)
├── HeroSection
│   ├── Heading
│   ├── Description
│   └── BecomeCreatorButton
├── FeaturedProductsSection (conditional)
│   ├── SectionHeading
│   └── ProductCarousel
│       └── ProductCard[] (max 6)
├── FilterBar (Client Component)
│   ├── SearchInput
│   ├── CategoryFilter
│   ├── PriceRangeFilter
│   └── SortSelect
├── ProductGrid
│   ├── ProductCount
│   ├── ProductCard[] (24 per page)
│   └── EmptyState (conditional)
└── PaginationControls
    ├── PageNumbers
    ├── PreviousButton
    └── NextButton
```

### Data Flow

```
URL Query Parameters
    ↓
Server Component (Initial Fetch)
    ↓
Client Hydration
    ↓
Filter Changes → Update URL → Trigger Re-fetch
    ↓
TanStack Query (Client-side)
    ↓
API Endpoint (/v1/products/public)
    ↓
Render Updated Product Grid
```

### State Management Strategy

**Server State** (Initial Load):
- Products fetched server-side for SEO
- Filters applied from URL query parameters
- Initial data passed to client components

**Client State** (Interactions):
- URL query parameters managed by `nuqs`
- Data fetching managed by TanStack Query
- Filter state synced with URL automatically

## Components and Interfaces

### 1. Backend API Endpoint

**Component**: `PublicProductsEndpoint`

**Purpose**: Provide public access to product listings with filtering and pagination

**Location**: `server/polar/product/endpoints.py`

**Interface**:

```python
@router.get("/public", response_model=ListResource[ProductPublic])
async def list_public_products(
    search: str | None = Query(None, description="Search products by name"),
    category: str | None = Query(None, description="Filter by category"),
    min_price: int | None = Query(None, description="Minimum price in cents"),
    max_price: int | None = Query(None, description="Maximum price in cents"),
    sort: Literal["newest", "price_asc", "price_desc"] = Query("newest"),
    is_featured: bool | None = Query(None, description="Filter featured products"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[ProductPublic]:
    """
    Public endpoint for listing products.
    No authentication required.
    """
    pass
```

**Business Logic**:
- Query only products with `is_archived=False`
- Apply search filter using case-insensitive LIKE on product name
- Apply category filter if provided
- Apply price range filters (min_price <= price <= max_price)
- Apply featured filter if requested
- Sort by creation date (newest), price ascending, or price descending
- Paginate results (default 24 per page)
- Return product data with creator information

### 2. Data Fetching Hooks

**Component**: `usePublicProducts`

**Purpose**: Client-side hook for fetching and caching product data

**Location**: `clients/apps/web/src/hooks/queries/products.ts`

**Interface**:

```typescript
interface UsePublicProductsParams {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price_asc' | 'price_desc'
  isFeatured?: boolean
  page?: number
  limit?: number
}

interface UsePublicProductsResult {
  products: Product[]
  totalCount: number
  isLoading: boolean
  isError: boolean
  error: Error | null
}

function usePublicProducts(
  params: UsePublicProductsParams
): UsePublicProductsResult
```

**Implementation Details**:
- Use TanStack Query with `keepPreviousData` for smooth transitions
- Cache key includes all filter parameters
- Stale time: 5 minutes
- Refetch on window focus: false (static content)

### 3. Hero Section Component

**Component**: `HeroSection`

**Purpose**: Display platform value proposition and creator CTA

**Location**: `clients/apps/web/src/components/Marketplace/HeroSection.tsx`

**Interface**:

```typescript
interface HeroSectionProps {
  className?: string
}

export function HeroSection({ className }: HeroSectionProps): JSX.Element
```

**Content**:
- Heading: "Discover Amazing Products from Kenyan Creators"
- Description: "Support local creators and find unique digital products, courses, and more"
- CTA Button: "Become a Creator" → links to `/signup?type=creator`

**Styling**:
- Full-width background with gradient
- Centered content with max-width container
- Responsive text sizing
- Prominent CTA button

### 4. Search Input Component

**Component**: `SearchInput`

**Purpose**: Real-time product search with debouncing

**Location**: `clients/packages/ui/src/components/molecules/SearchInput.tsx`

**Interface**:

```typescript
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search products...',
  debounceMs = 300,
  className,
}: SearchInputProps): JSX.Element
```

**Implementation Details**:
- Debounce input changes (300ms default)
- Clear button when value is not empty
- Search icon indicator
- Accessible label and ARIA attributes

### 5. Category Filter Component

**Component**: `CategoryFilter`

**Purpose**: Single-select category filtering

**Location**: `clients/packages/ui/src/components/molecules/CategoryFilter.tsx`

**Interface**:

```typescript
interface Category {
  id: string
  name: string
  count: number
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
  onChange: (categoryId: string | null) => void
  className?: string
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onChange,
  className,
}: CategoryFilterProps): JSX.Element
```

**Implementation Details**:
- Radio button group for single selection
- "All Categories" option to clear filter
- Display product count per category
- Highlight selected category

### 6. Price Range Filter Component

**Component**: `PriceRangeFilter`

**Purpose**: Min/max price filtering

**Location**: `clients/packages/ui/src/components/molecules/PriceRangeFilter.tsx`

**Interface**:

```typescript
interface PriceRangeFilterProps {
  minPrice: number | null
  maxPrice: number | null
  onMinPriceChange: (value: number | null) => void
  onMaxPriceChange: (value: number | null) => void
  currency?: string
  className?: string
}

export function PriceRangeFilter({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  currency = 'KES',
  className,
}: PriceRangeFilterProps): JSX.Element
```

**Implementation Details**:
- Two number input fields (min and max)
- Validation: min <= max
- Clear buttons for each field
- Currency symbol display
- Debounced onChange (500ms)

### 7. Sort Select Component

**Component**: `SortSelect`

**Purpose**: Product sorting dropdown

**Location**: `clients/packages/ui/src/components/molecules/SortSelect.tsx`

**Interface**:

```typescript
type SortOption = 'newest' | 'price_asc' | 'price_desc'

interface SortSelectProps {
  value: SortOption
  onChange: (value: SortOption) => void
  className?: string
}

export function SortSelect({
  value,
  onChange,
  className,
}: SortSelectProps): JSX.Element
```

**Options**:
- "Newest First" (newest)
- "Price: Low to High" (price_asc)
- "Price: High to Low" (price_desc)

### 8. Product Card Component

**Component**: `ProductCard`

**Purpose**: Display product information in grid

**Location**: Reuse existing `clients/packages/ui/src/components/molecules/ProductCard.tsx`

**Interface**:

```typescript
interface ProductCardProps {
  product: Product
  onClick?: () => void
  className?: string
}

export function ProductCard({
  product,
  onClick,
  className,
}: ProductCardProps): JSX.Element
```

**Display Elements**:
- Product image (lazy loaded)
- Product name
- Creator name
- Price (formatted in KES)
- Category badge
- "View Product" button

### 9. Empty State Component

**Component**: `EmptyState`

**Purpose**: Display message when no products match filters

**Location**: `clients/packages/ui/src/components/molecules/EmptyState.tsx`

**Interface**:

```typescript
interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps): JSX.Element
```

**Variants**:
- No products match filters: "No products found" + "Clear Filters" button
- No products on platform: "Marketplace coming soon" + "Become a Creator" button

### 10. Pagination Controls Component

**Component**: `PaginationControls`

**Purpose**: Navigate between product pages

**Location**: `clients/packages/ui/src/components/molecules/PaginationControls.tsx`

**Interface**:

```typescript
interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationControlsProps): JSX.Element
```

**Implementation Details**:
- Previous/Next buttons
- Page number buttons (show 5 at a time)
- Ellipsis for skipped pages
- Disabled state for first/last pages
- Scroll to top on page change

## Data Models

### Product (Public Schema)

```typescript
interface ProductPublic {
  id: string
  name: string
  description: string
  price: number // in cents
  currency: string
  images: string[] // URLs
  category: string
  isFeatured: boolean
  createdAt: string
  creator: {
    id: string
    name: string
    slug: string
    avatar: string | null
  }
}
```

### Category

```typescript
interface Category {
  id: string
  name: string
  slug: string
  productCount: number
}
```

### Filter State

```typescript
interface FilterState {
  search: string | null
  category: string | null
  minPrice: number | null
  maxPrice: number | null
  sort: 'newest' | 'price_asc' | 'price_desc'
  page: number
}
```

## URL State Management

### Query Parameter Schema

```
/?search=<string>
 &category=<string>
 &min_price=<number>
 &max_price=<number>
 &sort=<newest|price_asc|price_desc>
 &page=<number>
```

### Implementation with nuqs

```typescript
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs'

const filterParsers = {
  search: parseAsString,
  category: parseAsString,
  min_price: parseAsInteger,
  max_price: parseAsInteger,
  sort: parseAsString.withDefault('newest'),
  page: parseAsInteger.withDefault(1),
}

function useMarketplaceFilters() {
  const [filters, setFilters] = useQueryStates(filterParsers)

  return {
    filters,
    setSearch: (search: string | null) => setFilters({ search }),
    setCategory: (category: string | null) => setFilters({ category, page: 1 }),
    setPriceRange: (min: number | null, max: number | null) =>
      setFilters({ min_price: min, max_price: max, page: 1 }),
    setSort: (sort: string) => setFilters({ sort, page: 1 }),
    setPage: (page: number) => setFilters({ page }),
    clearFilters: () => setFilters({
      search: null,
      category: null,
      min_price: null,
      max_price: null,
      sort: 'newest',
      page: 1,
    }),
  }
}
```

## Correctness Properties

### Property 1: Search Results Accuracy

For any search query, all returned products must have names containing the search query (case-insensitive).

**Validates: Requirements 3.2, 3.5**

### Property 2: Category Filter Exclusivity

For any selected category, all returned products must belong to that category, and no products from other categories should be included.

**Validates: Requirements 4.2**

### Property 3: Price Range Boundaries

For any price range (min, max), all returned products must have prices where min <= price <= max.

**Validates: Requirements 5.2, 5.3, 5.4**

### Property 4: Sort Order Consistency

For any sort option, the returned products must be ordered according to the specified criteria (newest, price ascending, or price descending).

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 5: Pagination Completeness

For any page number and limit, the total count of products across all pages must equal the total number of products matching the filters.

**Validates: Requirements 8.1, 8.2**

### Property 6: Filter Combination Correctness

For any combination of filters (search + category + price range), all returned products must satisfy ALL filter criteria simultaneously.

**Validates: Requirements 11.1, 11.2**

### Property 7: URL State Synchronization

For any filter state, the URL query parameters must accurately reflect the current filter values, and loading a URL with parameters must apply those filters.

**Validates: Requirements 11.3, 11.4**

## Error Handling

### API Errors

**Scenario**: Backend API returns error response

**Handling**:
- Display error message to user
- Provide retry button
- Log error details for debugging
- Fallback to empty state with helpful message

**Implementation**:

```typescript
if (isError) {
  return (
    <EmptyState
      title="Failed to load products"
      description="We couldn't load the products. Please try again."
      actionLabel="Retry"
      onAction={() => refetch()}
    />
  )
}
```

### Invalid Filter Parameters

**Scenario**: User provides invalid filter values (e.g., negative prices, invalid sort option)

**Handling**:
- Validate parameters on client before sending
- Backend returns 422 with descriptive error
- Reset invalid parameters to defaults
- Show validation error message

**Implementation**:

```typescript
function validatePriceRange(min: number | null, max: number | null): boolean {
  if (min !== null && min < 0) return false
  if (max !== null && max < 0) return false
  if (min !== null && max !== null && min > max) return false
  return true
}
```

### Empty Results

**Scenario**: No products match the current filters

**Handling**:
- Display empty state with clear message
- Suggest adjusting or clearing filters
- Provide "Clear Filters" button
- Show different message if platform has no products

**Implementation**:

```typescript
if (products.length === 0) {
  const hasActiveFilters = search || category || minPrice || maxPrice

  if (hasActiveFilters) {
    return (
      <EmptyState
        title="No products found"
        description="Try adjusting your filters to see more results."
        actionLabel="Clear Filters"
        onAction={clearFilters}
      />
    )
  } else {
    return (
      <EmptyState
        title="Marketplace coming soon"
        description="We're populating the marketplace with amazing products from creators."
        actionLabel="Become a Creator"
        onAction={() => router.push('/signup?type=creator')}
      />
    )
  }
}
```

### Network Errors

**Scenario**: Network request fails or times out

**Handling**:
- Show loading state during request
- Display error message on failure
- Provide retry mechanism
- Cache previous results if available

**Implementation**:

```typescript
const { data, isLoading, isError, error, refetch } = usePublicProducts(filters, {
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  staleTime: 5 * 60 * 1000, // 5 minutes
  keepPreviousData: true,
})
```

### Image Loading Errors

**Scenario**: Product image fails to load

**Handling**:
- Show placeholder image
- Log error for monitoring
- Don't break product card layout

**Implementation**:

```typescript
<Image
  src={product.images[0] || '/placeholder-product.png'}
  alt={product.name}
  onError={(e) => {
    e.currentTarget.src = '/placeholder-product.png'
  }}
  loading="lazy"
/>
```

## Performance Optimizations

### Server-Side Rendering

- Initial page load uses React Server Components
- Products fetched server-side for SEO
- HTML sent to client with initial data
- Client hydrates with interactive features

### Image Optimization

- Use Next.js Image component for automatic optimization
- Lazy load images below the fold
- Serve WebP format with fallbacks
- Set appropriate cache headers (1 year)

### Data Fetching

- TanStack Query caching (5 minute stale time)
- `keepPreviousData` for smooth filter transitions
- Prefetch next page on hover
- Debounce search input (300ms)

### Code Splitting

- Lazy load filter components
- Separate bundle for pagination
- Dynamic imports for heavy dependencies

### Database Query Optimization

- Index on product name for search
- Index on category for filtering
- Index on price for range queries
- Index on created_at for sorting
- Composite index for common filter combinations

## Testing Strategy

### Property-Based Testing

**Library**: `fast-check` for frontend, `hypothesis` for backend

**Configuration**:
- Minimum 100 iterations per property
- Tag format: `Feature: marketplace-homepage, Property {number}: {property_text}`

**Example Property Test**:

```typescript
import fc from 'fast-check'

describe('Feature: marketplace-homepage, Property 3: Price Range Boundaries', () => {
  it('should only return products within price range', () => {
    fc.assert(
      fc.property(
        fc.record({
          minPrice: fc.integer({ min: 0, max: 100000 }),
          maxPrice: fc.integer({ min: 0, max: 100000 }),
        }),
        async ({ minPrice, maxPrice }) => {
          fc.pre(minPrice <= maxPrice) // Precondition

          const products = await fetchPublicProducts({ minPrice, maxPrice })

          products.forEach(product => {
            expect(product.price).toBeGreaterThanOrEqual(minPrice)
            expect(product.price).toBeLessThanOrEqual(maxPrice)
          })
        },
      ),
      { numRuns: 100 },
    )
  })
})
```

### Unit Tests

**Critical Test Cases**:

1. **API Endpoint**
   - Returns products without authentication
   - Applies search filter correctly
   - Applies category filter correctly
   - Applies price range filter correctly
   - Sorts products correctly
   - Paginates results correctly
   - Returns 422 for invalid parameters

2. **Filter Components**
   - SearchInput debounces input
   - CategoryFilter selects single category
   - PriceRangeFilter validates min <= max
   - SortSelect updates sort order

3. **URL State**
   - Filters sync to URL parameters
   - URL parameters apply on page load
   - Clearing filters resets URL

4. **Empty States**
   - Shows correct message for no results
   - Shows correct message for no products
   - Clear filters button works

### Integration Tests

**End-to-End Scenarios**:

1. **Discovery Flow**
   - Load homepage → see products
   - Search for product → see filtered results
   - Select category → see category products
   - Set price range → see products in range
   - Change sort order → see reordered products
   - Navigate pages → see different products

2. **Filter Combination**
   - Apply search + category → see combined results
   - Apply all filters → see fully filtered results
   - Clear filters → see all products again

3. **URL Sharing**
   - Apply filters → copy URL
   - Open URL in new tab → see same filters applied

### Performance Tests

**Metrics to Validate**:

- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- API response time < 500ms
- Image loading optimized (lazy loading works)
- No layout shift during loading

**Tools**:
- Lighthouse CI for performance metrics
- WebPageTest for real-world testing
- Chrome DevTools for profiling

### Manual Testing Checklist

- [ ] Homepage loads without authentication
- [ ] Products display in grid layout
- [ ] Search filters products correctly
- [ ] Category filter works
- [ ] Price range filter works
- [ ] Sort options work
- [ ] Pagination works
- [ ] Featured products section shows (when products are featured)
- [ ] Empty state shows when no results
- [ ] Clear filters button works
- [ ] URL parameters sync with filters
- [ ] Shared URLs apply filters correctly
- [ ] Images load correctly (with lazy loading)
- [ ] Mobile responsive layout works
- [ ] Keyboard navigation works
- [ ] Screen reader accessibility works

# Design Document: Blyss Marketplace Frontend Implementation

## Overview

This design document specifies the technical architecture for implementing the Blyss Marketplace frontend, converting 8 HTML design files into fully functional React/Next.js pages. The implementation updates 4 existing pages (Product Detail, Creator Storefront, Shopping Cart, Wishlist) and creates 4 new pages (Homepage, Browse Marketplace, Explore Creators, Help Center).

The marketplace follows an editorial design system emphasizing tonal layering, asymmetrical layouts, and premium aesthetics. It supports multi-currency pricing with Kenya Shillings (KES) as the default, targeting Kenyan creators and global audiences.

### Key Design Principles

1. **Component Reuse**: Leverage existing components from `clients/apps/web/src/components/` to maintain consistency and avoid duplication
2. **Styling Updates Only**: Update existing pages by modifying styles, not recreating components
3. **API Integration**: Use existing `@polar-sh/sdk` client and TanStack Query patterns
4. **Editorial Design**: Implement tonal layering, Editorial shadows, and asymmetrical spacing
5. **Multi-Currency Support**: Display prices in 37 currencies with KES as default
6. **Performance**: Optimize with Next.js Image, lazy loading, and route-based code splitting
7. **Accessibility**: Maintain WCAG AA compliance with semantic HTML and ARIA labels

## Architecture

### Technology Stack

- **Framework**: Next.js 14+ with App Router
- **UI Library**: React 18+
- **Styling**: Tailwind CSS v4 with custom design tokens
- **State Management**: TanStack Query for server state, Zustand for client state
- **API Client**: `@polar-sh/sdk` (generated TypeScript client)
- **Authentication**: Existing FastAPI auth system from `server/polar/auth/`
- **Fonts**: Epilogue (display/headline), Inter (body/labels)
- **Testing**: Vitest for unit tests, Playwright for E2E tests

### Directory Structure

```
clients/apps/web/src/
├── app/(main)/
│   ├── (website)/
│   │   └── (landing)/
│   │       └── page.tsx              # NEW: Homepage
│   ├── products/
│   │   └── page.tsx                  # NEW: Browse Marketplace
│   ├── product/[slug]/
│   │   └── page.tsx                  # UPDATE: Product Detail
│   ├── [organization]/
│   │   └── page.tsx                  # UPDATE: Creator Storefront
│   ├── creators/
│   │   └── page.tsx                  # NEW: Explore Creators
│   ├── cart/
│   │   └── page.tsx                  # UPDATE: Shopping Cart
│   ├── wishlist/
│   │   └── page.tsx                  # UPDATE: Wishlist
│   └── help/
│       └── page.tsx                  # NEW: Help Center
├── components/
│   ├── Marketplace/                  # NEW: Marketplace-specific components
│   │   ├── HeroSection.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── CreatorCard.tsx
│   │   ├── FilterSidebar.tsx
│   │   ├── CategoryPills.tsx
│   │   └── SearchBar.tsx
│   ├── Products/                     # EXISTING: Reuse and update
│   ├── Cart/                         # EXISTING: Reuse and update
│   ├── Wishlist/                     # EXISTING: Reuse and update
│   └── CurrencySelector.tsx          # EXISTING: Already implemented
├── hooks/
│   └── queries/
│       ├── cart.ts                   # EXISTING: useCart, useAddToCart
│       ├── wishlist.ts               # EXISTING: useWishlist
│       ├── products.ts               # NEW: useProducts, useProduct
│       ├── organizations.ts          # NEW: useOrganizations, useOrganization
│       └── subscriptions.ts          # NEW: useSubscriptions
└── styles/
    └── globals.css                   # UPDATE: Add design tokens
```

### Page Architecture

#### Public Pages (Anonymous Access)

- `/` - Homepage
- `/products` - Browse Marketplace
- `/product/[slug]` - Product Detail
- `/[organization]` - Creator Storefront
- `/creators` - Explore Creators
- `/help` - Help Center

#### Protected Pages (Authentication Required)

- `/cart` - Shopping Cart
- `/wishlist` - Wishlist

### Data Flow

```
User Action → React Component → TanStack Query Hook → API Client → FastAPI Backend
                    ↓
              Optimistic Update (if applicable)
                    ↓
              UI Feedback (loading/success/error)
                    ↓
              Cache Invalidation & Refetch
```

### Authentication Flow

```
1. User accesses protected route (/cart, /wishlist)
2. Middleware checks authentication state
3. If unauthenticated → Redirect to /login with returnUrl
4. If authenticated → Render page with user context
5. Protected actions (Add to Wishlist, Follow) → Show login modal if unauthenticated
```

## Components and Interfaces

### Core Components

#### 1. CurrencySelector (EXISTING)

**Location**: `clients/apps/web/src/components/CurrencySelector.tsx`

**Status**: Already implemented, no changes needed

**Props**:

```typescript
interface CurrencySelectorProps {
  value?: PresentmentCurrency | null
  onChange: (value: string) => void
  disabled?: boolean
  excludeCurrencies?: string[]
  placeholder?: string
  className?: string
}
```

**Features**:

- Supports all 37 currencies from PresentmentCurrency enum
- Pinned currencies: KES, USD, EUR, GBP
- Searchable dropdown with currency codes and names
- Persists selection to localStorage

#### 2. ProductCard (UPDATE)

**Location**: `clients/apps/web/src/components/Products/ProductCard.tsx`

**Status**: Update styling to match editorial design

**Changes**:

- Apply `surface_container_lowest` background
- Use 4:5 aspect ratio for product images
- Apply Editorial shadow on hover
- Update typography to use Epilogue for product name
- Use `title-lg` for price display
- Remove borders, use tonal layering

**Props**:

```typescript
interface ProductCardProps {
  product: Product | CheckoutProduct
  organization: Organization
  currency: string
  onAddToCart?: (productId: string) => void
  onAddToWishlist?: (productId: string) => void
}
```

#### 3. CreatorCard (NEW)

**Location**: `clients/apps/web/src/components/Marketplace/CreatorCard.tsx`

**Purpose**: Display creator information in grid layouts

**Props**:

```typescript
interface CreatorCardProps {
  creator: Organization
  sampleProducts?: Product[]
  onFollow?: (creatorId: string) => void
  showFollowButton?: boolean
}
```

**Features**:

- Display creator avatar, name, bio snippet
- Show follower count and product count
- Display 3-4 sample product thumbnails
- Follow button with authentication check
- Link to creator storefront

#### 4. FilterSidebar (NEW)

**Location**: `clients/apps/web/src/components/Marketplace/FilterSidebar.tsx`

**Purpose**: Provide filtering options for browse pages

**Props**:

```typescript
interface FilterSidebarProps {
  categories: Category[]
  selectedCategories: string[]
  priceRange: [number, number]
  selectedCurrency: PresentmentCurrency
  onCategoryChange: (categories: string[]) => void
  onPriceRangeChange: (range: [number, number]) => void
  onClearFilters: () => void
}
```

**Features**:

- Category checkboxes
- Price range slider (respects selected currency)
- Creator filter (for browse products)
- Clear all filters button
- Collapsible on mobile (drawer)

#### 5. SearchBar (NEW)

**Location**: `clients/apps/web/src/components/Marketplace/SearchBar.tsx`

**Purpose**: Provide search functionality with live results

**Props**:

```typescript
interface SearchBarProps {
  placeholder: string
  onSearch: (query: string) => void
  debounceMs?: number
  showResults?: boolean
  results?: SearchResult[]
}
```

**Features**:

- Debounced search input (300ms default)
- Live search results dropdown
- Keyboard navigation (arrow keys, enter, escape)
- Clear button
- Loading indicator

#### 6. ProductGrid (NEW)

**Location**: `clients/apps/web/src/components/Marketplace/ProductGrid.tsx`

**Purpose**: Responsive grid layout for products

**Props**:

```typescript
interface ProductGridProps {
  products: Product[]
  currency: string
  columns?: { mobile: number; tablet: number; desktop: number }
  loading?: boolean
  emptyState?: React.ReactNode
}
```

**Features**:

- Responsive columns (1/2/3/4 based on viewport)
- Skeleton loading states
- Empty state with CTA
- Lazy loading with intersection observer

#### 7. HeroSection (NEW)

**Location**: `clients/apps/web/src/components/Marketplace/HeroSection.tsx`

**Purpose**: Homepage hero with asymmetric layout

**Props**:

```typescript
interface HeroSectionProps {
  title: string
  subtitle: string
  primaryCTA: { text: string; href: string }
  secondaryCTA: { text: string; href: string }
  backgroundImage?: string
}
```

**Features**:

- 7/5 asymmetric grid layout (desktop)
- Stacked layout (mobile)
- Gradient overlay on background
- Dual CTAs with primary/secondary styling

### API Integration Hooks

#### useProducts

**Location**: `clients/apps/web/src/hooks/queries/products.ts`

```typescript
interface UseProductsParams {
  category?: string
  organizationId?: string
  search?: string
  sortBy?: 'newest' | 'popular' | 'price_asc' | 'price_desc'
  priceMin?: number
  priceMax?: number
  currency?: PresentmentCurrency
  page?: number
  limit?: number
}

export const useProducts = (params: UseProductsParams) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () =>
      unwrap(api.GET('/v1/products', { params: { query: params } })),
    retry: defaultRetry,
  })
}

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () =>
      unwrap(api.GET('/v1/products/{id}', { params: { path: { id } } })),
    retry: defaultRetry,
  })
}
```

#### useOrganizations

**Location**: `clients/apps/web/src/hooks/queries/organizations.ts`

```typescript
interface UseOrganizationsParams {
  category?: string
  search?: string
  sortBy?: 'popular' | 'newest' | 'most_products'
  page?: number
  limit?: number
}

export const useOrganizations = (params: UseOrganizationsParams) => {
  return useQuery({
    queryKey: ['organizations', params],
    queryFn: () =>
      unwrap(api.GET('/v1/organizations', { params: { query: params } })),
    retry: defaultRetry,
  })
}

export const useOrganization = (slug: string) => {
  return useQuery({
    queryKey: ['organization', slug],
    queryFn: () =>
      unwrap(
        api.GET('/v1/organizations/{slug}', { params: { path: { slug } } }),
      ),
    retry: defaultRetry,
  })
}

export const useFollowOrganization = () => {
  const queryClient = getQueryClient()

  return useMutation({
    mutationFn: (organizationId: string) =>
      api.POST('/v1/organizations/{id}/follow', {
        params: { path: { id: organizationId } },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast({
        title: 'Success',
        description: 'Following creator',
        variant: 'success',
      })
    },
  })
}
```

#### useSubscriptions

**Location**: `clients/apps/web/src/hooks/queries/subscriptions.ts`

```typescript
interface UseSubscriptionsParams {
  organizationId?: string
  featured?: boolean
}

export const useSubscriptions = (params: UseSubscriptionsParams) => {
  return useQuery({
    queryKey: ['subscriptions', params],
    queryFn: () =>
      unwrap(api.GET('/v1/subscriptions', { params: { query: params } })),
    retry: defaultRetry,
  })
}
```

#### useReviews

**Location**: `clients/apps/web/src/hooks/queries/reviews.ts`

```typescript
export const useReviews = (productId: string) => {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: () =>
      unwrap(
        api.GET('/v1/products/{id}/reviews', {
          params: { path: { id: productId } },
        }),
      ),
    retry: defaultRetry,
  })
}
```

### State Management

#### Currency State (Zustand)

**Location**: `clients/apps/web/src/stores/currencyStore.ts`

```typescript
interface CurrencyStore {
  currency: PresentmentCurrency
  setCurrency: (currency: PresentmentCurrency) => void
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: 'kes',
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'blyss-currency',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
```

#### Cart State (Existing)

**Location**: `clients/apps/web/src/stores/cartStore.ts`

**Status**: Already implemented with optimistic updates

**Features**:

- Cart item count
- Optimistic add/remove
- Syncs with backend via TanStack Query

## Data Models

### Product

```typescript
interface Product {
  id: string
  name: string
  description: string
  slug: string
  organization_id: string
  organization: Organization
  prices: ProductPrice[]
  medias: ProductMedia[]
  is_recurring: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface ProductPrice {
  id: string
  price_amount: number // In cents (or smallest unit)
  price_currency: PresentmentCurrency
  is_archived: boolean
}

interface ProductMedia {
  id: string
  name: string
  path: string
  mime_type: string
  size: number
  order: number
}
```

### Organization

```typescript
interface Organization {
  id: string
  name: string
  slug: string
  avatar_url?: string
  cover_url?: string
  bio?: string
  profile_settings: {
    description?: string
    featured_products?: string[]
    featured_organizations?: string[]
  }
  created_at: string
}
```

### Cart

```typescript
interface Cart {
  items: CartItem[]
  item_count: number
  subtotal: number
  tax: number
  total: number
  currency: PresentmentCurrency
}

interface CartItem {
  id: string
  product_id: string
  product: Product
  quantity: number
  subtotal: number
}
```

### Wishlist

```typescript
interface Wishlist {
  items: WishlistItem[]
}

interface WishlistItem {
  id: string
  product_id: string
  product: Product
  created_at: string
}
```

### Subscription

```typescript
interface Subscription {
  id: string
  name: string
  description: string
  organization_id: string
  organization: Organization
  prices: SubscriptionPrice[]
  benefits: string[]
}

interface SubscriptionPrice {
  id: string
  price_amount: number
  price_currency: PresentmentCurrency
  recurring_interval: 'month' | 'year'
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties. I performed reflection to eliminate redundancy:

**Redundancies Eliminated**:

1. Multiple "fetch from API" examples consolidated into integration tests rather than separate properties
2. Authentication checks for different routes consolidated into a single property about protected routes
3. Similar filtering behaviors (products, creators) consolidated into generic filtering properties
4. Multiple "display data" requirements consolidated into data presence properties

**Properties Retained**:

- Each property provides unique validation value
- Properties cover different aspects: data display, user interactions, state management, API integration
- Edge cases are handled through property test generators rather than separate properties

### Property 1: Currency Persistence

_For any_ selected currency, when a user selects it and reloads the page, the selected currency should remain the same.

**Validates: Requirements 2.5**

**Rationale**: This is a round-trip property testing localStorage persistence. The currency selection must survive page reloads to provide a consistent user experience.

### Property 2: Price Display Completeness

_For any_ product with price data, the displayed price should include both the formatted amount and the currency symbol.

**Validates: Requirements 2.1, 2.7**

**Rationale**: This ensures that price display is always complete and unambiguous. Users should never see a price without knowing which currency it represents.

### Property 3: Currency Formatting Correctness

_For any_ price amount and currency code, formatting the price should divide by 100 for most currencies and by 1 for zero-decimal currencies (JPY, KRW).

**Validates: Requirements 2.6**

**Rationale**: This tests the format_currency utility function across all currency types. Zero-decimal currencies require special handling.

### Property 4: Multi-Price Currency Matching

_For any_ product with multiple price points, when a currency is selected, only the price matching that currency should be displayed.

**Validates: Requirements 2.8**

**Rationale**: This ensures that the correct price is shown based on user's currency selection. Products may have different prices in different currencies.

### Property 5: Filter Application Updates Display

_For any_ browse page (products or creators), when filters are applied, the displayed items should update without a full page reload.

**Validates: Requirements 4.8, 7.9**

**Rationale**: This tests client-side filtering behavior. The UI should respond immediately to filter changes using optimistic updates or cached data.

### Property 6: Sort Parameter Propagation

_For any_ sort option selection, the API request should include the corresponding sort parameter in the query string.

**Validates: Requirements 4.9**

**Rationale**: This ensures that sort selections are properly communicated to the backend. The query parameters must match the expected API format.

### Property 7: Price Filter Currency Respect

_For any_ price range filter, the filter should use the currently selected currency for min/max values.

**Validates: Requirements 4.11**

**Rationale**: This ensures that price filtering works correctly across currencies. A filter for "0-1000" should mean different things in KES vs USD.

### Property 8: Image Gallery Navigation

_For any_ product with multiple images, clicking a thumbnail should update the main image display to show the selected image.

**Validates: Requirements 5.3**

**Rationale**: This tests the image gallery interaction. Users should be able to preview all product images by clicking thumbnails.

### Property 9: Product Data Completeness

_For any_ product detail page, all required fields (title, creator link, price, description) should be present in the rendered output.

**Validates: Requirements 5.4**

**Rationale**: This ensures that product pages always display complete information. Missing fields would confuse users and reduce trust.

### Property 10: Add to Cart Updates Count

_For any_ product, when added to cart, the cart count in the header should increase by the quantity added.

**Validates: Requirements 5.11**

**Rationale**: This tests the cart state synchronization. The UI must reflect cart changes immediately for good UX.

### Property 11: Tab Switching Updates Content

_For any_ creator storefront tab (Products, Subscriptions, About), clicking the tab should update the displayed content without page reload.

**Validates: Requirements 6.9**

**Rationale**: This tests client-side tab navigation. The content should switch immediately using React state.

### Property 12: Creator Stats Display

_For any_ creator with available stats (product count, follower count), the stats should be displayed on their storefront.

**Validates: Requirements 6.4**

**Rationale**: This ensures that creator pages show social proof. Stats help users evaluate creators.

### Property 13: Creator Search Filtering

_For any_ search query on the creators page, the displayed creators should match the search term in their name or bio.

**Validates: Requirements 7.3**

**Rationale**: This tests search functionality. The search should filter creators based on text matching.

### Property 14: Creator Sample Products Display

_For any_ creator with products, their creator card should display 3-4 sample products.

**Validates: Requirements 7.6**

**Rationale**: This ensures that creator cards provide a preview of their work. Sample products help users decide whether to visit the storefront.

### Property 15: Creator Card Navigation

_For any_ creator card, clicking it should navigate to the creator's storefront page at `/[organization]`.

**Validates: Requirements 7.10**

**Rationale**: This tests navigation behavior. Creator cards should be clickable links to storefronts.

### Property 16: Cart Item Display Completeness

_For any_ cart item, the display should include product image, name, creator, and price in the selected currency.

**Validates: Requirements 8.3**

**Rationale**: This ensures that cart items show all necessary information for purchase decisions.

### Property 17: Cart Item Removal Updates Display

_For any_ cart item, when removed, the item should disappear from the cart display without page reload.

**Validates: Requirements 8.5**

**Rationale**: This tests optimistic UI updates. The cart should update immediately when items are removed.

### Property 18: Cart Total Calculation

_For any_ cart, the displayed total should equal the sum of all item subtotals plus tax.

**Validates: Requirements 8.6**

**Rationale**: This ensures that cart totals are calculated correctly. Users must see accurate pricing before checkout.

### Property 19: Wishlist to Cart Transfer

_For any_ wishlist item, when moved to cart, the item should be removed from the wishlist and added to the cart.

**Validates: Requirements 9.6**

**Rationale**: This tests state transitions between wishlist and cart. The item should only exist in one place.

### Property 20: Wishlist Item Removal Updates Display

_For any_ wishlist item, when removed, the item should disappear from the wishlist display without page reload.

**Validates: Requirements 9.7**

**Rationale**: This tests optimistic UI updates. The wishlist should update immediately when items are removed.

### Property 21: Wishlist Currency Display

_For any_ wishlist item, the displayed price should match the currently selected currency.

**Validates: Requirements 9.9**

**Rationale**: This ensures that wishlist prices update when currency changes. Users should see prices in their preferred currency.

### Property 22: FAQ Accordion Toggle

_For any_ FAQ item, clicking the question should toggle the answer visibility without page reload.

**Validates: Requirements 10.3**

**Rationale**: This tests accordion interaction. FAQs should expand/collapse on click.

### Property 23: Help Search Filtering

_For any_ search query on the help page, the displayed FAQ items should match the search term in their question or answer.

**Validates: Requirements 10.5**

**Rationale**: This tests search functionality. The search should filter FAQs based on text matching.

### Property 24: Newsletter Form Submission

_For any_ valid email address, submitting the newsletter form should call the `/v1/newsletter/subscribe` endpoint.

**Validates: Requirements 10.9**

**Rationale**: This tests form submission behavior. The form should integrate with the newsletter API.

### Property 25: Form Validation Rejection

_For any_ invalid form input (empty email, invalid format), the form should reject submission and display validation errors.

**Validates: Requirements 10.10**

**Rationale**: This tests input validation. Forms should prevent invalid submissions.

### Property 26: Protected Route Authentication

_For any_ protected route (/cart, /wishlist), when accessed by an unauthenticated user, the system should redirect to the login page.

**Validates: Requirements 13.2, 13.4**

**Rationale**: This tests authentication enforcement. Protected routes must require login.

### Property 27: Authentication Redirect Preservation

_For any_ protected route, when a user authenticates after being redirected, they should return to the originally requested page.

**Validates: Requirements 13.7**

**Rationale**: This tests the authentication flow. Users should land on their intended destination after login.

### Property 28: Authentication State Persistence

_For any_ authenticated user, navigating between pages should maintain the authentication state without requiring re-login.

**Validates: Requirements 13.10**

**Rationale**: This tests session management. Authentication should persist across page navigations.

## Error Handling

### Error Categories

#### 1. Network Errors

**Scenarios**: API unavailable, timeout, connection lost

**Handling**:

- Display error toast with retry option
- Show error boundary for page-level failures
- Maintain last known good state
- Provide "Retry" button

**Example**:

```typescript
if (error) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-800">
        Failed to load products. Please try again.
      </p>
      <Button onClick={() => refetch()} variant="outline" size="sm">
        Retry
      </Button>
    </div>
  )
}
```

#### 2. Authentication Errors

**Scenarios**: Unauthenticated access to protected routes, expired session

**Handling**:

- Redirect to login with returnUrl parameter
- Show login modal for protected actions
- Clear stale auth state
- Preserve user's intended action

**Example**:

```typescript
const handleAddToWishlist = () => {
  if (!user) {
    setShowLoginModal(true)
    setReturnAction(() => () => addToWishlist(productId))
    return
  }
  addToWishlist(productId)
}
```

#### 3. Validation Errors

**Scenarios**: Invalid form input, missing required fields

**Handling**:

- Display inline error messages
- Highlight invalid fields
- Prevent form submission
- Provide clear error descriptions

**Example**:

```typescript
const errors = validateForm(formData)
if (errors.email) {
  return <span className="text-sm text-red-600">{errors.email}</span>
}
```

#### 4. Not Found Errors

**Scenarios**: Product doesn't exist, creator not found

**Handling**:

- Display 404 page with helpful navigation
- Suggest similar items
- Provide search functionality
- Link back to browse pages

**Example**:

```typescript
if (error?.status === 404) {
  return <PageNotFound message="Product not found" />
}
```

#### 5. Server Errors

**Scenarios**: 500 errors, database failures, backend issues

**Handling**:

- Display 500 error page
- Log error details for debugging
- Provide contact support option
- Avoid exposing sensitive information

### Error Boundaries

#### Page-Level Error Boundary

**Location**: `clients/apps/web/src/app/error.tsx`

**Purpose**: Catch and handle errors at the page level

**Features**:

- Display user-friendly error message
- Provide reset/retry functionality
- Log errors to monitoring service
- Maintain navigation functionality

#### Component-Level Error Handling

**Pattern**: Use try-catch in async functions, error states in components

```typescript
const { data, error, isLoading } = useProducts(filters)

if (isLoading) return <Skeleton />
if (error) return <ErrorState error={error} onRetry={refetch} />
return <ProductGrid products={data} />
```

### Loading States

#### Skeleton Loaders

**Usage**: Initial page load, data fetching

**Components**:

- ProductCardSkeleton
- CreatorCardSkeleton
- ProductDetailSkeleton

**Example**:

```typescript
{isLoading ? (
  <div className="grid grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
) : (
  <ProductGrid products={data} />
)}
```

#### Spinner Indicators

**Usage**: Button actions, inline operations

**Example**:

```typescript
<Button onClick={handleAddToCart} disabled={isLoading}>
  {isLoading ? <Spinner size="sm" /> : 'Add to Cart'}
</Button>
```

#### Progress Indicators

**Usage**: Multi-step processes, file uploads

**Example**:

```typescript
<ProgressBar value={uploadProgress} max={100} />
```

### Toast Notifications

#### Success Toasts

```typescript
toast({
  title: 'Success',
  description: 'Item added to cart',
  variant: 'success',
})
```

#### Error Toasts

```typescript
toast({
  title: 'Error',
  description: error.message || 'Something went wrong',
  variant: 'error',
})
```

#### Info Toasts

```typescript
toast({
  title: 'Info',
  description: 'Please log in to continue',
  variant: 'info',
})
```

## Testing Strategy

### Dual Testing Approach

The marketplace implementation requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Unit Testing

#### Test Framework

- **Framework**: Vitest
- **Testing Library**: React Testing Library
- **Coverage Target**: 80% for business logic

#### Unit Test Categories

**1. Component Rendering Tests**

```typescript
describe('ProductCard', () => {
  it('renders product information correctly', () => {
    const product = createMockProduct()
    render(<ProductCard product={product} currency="kes" />)

    expect(screen.getByText(product.name)).toBeInTheDocument()
    expect(screen.getByText(/KSh/)).toBeInTheDocument()
  })

  it('shows empty state when no products', () => {
    render(<ProductGrid products={[]} />)
    expect(screen.getByText(/No products found/)).toBeInTheDocument()
  })
})
```

**2. User Interaction Tests**

```typescript
describe('Cart Operations', () => {
  it('adds item to cart on button click', async () => {
    const { user } = setup(<ProductCard product={mockProduct} />)
    const addButton = screen.getByRole('button', { name: /add to cart/i })

    await user.click(addButton)

    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct.id)
  })

  it('removes item from cart', async () => {
    const { user } = setup(<CartItem item={mockCartItem} />)
    const removeButton = screen.getByRole('button', { name: /remove/i })

    await user.click(removeButton)

    expect(mockRemoveFromCart).toHaveBeenCalledWith(mockCartItem.id)
  })
})
```

**3. API Integration Tests**

```typescript
describe('useProducts hook', () => {
  it('fetches products with filters', async () => {
    const { result } = renderHook(() => useProducts({ category: 'art' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockApi.GET).toHaveBeenCalledWith('/v1/products', {
      params: { query: { category: 'art' } },
    })
  })
})
```

**4. Edge Case Tests**

```typescript
describe('Currency Formatting', () => {
  it('handles zero-decimal currencies', () => {
    expect(formatCurrency(1000, 'jpy')).toBe('¥1,000')
    expect(formatCurrency(1000, 'usd')).toBe('$10.00')
  })

  it('handles missing price data', () => {
    const product = { ...mockProduct, prices: [] }
    render(<ProductCard product={product} currency="kes" />)
    expect(screen.getByText(/Price not available/)).toBeInTheDocument()
  })
})
```

**5. Authentication Flow Tests**

```typescript
describe('Protected Routes', () => {
  it('redirects unauthenticated users to login', () => {
    const { router } = setup(<CartPage />, { authenticated: false })
    expect(router.push).toHaveBeenCalledWith('/login?returnUrl=/cart')
  })

  it('shows login modal for protected actions', async () => {
    const { user } = setup(<ProductCard product={mockProduct} />, { authenticated: false })
    const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i })

    await user.click(wishlistButton)

    expect(screen.getByRole('dialog', { name: /log in/i })).toBeInTheDocument()
  })
})
```

### Property-Based Testing

#### Test Framework

- **Library**: fast-check (JavaScript property-based testing)
- **Minimum Iterations**: 100 per property test
- **Tag Format**: `Feature: marketplace-frontend-implementation, Property {number}: {property_text}`

#### Property Test Configuration

```typescript
import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'

// Arbitraries for generating test data
const currencyArbitrary = fc.constantFrom(...presentmentCurrencyValues)
const priceArbitrary = fc.integer({ min: 0, max: 1000000 })
const productArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  prices: fc.array(
    fc.record({
      price_amount: priceArbitrary,
      price_currency: currencyArbitrary,
    }),
    { minLength: 1, maxLength: 5 },
  ),
})
```

#### Property Test Examples

**Property 1: Currency Persistence**

```typescript
/**
 * Feature: marketplace-frontend-implementation, Property 1: Currency Persistence
 * For any selected currency, when a user selects it and reloads the page,
 * the selected currency should remain the same.
 */
it('persists currency selection across page reloads', () => {
  fc.assert(
    fc.property(currencyArbitrary, (currency) => {
      // Select currency
      const store = useCurrencyStore.getState()
      store.setCurrency(currency)

      // Simulate page reload by creating new store instance
      const newStore = useCurrencyStore.getState()

      // Currency should be persisted
      expect(newStore.currency).toBe(currency)
    }),
    { numRuns: 100 },
  )
})
```

**Property 2: Price Display Completeness**

```typescript
/**
 * Feature: marketplace-frontend-implementation, Property 2: Price Display Completeness
 * For any product with price data, the displayed price should include
 * both the formatted amount and the currency symbol.
 */
it('displays complete price information', () => {
  fc.assert(
    fc.property(productArbitrary, currencyArbitrary, (product, currency) => {
      const { container } = render(
        <ProductCard product={product} currency={currency} />
      )

      const priceText = container.textContent

      // Should contain currency symbol
      const currencySymbols = { kes: 'KSh', usd: '$', eur: '€', gbp: '£' }
      const symbol = currencySymbols[currency] || currency.toUpperCase()
      expect(priceText).toContain(symbol)

      // Should contain numeric amount
      expect(priceText).toMatch(/\d+/)
    }),
    { numRuns: 100 }
  )
})
```

**Property 3: Currency Formatting Correctness**

```typescript
/**
 * Feature: marketplace-frontend-implementation, Property 3: Currency Formatting Correctness
 * For any price amount and currency code, formatting the price should divide by 100
 * for most currencies and by 1 for zero-decimal currencies (JPY, KRW).
 */
it('formats currency amounts correctly', () => {
  fc.assert(
    fc.property(priceArbitrary, currencyArbitrary, (amount, currency) => {
      const formatted = formatCurrency(amount, currency)

      const zeroDecimalCurrencies = ['jpy', 'krw', 'clp', 'pyg', 'vnd']
      const isZeroDecimal = zeroDecimalCurrencies.includes(
        currency.toLowerCase(),
      )

      if (isZeroDecimal) {
        // Should not divide by 100
        expect(formatted).toContain(amount.toString())
      } else {
        // Should divide by 100 and show decimals
        const expectedAmount = (amount / 100).toFixed(2)
        expect(formatted).toContain(expectedAmount)
      }
    }),
    { numRuns: 100 },
  )
})
```

**Property 10: Add to Cart Updates Count**

```typescript
/**
 * Feature: marketplace-frontend-implementation, Property 10: Add to Cart Updates Count
 * For any product, when added to cart, the cart count in the header
 * should increase by the quantity added.
 */
it('updates cart count when adding items', () => {
  fc.assert(
    fc.property(
      productArbitrary,
      fc.integer({ min: 1, max: 10 }),
      async (product, quantity) => {
        const initialCount = useCartStore.getState().itemCount

        await act(async () => {
          await useCartStore.getState().addItem(product.id, quantity)
        })

        const newCount = useCartStore.getState().itemCount
        expect(newCount).toBe(initialCount + quantity)
      },
    ),
    { numRuns: 100 },
  )
})
```

**Property 18: Cart Total Calculation**

```typescript
/**
 * Feature: marketplace-frontend-implementation, Property 18: Cart Total Calculation
 * For any cart, the displayed total should equal the sum of all item subtotals plus tax.
 */
it('calculates cart total correctly', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        subtotal: fc.integer({ min: 0, max: 100000 }),
      }), { minLength: 1, maxLength: 10 }),
      fc.integer({ min: 0, max: 10000 }),
      (items, tax) => {
        const cart = {
          items,
          tax,
          subtotal: items.reduce((sum, item) => sum + item.subtotal, 0),
          total: 0, // Will be calculated
        }

        const expectedTotal = cart.subtotal + tax

        const { container } = render(<CartSummary cart={cart} />)
        const totalText = container.querySelector('[data-testid="cart-total"]')?.textContent

        expect(totalText).toContain(formatCurrency(expectedTotal, 'kes'))
      }
    ),
    { numRuns: 100 }
  )
})
```

**Property 26: Protected Route Authentication**

```typescript
/**
 * Feature: marketplace-frontend-implementation, Property 26: Protected Route Authentication
 * For any protected route (/cart, /wishlist), when accessed by an unauthenticated user,
 * the system should redirect to the login page.
 */
it('redirects unauthenticated users from protected routes', () => {
  const protectedRoutes = ['/cart', '/wishlist']

  fc.assert(
    fc.property(fc.constantFrom(...protectedRoutes), (route) => {
      const { router } = setup(<App />, {
        authenticated: false,
        initialRoute: route,
      })

      expect(router.push).toHaveBeenCalledWith(
        expect.stringContaining('/login')
      )
      expect(router.push).toHaveBeenCalledWith(
        expect.stringContaining(`returnUrl=${encodeURIComponent(route)}`)
      )
    }),
    { numRuns: 100 }
  )
})
```

### E2E Testing

#### Test Framework

- **Framework**: Playwright
- **Coverage**: Critical user journeys

#### E2E Test Scenarios

**1. Browse to Purchase Flow**

```typescript
test('user can browse products and add to cart', async ({ page }) => {
  await page.goto('/products')

  // Apply filters
  await page.click('text=Digital Art')
  await page.waitForSelector('[data-testid="product-card"]')

  // Click product
  await page.click('[data-testid="product-card"]:first-child')
  await page.waitForURL(/\/product\//)

  // Add to cart
  await page.click('button:has-text("Add to Cart")')
  await page.waitForSelector('text=Item added to cart')

  // Verify cart count
  const cartCount = await page.textContent('[data-testid="cart-count"]')
  expect(cartCount).toBe('1')
})
```

**2. Currency Selection Flow**

```typescript
test('user can change currency and see updated prices', async ({ page }) => {
  await page.goto('/')

  // Select currency
  await page.click('[data-testid="currency-selector"]')
  await page.click('text=USD')

  // Verify prices update
  await page.goto('/products')
  const priceText = await page.textContent(
    '[data-testid="product-price"]:first-child',
  )
  expect(priceText).toContain('$')

  // Verify persistence
  await page.reload()
  const newPriceText = await page.textContent(
    '[data-testid="product-price"]:first-child',
  )
  expect(newPriceText).toContain('$')
})
```

**3. Authentication Flow**

```typescript
test('user must log in to access wishlist', async ({ page }) => {
  await page.goto('/wishlist')

  // Should redirect to login
  await page.waitForURL(/\/login/)
  expect(page.url()).toContain('returnUrl=%2Fwishlist')

  // Log in
  await page.fill('input[type="email"]', 'test@example.com')
  await page.click('button:has-text("Continue")')

  // Should redirect back to wishlist
  await page.waitForURL('/wishlist')
})
```

### Test Data Management

#### Mock Data Generators

```typescript
// clients/apps/web/src/test/factories.ts

export const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  slug: faker.helpers.slugify(faker.commerce.productName()),
  organization_id: faker.string.uuid(),
  organization: createMockOrganization(),
  prices: [
    {
      id: faker.string.uuid(),
      price_amount: faker.number.int({ min: 1000, max: 100000 }),
      price_currency: 'kes',
      is_archived: false,
    },
  ],
  medias: [],
  is_recurring: false,
  is_archived: false,
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
})

export const createMockOrganization = (
  overrides?: Partial<Organization>,
): Organization => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name()),
  avatar_url: faker.image.avatar(),
  bio: faker.lorem.paragraph(),
  profile_settings: {},
  created_at: faker.date.past().toISOString(),
  ...overrides,
})
```

#### API Mocking

```typescript
// clients/apps/web/src/test/mocks/api.ts

export const mockApiHandlers = [
  http.get('/v1/products', () => {
    return HttpResponse.json({
      items: Array.from({ length: 10 }, () => createMockProduct()),
      pagination: { total: 100, page: 1, limit: 10 },
    })
  }),

  http.get('/v1/products/:id', ({ params }) => {
    return HttpResponse.json(createMockProduct({ id: params.id as string }))
  }),

  http.post('/v1/cart/items', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ success: true })
  }),
]
```

## Design System Implementation

### Tailwind Configuration

#### Color Tokens

**Location**: `clients/apps/web/src/styles/globals.css`

**Add to `@theme` block**:

```css
@theme {
  /* Editorial Marketplace Colors */
  --color-primary: #a73400;
  --color-primary-container: #cc4911;
  --color-on-primary: #ffffff;

  --color-secondary: #006972;
  --color-secondary-container: #9ff0fb;
  --color-on-secondary-container: #066f79;

  --color-tertiary: #765700;
  --color-tertiary-fixed: #ffdfa0;
  --color-on-tertiary-fixed: #261a00;

  /* Surface Hierarchy */
  --color-surface: #fcf9f7;
  --color-surface-container-low: #f6f3f1;
  --color-surface-container-lowest: #ffffff;
  --color-surface-container-high: #ebe8e6;
  --color-surface-container-highest: #e5e2e0;

  /* Text Colors */
  --color-on-surface: #1b1c1b;
  --color-on-surface-variant: #594139;

  /* Outline */
  --color-outline-variant: #e1bfb4;

  /* Editorial Shadow */
  --shadow-editorial: 0 12px 32px rgba(27, 28, 27, 0.06);

  /* Dark Mode Overrides */
  --color-surface-dark: #1b1c1b;
  --color-surface-container-low-dark: #232423;
  --color-surface-container-lowest-dark: #2b2c2b;
  --color-on-surface-dark: #e5e2e0;
  --color-on-surface-variant-dark: #d7c2b9;
}
```

#### Typography Configuration

```css
@theme {
  /* Font Families */
  --font-epilogue: 'Epilogue', var(--font-sans);
  --font-inter: 'Inter', var(--font-sans);

  /* Typography Scale */
  --font-size-display-lg: 3.5rem; /* 56px */
  --font-size-display-md: 2.75rem; /* 44px */
  --font-size-headline-lg: 2rem; /* 32px */
  --font-size-headline-md: 1.75rem; /* 28px */
  --font-size-title-lg: 1.375rem; /* 22px */
  --font-size-title-md: 1rem; /* 16px */
  --font-size-body-lg: 1rem; /* 16px */
  --font-size-body-md: 0.875rem; /* 14px */
  --font-size-label-lg: 0.875rem; /* 14px */
  --font-size-label-md: 0.75rem; /* 12px */

  /* Letter Spacing */
  --letter-spacing-tight: -0.02em;

  /* Line Heights */
  --line-height-display: 1.1;
  --line-height-headline: 1.2;
  --line-height-title: 1.3;
  --line-height-body: 1.5;
}
```

#### Spacing Configuration

```css
@theme {
  /* Section Spacing */
  --spacing-section-sm: 4rem; /* 64px */
  --spacing-section-lg: 5rem; /* 80px */

  /* Asymmetrical Margins */
  --spacing-asymmetric-outer: 1.5rem; /* 24px */
  --spacing-asymmetric-inner: 2rem; /* 32px */
}
```

#### Border Radius Configuration

```css
@theme {
  --radius-sm: 0.25rem; /* 4px */
  --radius-default: 0.5rem; /* 8px */
  --radius-md: 0.75rem; /* 12px */
  --radius-full: 9999px; /* Pill shape */
}
```

### Typography Classes

#### Display Text (Epilogue)

```css
.text-display-lg {
  font-family: var(--font-epilogue);
  font-size: var(--font-size-display-lg);
  line-height: var(--line-height-display);
  letter-spacing: var(--letter-spacing-tight);
  font-weight: 700;
}

.text-display-md {
  font-family: var(--font-epilogue);
  font-size: var(--font-size-display-md);
  line-height: var(--line-height-display);
  letter-spacing: var(--letter-spacing-tight);
  font-weight: 700;
}

.text-headline-lg {
  font-family: var(--font-epilogue);
  font-size: var(--font-size-headline-lg);
  line-height: var(--line-height-headline);
  letter-spacing: var(--letter-spacing-tight);
  font-weight: 600;
}
```

#### Body Text (Inter)

```css
.text-body-lg {
  font-family: var(--font-inter);
  font-size: var(--font-size-body-lg);
  line-height: var(--line-height-body);
}

.text-label-md {
  font-family: var(--font-inter);
  font-size: var(--font-size-label-md);
  line-height: var(--line-height-body);
  font-weight: 500;
}
```

### Component Styling Patterns

#### Tonal Layering

```tsx
// Base page background
<div className="bg-surface dark:bg-surface-dark">
  {/* Section with subtle elevation */}
  <section className="bg-surface-container-low dark:bg-surface-container-low-dark">
    {/* Card with highest elevation */}
    <div className="bg-surface-container-lowest dark:bg-surface-container-lowest-dark rounded-md">
      Content
    </div>
  </section>
</div>
```

#### Editorial Shadow

```tsx
// Floating elements
<div className="shadow-editorial hover:shadow-xl transition-shadow">
  Card content
</div>

// Sticky navigation
<nav className="sticky top-0 bg-surface-container-lowest/80 backdrop-blur-lg shadow-editorial">
  Navigation
</nav>
```

#### Asymmetrical Spacing

```tsx
// Section with asymmetrical padding
<section className="py-section-lg pl-asymmetric-outer pr-asymmetric-inner">
  <div className="mx-auto max-w-7xl">Content</div>
</section>
```

#### Button Styles

```tsx
// Primary button
<button className="bg-primary hover:bg-primary-container text-on-primary rounded-md px-6 py-3 shadow-editorial transition-all hover:shadow-xl">
  Primary Action
</button>

// Secondary button
<button className="bg-secondary-container text-on-secondary-container rounded-md px-6 py-3">
  Secondary Action
</button>

// Tertiary button (text only)
<button className="text-primary hover:underline">
  Tertiary Action
</button>
```

#### Product Card Styling

```tsx
<div className="bg-surface-container-lowest dark:bg-surface-container-lowest-dark hover:shadow-editorial overflow-hidden rounded-md transition-shadow">
  {/* Image with 4:5 aspect ratio */}
  <div className="relative aspect-[4/5]">
    <Image src={product.image} fill className="rounded-sm object-cover" />
  </div>

  {/* Content with tonal background */}
  <div className="bg-surface-container-low dark:bg-surface-container-low-dark p-4">
    <h3 className="text-headline-md font-epilogue">{product.name}</h3>
    <p className="text-body-md text-on-surface-variant">{product.creator}</p>
    <p className="text-title-lg text-on-surface mt-2 font-semibold">
      {formatCurrency(product.price, currency)}
    </p>
  </div>
</div>
```

### Responsive Design

#### Breakpoints

```typescript
// Tailwind default breakpoints
const breakpoints = {
  sm: '640px', // Mobile landscape
  md: '768px', // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
  '2xl': '1536px', // Extra large
}
```

#### Responsive Grid

```tsx
// Product grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {products.map(product => <ProductCard key={product.id} product={product} />)}
</div>

// Creator grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {creators.map(creator => <CreatorCard key={creator.id} creator={creator} />)}
</div>
```

#### Responsive Typography

```tsx
// Hero title
<h1 className="text-display-md sm:text-display-lg font-epilogue">
  Discover Digital Art
</h1>

// Section padding
<section className="py-8 sm:py-12 lg:py-section-lg">
  Content
</section>
```

#### Mobile Navigation

```tsx
// Desktop: horizontal nav, Mobile: hamburger menu
<nav className="hidden lg:flex items-center gap-6">
  <Link href="/products">Browse</Link>
  <Link href="/creators">Creators</Link>
</nav>

<button className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
  <MenuIcon />
</button>
```

### Dark Mode Support

#### Color Scheme Toggle

```tsx
// Use existing dark mode implementation
<html className={theme === 'dark' ? 'dark' : ''}>
```

#### Dark Mode Classes

```tsx
// Text colors
<p className="text-on-surface dark:text-on-surface-dark">
  Content
</p>

// Background colors
<div className="bg-surface dark:bg-surface-dark">
  Content
</div>

// Borders (when necessary)
<div className="border border-outline-variant/15 dark:border-outline-variant/10">
  Content
</div>
```

### Accessibility Patterns

#### Focus States

```css
/* Custom focus ring */
.focus-ring {
  @apply focus:ring-secondary focus:ring-2 focus:ring-offset-2 focus:outline-none;
}
```

#### Skip Links

```tsx
<a
  href="#main-content"
  className="bg-primary text-on-primary sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
>
  Skip to main content
</a>
```

#### ARIA Labels

```tsx
// Button with icon
<button aria-label="Add to cart">
  <ShoppingCartIcon />
</button>

// Search input
<input
  type="search"
  aria-label="Search products"
  placeholder="Search..."
/>

// Loading state
<div role="status" aria-live="polite">
  {isLoading ? 'Loading products...' : `${products.length} products found`}
</div>
```

## Page Implementation Details

### 1. Homepage (`/`)

#### Route

**Location**: `clients/apps/web/src/app/(main)/(website)/(landing)/page.tsx`

**Status**: NEW - Create new page

#### Layout Structure

```tsx
<main>
  {/* Hero Section - Asymmetric 7/5 grid */}
  <HeroSection
    title="Discover Kenyan Creativity"
    subtitle="Digital art, templates, music, and more from talented creators"
    primaryCTA={{ text: 'Browse Marketplace', href: '/products' }}
    secondaryCTA={{ text: 'Become a Creator', href: '/start' }}
  />

  {/* Category Pills */}
  <CategoryPills
    categories={[
      'Digital Art',
      'Templates',
      'E-books',
      'Music',
      'Subscriptions',
    ]}
    onCategorySelect={(category) =>
      router.push(`/products?category=${category}`)
    }
  />

  {/* Featured Products - 4-column bento grid */}
  <section className="py-section-lg">
    <h2 className="text-headline-lg font-epilogue mb-8">Top Products</h2>
    <ProductGrid
      products={featuredProducts}
      columns={{ mobile: 1, tablet: 2, desktop: 4 }}
    />
  </section>

  {/* Featured Subscriptions - 3-column cards */}
  <section className="py-section-lg bg-surface-container-low">
    <h2 className="text-headline-lg font-epilogue mb-8">
      Featured Subscriptions
    </h2>
    <SubscriptionGrid subscriptions={featuredSubscriptions} />
  </section>

  {/* Trending Creators - 2-column cards */}
  <section className="py-section-lg">
    <h2 className="text-headline-lg font-epilogue mb-8">Trending Creators</h2>
    <CreatorGrid
      creators={trendingCreators}
      columns={{ mobile: 1, tablet: 2, desktop: 2 }}
    />
  </section>

  {/* Social Proof - 3-column testimonials */}
  <section className="py-section-lg bg-primary text-on-primary">
    <h2 className="text-headline-lg font-epilogue mb-8">What Creators Say</h2>
    <TestimonialGrid testimonials={testimonials} />
  </section>
</main>
```

#### Data Fetching

```typescript
export default async function HomePage() {
  const api = await getServerSideAPI()

  // Fetch featured products
  const featuredProducts = await api.GET('/v1/products', {
    params: { query: { featured: true, limit: 8 } }
  })

  // Fetch featured subscriptions
  const featuredSubscriptions = await api.GET('/v1/subscriptions', {
    params: { query: { featured: true, limit: 3 } }
  })

  // Fetch trending creators
  const trendingCreators = await api.GET('/v1/organizations', {
    params: { query: { sort: 'popular', limit: 4 } }
  })

  return <HomePageClient {...data} />
}
```

### 2. Browse Marketplace (`/products`)

#### Route

**Location**: `clients/apps/web/src/app/(main)/products/page.tsx`

**Status**: NEW - Create new page

#### Layout Structure

```tsx
<main className="flex">
  {/* Left Sidebar - Desktop only */}
  <aside className="sticky top-0 hidden h-screen w-64 overflow-y-auto lg:block">
    <FilterSidebar
      categories={categories}
      selectedCategories={filters.categories}
      priceRange={filters.priceRange}
      selectedCurrency={currency}
      onCategoryChange={handleCategoryChange}
      onPriceRangeChange={handlePriceRangeChange}
      onClearFilters={handleClearFilters}
    />
  </aside>

  {/* Main Content */}
  <div className="flex-1">
    {/* Search Bar */}
    <div className="bg-surface-container-lowest/80 shadow-editorial sticky top-0 z-10 p-4 backdrop-blur-lg">
      <SearchBar
        placeholder="Search products..."
        onSearch={handleSearch}
        debounceMs={300}
      />
    </div>

    {/* Sort Options */}
    <div className="flex items-center justify-between p-4">
      <p className="text-body-md text-on-surface-variant">
        {products.length} products found
      </p>
      <SortSelect
        value={sortBy}
        onChange={setSortBy}
        options={['Newest', 'Popular', 'Price: Low-High', 'Price: High-Low']}
      />
    </div>

    {/* Product Grid */}
    <div className="p-4">
      <ProductGrid
        products={products}
        currency={currency}
        columns={{ mobile: 1, tablet: 2, desktop: 3 }}
        loading={isLoading}
      />
    </div>

    {/* Pagination */}
    <div className="p-4">
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  </div>

  {/* Mobile Filter Drawer */}
  <MobileFilterDrawer
    open={mobileFiltersOpen}
    onClose={() => setMobileFiltersOpen(false)}
  >
    <FilterSidebar {...filterProps} />
  </MobileFilterDrawer>
</main>
```

#### Client-Side Filtering

```typescript
'use client'

export function BrowseProductsPage({ initialProducts, categories }) {
  const [filters, setFilters] = useState({
    categories: [],
    priceRange: [0, 100000],
    search: '',
  })
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)

  const { data: products, isLoading } = useProducts({
    category: filters.categories.join(','),
    search: filters.search,
    sortBy,
    priceMin: filters.priceRange[0],
    priceMax: filters.priceRange[1],
    page,
    limit: 24,
  })

  return <BrowseLayout products={products} {...props} />
}
```

### 3. Product Detail (`/product/[slug]`)

#### Route

**Location**: `clients/apps/web/src/app/(main)/product/[slug]/page.tsx`

**Status**: UPDATE - Update existing page styling

#### Changes Required

1. Update layout to match editorial design
2. Apply tonal layering to sections
3. Update typography to use Epilogue for headings
4. Apply Editorial shadow to image gallery
5. Update button styles to match design system
6. Ensure 4:5 aspect ratio for images

#### Layout Structure

```tsx
<main className="mx-auto max-w-7xl py-8">
  <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
    {/* Image Gallery */}
    <div className="sticky top-4">
      <ProductImageGallery
        images={product.medias}
        aspectRatio="4/5"
        className="shadow-editorial"
      />
    </div>

    {/* Product Info */}
    <div className="space-y-6">
      {/* Title & Creator */}
      <div>
        <h1 className="text-display-md font-epilogue mb-2">{product.name}</h1>
        <Link
          href={`/${product.organization.slug}`}
          className="text-body-lg text-secondary hover:underline"
        >
          by {product.organization.name}
        </Link>
      </div>

      {/* Price */}
      <div className="text-title-lg text-on-surface font-semibold">
        {formatCurrency(getPrice(product, currency), currency)}
      </div>

      {/* Description */}
      <div className="prose text-body-lg">{product.description}</div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={handleAddToCart} className="flex-1">
          Add to Cart
        </Button>
        <Button onClick={handleAddToWishlist} variant="outline">
          <HeartIcon />
        </Button>
      </div>

      {/* File Details */}
      <div className="bg-surface-container-low rounded-md p-4">
        <h3 className="text-title-md mb-2 font-semibold">File Details</h3>
        <dl className="text-body-md space-y-2">
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Format</dt>
            <dd>{product.file_format}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Size</dt>
            <dd>{formatFileSize(product.file_size)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">License</dt>
            <dd>{product.license_type}</dd>
          </div>
        </dl>
      </div>

      {/* Creator Card */}
      <CreatorProfileCard creator={product.organization} />
    </div>
  </div>

  {/* Related Products */}
  <section className="mt-section-lg">
    <h2 className="text-headline-lg font-epilogue mb-8">Related Products</h2>
    <ProductGrid
      products={relatedProducts}
      columns={{ mobile: 1, tablet: 2, desktop: 4 }}
    />
  </section>

  {/* Reviews */}
  <section className="mt-section-lg">
    <h2 className="text-headline-lg font-epilogue mb-8">Reviews</h2>
    <ReviewList reviews={reviews} />
  </section>
</main>
```

### 4. Creator Storefront (`/[organization]`)

#### Route

**Location**: `clients/apps/web/src/app/(main)/[organization]/page.tsx`

**Status**: UPDATE - Update existing page styling

#### Changes Required

1. Update hero banner styling with gradient overlay
2. Apply tonal layering to sections
3. Update tab styling to match design system
4. Update product grid to match browse page
5. Apply Editorial shadow to floating elements

#### Layout Structure

```tsx
<main>
  {/* Hero Banner */}
  <div className="from-primary to-primary-container relative h-64 bg-gradient-to-br">
    {creator.cover_url && (
      <Image src={creator.cover_url} fill className="object-cover opacity-30" />
    )}
    <div className="absolute inset-0 flex items-end p-8">
      <div className="flex items-center gap-4">
        <Avatar
          src={creator.avatar_url}
          size="xl"
          className="ring-surface-container-lowest ring-4"
        />
        <div>
          <h1 className="text-display-md font-epilogue text-on-primary">
            {creator.name}
          </h1>
          <p className="text-body-lg text-on-primary/80">{creator.bio}</p>
        </div>
      </div>
    </div>
  </div>

  {/* Stats & Follow Button */}
  <div className="bg-surface-container-low flex items-center justify-between px-8 py-4">
    <div className="flex gap-8">
      <div>
        <p className="text-title-lg font-semibold">{creator.product_count}</p>
        <p className="text-body-md text-on-surface-variant">Products</p>
      </div>
      <div>
        <p className="text-title-lg font-semibold">{creator.follower_count}</p>
        <p className="text-body-md text-on-surface-variant">Followers</p>
      </div>
    </div>
    <Button onClick={handleFollow}>
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  </div>

  {/* Tabs */}
  <div className="border-outline-variant/15 border-b">
    <div className="mx-auto max-w-7xl px-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  </div>

  {/* Tab Content */}
  <div className="mx-auto max-w-7xl px-8 py-8">
    {activeTab === 'products' && (
      <ProductGrid
        products={creatorProducts}
        columns={{ mobile: 1, tablet: 2, desktop: 3 }}
      />
    )}
    {activeTab === 'subscriptions' && (
      <SubscriptionGrid subscriptions={creatorSubscriptions} />
    )}
    {activeTab === 'about' && (
      <div className="prose max-w-none">
        {creator.profile_settings.description}
      </div>
    )}
  </div>
</main>
```

### 5. Explore Creators (`/creators`)

#### Route

**Location**: `clients/apps/web/src/app/(main)/creators/page.tsx`

**Status**: NEW - Create new page

#### Layout Structure

```tsx
<main className="mx-auto max-w-7xl px-4 py-8">
  {/* Header */}
  <div className="mb-8">
    <h1 className="text-display-md font-epilogue mb-4">Discover Creators</h1>
    <p className="text-body-lg text-on-surface-variant">
      Find talented creators and explore their work
    </p>
  </div>

  {/* Search & Filters */}
  <div className="mb-8 space-y-4">
    <SearchBar
      placeholder="Search creators..."
      onSearch={handleSearch}
      debounceMs={300}
    />

    <div className="flex flex-wrap items-center gap-2">
      <span className="text-label-md text-on-surface-variant">Filter by:</span>
      <CategoryPills
        categories={['Digital Art', 'Music', 'Templates', 'E-books', 'All']}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />
    </div>

    <div className="flex items-center justify-between">
      <p className="text-body-md text-on-surface-variant">
        {creators.length} creators found
      </p>
      <SortSelect
        value={sortBy}
        onChange={setSortBy}
        options={['Popular', 'Newest', 'Most Products']}
      />
    </div>
  </div>

  {/* Creator Grid */}
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {creators.map((creator) => (
      <CreatorCard
        key={creator.id}
        creator={creator}
        sampleProducts={creator.sample_products}
        onFollow={handleFollow}
        showFollowButton
      />
    ))}
  </div>

  {/* Pagination */}
  <div className="mt-8">
    <Pagination
      currentPage={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  </div>
</main>
```

#### CreatorCard Component

```tsx
interface CreatorCardProps {
  creator: Organization
  sampleProducts?: Product[]
  onFollow?: (creatorId: string) => void
  showFollowButton?: boolean
}

export function CreatorCard({
  creator,
  sampleProducts,
  onFollow,
  showFollowButton,
}: CreatorCardProps) {
  return (
    <Link href={`/${creator.slug}`}>
      <div className="bg-surface-container-lowest hover:shadow-editorial overflow-hidden rounded-md transition-shadow">
        {/* Creator Header */}
        <div className="bg-surface-container-low p-6">
          <div className="flex items-start gap-4">
            <Avatar src={creator.avatar_url} size="lg" />
            <div className="min-w-0 flex-1">
              <h3 className="text-title-lg truncate font-semibold">
                {creator.name}
              </h3>
              <p className="text-body-md text-on-surface-variant line-clamp-2">
                {creator.bio}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4">
            <div>
              <p className="text-title-md font-semibold">
                {creator.product_count}
              </p>
              <p className="text-label-md text-on-surface-variant">Products</p>
            </div>
            <div>
              <p className="text-title-md font-semibold">
                {creator.follower_count}
              </p>
              <p className="text-label-md text-on-surface-variant">Followers</p>
            </div>
          </div>
        </div>

        {/* Sample Products */}
        {sampleProducts && sampleProducts.length > 0 && (
          <div className="grid grid-cols-3 gap-1 p-1">
            {sampleProducts.slice(0, 3).map((product) => (
              <div key={product.id} className="relative aspect-square">
                <Image
                  src={product.medias[0]?.path}
                  fill
                  className="rounded-sm object-cover"
                  alt={product.name}
                />
              </div>
            ))}
          </div>
        )}

        {/* Follow Button */}
        {showFollowButton && (
          <div className="p-4">
            <Button
              onClick={(e) => {
                e.preventDefault()
                onFollow?.(creator.id)
              }}
              variant="outline"
              className="w-full"
            >
              Follow
            </Button>
          </div>
        )}
      </div>
    </Link>
  )
}
```

### 6. Shopping Cart (`/cart`)

#### Route

**Location**: `clients/apps/web/src/app/(main)/cart/page.tsx`

**Status**: UPDATE - Update existing page styling

#### Changes Required

1. Apply tonal layering to cart summary
2. Update typography to use design system
3. Apply Editorial shadow to summary card
4. Update button styles
5. Improve empty state design

#### Updated Layout

```tsx
<main className="mx-auto max-w-4xl px-4 py-8">
  <h1 className="text-display-md font-epilogue mb-8">Shopping Cart</h1>

  {cart.items.length === 0 ? (
    <EmptyCart />
  ) : (
    <div className="space-y-4">
      {/* Cart Items */}
      {cart.items.map((item) => (
        <CartItem key={item.id} item={item} />
      ))}

      {/* Cart Summary */}
      <div className="bg-surface-container-low shadow-editorial sticky top-4 rounded-md p-6">
        <h2 className="text-title-lg mb-4 font-semibold">Order Summary</h2>

        <div className="space-y-3">
          <div className="text-body-md flex justify-between">
            <span className="text-on-surface-variant">Subtotal</span>
            <span className="font-medium">
              {formatCurrency(cart.subtotal, currency)}
            </span>
          </div>
          <div className="text-body-md flex justify-between">
            <span className="text-on-surface-variant">Tax</span>
            <span className="font-medium">
              {formatCurrency(cart.tax, currency)}
            </span>
          </div>
          <div className="border-outline-variant/15 border-t pt-3">
            <div className="flex justify-between">
              <span className="text-title-lg font-semibold">Total</span>
              <span className="text-title-lg font-bold">
                {formatCurrency(cart.total, currency)}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleCheckout} className="mt-6 w-full" size="lg">
          Proceed to Checkout
        </Button>

        <Link
          href="/products"
          className="text-body-md text-secondary mt-4 block text-center hover:underline"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )}
</main>
```

#### Updated CartItem Component

```tsx
export function CartItem({ item }: { item: CartItem }) {
  const { mutate: removeFromCart, isPending } = useRemoveFromCart()

  return (
    <div className="bg-surface-container-lowest flex gap-4 rounded-md p-4">
      {/* Product Image */}
      <div className="relative h-24 w-24 flex-shrink-0">
        <Image
          src={item.product.medias[0]?.path}
          fill
          className="rounded-sm object-cover"
          alt={item.product.name}
        />
      </div>

      {/* Product Info */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/product/${item.product.slug}`}
          className="hover:underline"
        >
          <h3 className="text-title-md truncate font-semibold">
            {item.product.name}
          </h3>
        </Link>
        <Link
          href={`/${item.product.organization.slug}`}
          className="text-body-md text-on-surface-variant hover:underline"
        >
          {item.product.organization.name}
        </Link>
        <p className="text-title-md mt-2 font-semibold">
          {formatCurrency(item.subtotal, currency)}
        </p>
      </div>

      {/* Remove Button */}
      <Button
        onClick={() => removeFromCart({ itemId: item.id })}
        variant="ghost"
        size="sm"
        disabled={isPending}
      >
        <TrashIcon />
      </Button>
    </div>
  )
}
```

### 7. Wishlist (`/wishlist`)

#### Route

**Location**: `clients/apps/web/src/app/(main)/wishlist/page.tsx`

**Status**: UPDATE - Update existing page styling

#### Changes Required

1. Update grid layout to match browse page
2. Apply tonal layering
3. Update typography
4. Improve empty state design
5. Update button styles

#### Updated Layout

```tsx
<main className="mx-auto max-w-7xl px-4 py-8">
  <h1 className="text-display-md font-epilogue mb-8">My Wishlist</h1>

  {wishlist.items.length === 0 ? (
    <EmptyWishlist />
  ) : (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {wishlist.items.map((item) => (
          <WishlistItem key={item.id} item={item} />
        ))}
      </div>

      <p className="text-body-md text-on-surface-variant mt-6">
        {wishlist.items.length} {wishlist.items.length === 1 ? 'item' : 'items'}{' '}
        in your wishlist
      </p>
    </>
  )}
</main>
```

#### Updated WishlistItem Component

```tsx
export function WishlistItem({ item }: { item: WishlistItem }) {
  const { mutate: moveToCart } = useAddToCart()
  const { mutate: removeFromWishlist } = useRemoveFromWishlist()

  return (
    <div className="bg-surface-container-lowest hover:shadow-editorial overflow-hidden rounded-md transition-shadow">
      {/* Product Image */}
      <Link href={`/product/${item.product.slug}`}>
        <div className="relative aspect-[4/5]">
          <Image
            src={item.product.medias[0]?.path}
            fill
            className="object-cover"
            alt={item.product.name}
          />
        </div>
      </Link>

      {/* Product Info */}
      <div className="bg-surface-container-low p-4">
        <Link
          href={`/product/${item.product.slug}`}
          className="hover:underline"
        >
          <h3 className="text-title-md truncate font-semibold">
            {item.product.name}
          </h3>
        </Link>
        <Link
          href={`/${item.product.organization.slug}`}
          className="text-body-md text-on-surface-variant hover:underline"
        >
          {item.product.organization.name}
        </Link>
        <p className="text-title-lg mt-2 font-semibold">
          {formatCurrency(getPrice(item.product, currency), currency)}
        </p>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => moveToCart({ productId: item.product.id })}
            size="sm"
            className="flex-1"
          >
            Move to Cart
          </Button>
          <Button
            onClick={() => removeFromWishlist({ itemId: item.id })}
            variant="ghost"
            size="sm"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 8. Help Center (`/help`)

#### Route

**Location**: `clients/apps/web/src/app/(main)/help/page.tsx`

**Status**: NEW - Create new page

#### Layout Structure

```tsx
<main className="mx-auto max-w-4xl px-4 py-8">
  <h1 className="text-display-md font-epilogue mb-4">Help Center</h1>
  <p className="text-body-lg text-on-surface-variant mb-8">
    Find answers to common questions and get support
  </p>

  {/* Search */}
  <div className="mb-8">
    <SearchBar
      placeholder="Search help articles..."
      onSearch={handleSearch}
      debounceMs={300}
    />
  </div>

  {/* FAQ Accordion */}
  <section className="mb-section-lg">
    <h2 className="text-headline-lg font-epilogue mb-6">
      Frequently Asked Questions
    </h2>
    <Accordion type="single" collapsible className="space-y-4">
      {faqs.map((faq, index) => (
        <AccordionItem
          key={index}
          value={`faq-${index}`}
          className="bg-surface-container-lowest rounded-md"
        >
          <AccordionTrigger className="text-title-md px-6 py-4 font-semibold hover:no-underline">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-body-md text-on-surface-variant px-6 pb-4">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </section>

  {/* Community Guidelines */}
  <section className="mb-section-lg bg-surface-container-low rounded-md p-6">
    <h2 className="text-headline-lg font-epilogue mb-4">
      Community Guidelines
    </h2>
    <div className="prose text-body-md">{/* Guidelines content */}</div>
  </section>

  {/* Creator Resources */}
  <section className="mb-section-lg">
    <h2 className="text-headline-lg font-epilogue mb-6">Creator Resources</h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Link
        href="/help/getting-started"
        className="bg-surface-container-lowest hover:shadow-editorial rounded-md p-6 transition-shadow"
      >
        <h3 className="text-title-lg mb-2 font-semibold">Getting Started</h3>
        <p className="text-body-md text-on-surface-variant">
          Learn how to set up your creator account
        </p>
      </Link>
      <Link
        href="/help/pricing"
        className="bg-surface-container-lowest hover:shadow-editorial rounded-md p-6 transition-shadow"
      >
        <h3 className="text-title-lg mb-2 font-semibold">Pricing Guide</h3>
        <p className="text-body-md text-on-surface-variant">
          Best practices for pricing your products
        </p>
      </Link>
    </div>
  </section>

  {/* Contact Form */}
  <section className="mb-section-lg bg-surface-container-lowest rounded-md p-6">
    <h2 className="text-headline-lg font-epilogue mb-4">Contact Support</h2>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-label-md mb-2 block font-medium">
          Email
        </label>
        <input
          type="email"
          id="email"
          className="bg-surface-container-high focus:ring-secondary w-full rounded-md border-none px-4 py-2 focus:ring-2"
          required
        />
      </div>
      <div>
        <label
          htmlFor="message"
          className="text-label-md mb-2 block font-medium"
        >
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          className="bg-surface-container-high focus:ring-secondary w-full rounded-md border-none px-4 py-2 focus:ring-2"
          required
        />
      </div>
      <Button type="submit">Send Message</Button>
    </form>
  </section>

  {/* Newsletter Signup */}
  <section className="bg-primary text-on-primary rounded-md p-6">
    <h2 className="text-headline-lg font-epilogue mb-4">Stay Updated</h2>
    <p className="text-body-md mb-4">
      Subscribe to our newsletter for updates and tips
    </p>
    <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
      <input
        type="email"
        placeholder="Enter your email"
        className="bg-surface-container-lowest text-on-surface flex-1 rounded-md px-4 py-2"
        required
      />
      <Button type="submit" variant="secondary">
        Subscribe
      </Button>
    </form>
  </section>
</main>
```

## Performance Optimization

### Image Optimization

#### Next.js Image Component

```tsx
import Image from 'next/image'

// Product images with responsive sizes
;<Image
  src={product.image}
  alt={product.name}
  width={400}
  height={500}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
  priority={isFeatured} // Only for above-the-fold images
/>
```

#### Image Loader Configuration

```typescript
// next.config.mjs
export default {
  images: {
    domains: ['blyss.co.ke', 'cdn.blyss.co.ke'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

### Code Splitting

#### Route-Based Splitting

Next.js automatically splits code by route. Each page bundle is loaded on demand.

#### Component-Level Splitting

```tsx
import dynamic from 'next/dynamic'

// Lazy load heavy components
const ProductImageGallery = dynamic(
  () => import('@/components/Product/ProductImageGallery'),
  {
    loading: () => <Skeleton className="aspect-[4/5]" />,
    ssr: false, // Client-side only if needed
  },
)

const ReviewList = dynamic(() => import('@/components/Review/ReviewList'), {
  loading: () => <Spinner />,
})
```

### Data Fetching Optimization

#### Server-Side Rendering (SSR)

```typescript
// For dynamic pages that need fresh data
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await api.GET('/v1/products/{slug}', {
    params: { path: { slug: params.slug } },
  })

  return <ProductDetail product={product} />
}
```

#### Static Site Generation (SSG)

```typescript
// For pages that can be pre-rendered
export async function generateStaticParams() {
  const products = await api.GET('/v1/products', {
    params: { query: { limit: 100 } },
  })

  return products.items.map((product) => ({
    slug: product.slug,
  }))
}

export const revalidate = 3600 // Revalidate every hour
```

#### Client-Side Caching

```typescript
// TanStack Query configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

### Lazy Loading

#### Intersection Observer for Product Grids

```tsx
'use client'

export function ProductGrid({ products }: { products: Product[] }) {
  const [visibleProducts, setVisibleProducts] = useState(products.slice(0, 12))
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleProducts((prev) => [
            ...prev,
            ...products.slice(prev.length, prev.length + 12),
          ])
        }
      },
      { threshold: 0.1 },
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [products])

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <div ref={loadMoreRef} className="h-10" />
    </>
  )
}
```

### Prefetching

#### Link Prefetching

```tsx
// Next.js automatically prefetches linked pages on hover
<Link href={`/product/${product.slug}`} prefetch={true}>
  <ProductCard product={product} />
</Link>
```

#### Manual Prefetching

```typescript
// Prefetch data on hover
const handleMouseEnter = () => {
  queryClient.prefetchQuery({
    queryKey: ['product', product.id],
    queryFn: () =>
      api.GET('/v1/products/{id}', {
        params: { path: { id: product.id } },
      }),
  })
}
```

### Bundle Size Optimization

#### Tree Shaking

```typescript
// Import only what you need
import { formatCurrency } from '@polar-sh/currency'
// Instead of: import * as currency from '@polar-sh/currency'
```

#### Bundle Analysis

```bash
# Analyze bundle size
ANALYZE=true pnpm build
```

### Performance Monitoring

#### Web Vitals

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

#### Performance Metrics

```typescript
// Track custom metrics
export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (metric.label === 'web-vital') {
    console.log(metric)
    // Send to analytics service
  }
}
```

## SEO and Metadata

### Page Metadata

#### Homepage Metadata

```typescript
// app/(main)/(website)/(landing)/page.tsx
export const metadata: Metadata = {
  title: 'Blyss - Digital Marketplace for Kenyan Creators',
  description:
    'Discover and sell digital products on Blyss. Digital art, templates, music, and more from talented Kenyan creators.',
  openGraph: {
    title: 'Blyss - Digital Marketplace for Kenyan Creators',
    description: 'Discover and sell digital products on Blyss.',
    images: [{ url: 'https://blyss.co.ke/og-image.png' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blyss - Digital Marketplace for Kenyan Creators',
    description: 'Discover and sell digital products on Blyss.',
    images: ['https://blyss.co.ke/og-image.png'],
  },
}
```

#### Product Page Metadata

```typescript
// app/(main)/product/[slug]/page.tsx
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const product = await api.GET('/v1/products/{slug}', {
    params: { path: { slug: params.slug } },
  })

  return {
    title: `${product.name} - ${product.organization.name} | Blyss`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.medias[0]?.path }],
      type: 'product',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.medias[0]?.path],
    },
  }
}
```

### Structured Data

#### Product Schema

```tsx
// components/Product/ProductSchema.tsx
export function ProductSchema({ product }: { product: Product }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.medias.map((m) => m.path),
    brand: {
      '@type': 'Organization',
      name: product.organization.name,
    },
    offers: {
      '@type': 'Offer',
      price: product.prices[0].price_amount / 100,
      priceCurrency: product.prices[0].price_currency.toUpperCase(),
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

#### Organization Schema

```tsx
// components/Creators/OrganizationSchema.tsx
export function OrganizationSchema({
  organization,
}: {
  organization: Organization
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organization.name,
    description: organization.bio,
    image: organization.avatar_url,
    url: `https://blyss.co.ke/${organization.slug}`,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### Sitemap Generation

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const api = await getServerSideAPI()

  // Fetch all products
  const products = await api.GET('/v1/products', {
    params: { query: { limit: 1000 } },
  })

  // Fetch all creators
  const creators = await api.GET('/v1/organizations', {
    params: { query: { limit: 1000 } },
  })

  return [
    {
      url: 'https://blyss.co.ke',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://blyss.co.ke/products',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://blyss.co.ke/creators',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...products.items.map((product) => ({
      url: `https://blyss.co.ke/product/${product.slug}`,
      lastModified: new Date(product.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...creators.items.map((creator) => ({
      url: `https://blyss.co.ke/${creator.slug}`,
      lastModified: new Date(creator.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
```

### Robots.txt

```typescript
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/checkout/'],
    },
    sitemap: 'https://blyss.co.ke/sitemap.xml',
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)

1. Set up Tailwind configuration with design tokens
2. Create base components (ProductCard, CreatorCard, FilterSidebar)
3. Implement currency selector and persistence
4. Set up API hooks (useProducts, useOrganizations, useSubscriptions)
5. Create layout components (HeroSection, ProductGrid, SearchBar)

### Phase 2: New Pages (Week 2)

1. Implement Homepage with featured content
2. Implement Browse Marketplace with filtering
3. Implement Explore Creators with search
4. Implement Help Center with FAQ accordion

### Phase 3: Update Existing Pages (Week 3)

1. Update Product Detail page styling
2. Update Creator Storefront styling
3. Update Shopping Cart styling
4. Update Wishlist styling

### Phase 4: Testing & Optimization (Week 4)

1. Write unit tests for components and hooks
2. Write property-based tests for core properties
3. Write E2E tests for critical user journeys
4. Optimize performance (images, code splitting, caching)
5. Conduct accessibility audit
6. SEO optimization and metadata

### Phase 5: Polish & Launch (Week 5)

1. Fix bugs from testing
2. Responsive design refinement
3. Dark mode testing
4. Performance monitoring setup
5. Documentation
6. Deployment

## Conclusion

This design document provides a comprehensive technical specification for implementing the Blyss Marketplace frontend. The implementation follows the editorial design system, reuses existing components, and integrates seamlessly with the FastAPI backend.

Key success factors:

- **Component Reuse**: Leverage existing components to maintain consistency
- **Design System Adherence**: Follow tonal layering, typography, and spacing guidelines
- **Multi-Currency Support**: Properly handle 37 currencies with KES as default
- **Performance**: Optimize images, code splitting, and caching
- **Testing**: Comprehensive unit, property-based, and E2E tests
- **Accessibility**: WCAG AA compliance throughout
- **SEO**: Proper metadata, structured data, and sitemap

The implementation is structured in 5 phases over 5 weeks, with clear milestones and deliverables for each phase.

# Shopping Cart Design Document

## Overview

This design document describes the implementation of multi-product shopping cart functionality for Polar. The shopping cart allows customers to add multiple one-time digital products to a cart and purchase them together in a single checkout session. Subscriptions (recurring products) will continue to bypass the cart and proceed directly to checkout.

The implementation follows Polar's modular architecture with clear separation between backend services (FastAPI), frontend components (Next.js/React), and state management (Zustand). The cart supports both authenticated users and guest sessions, with automatic migration when guests log in.

### Key Design Decisions

1. **One-Time Products Only**: The cart only accepts one-time products. Recurring products (subscriptions) bypass the cart entirely to maintain simple checkout logic.

2. **Dual Session Support**: The cart supports both authenticated users (via user_id) and guest sessions (via session_token), with automatic migration on login.

3. **7-Day Expiration**: Cart items expire after 7 days of inactivity to prevent database bloat from abandoned carts.

4. **Quantity Limits**: Cart items support quantities between 1 and 100 to prevent abuse while allowing bulk purchases.

5. **Existing Checkout Integration**: The cart integrates with the existing Checkout_Service, which already handles multi-item orders through the checkout_link feature.

## Architecture

### Backend Architecture

The backend follows Polar's modular structure with these components:

```
server/polar/cart/
├── __init__.py
├── endpoints.py       # API routes
├── service.py         # Business logic
├── repository.py      # Database operations
├── schemas.py         # Pydantic models
├── auth.py           # Authentication configuration
└── tasks.py          # Background jobs (cleanup)
```

### Database Schema

New table: `cart_items`

```sql
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Ensure either user_id or session_token is set, but not both
    CONSTRAINT cart_items_owner_check CHECK (
        (user_id IS NOT NULL AND session_token IS NULL) OR
        (user_id IS NULL AND session_token IS NOT NULL)
    ),

    -- Unique constraint: one cart item per product per owner
    CONSTRAINT cart_items_unique_product UNIQUE (user_id, product_id),
    CONSTRAINT cart_items_unique_product_session UNIQUE (session_token, product_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_cart_items_session_token ON cart_items(session_token) WHERE session_token IS NOT NULL;
CREATE INDEX idx_cart_items_updated_at ON cart_items(updated_at);
```

### Frontend Architecture

The frontend follows Polar's component structure:

```
clients/apps/web/src/
├── components/Cart/
│   ├── CartIcon.tsx           # Navigation header icon with count
│   ├── CartPage.tsx           # Main cart page
│   ├── CartItem.tsx           # Individual cart item display
│   └── EmptyCart.tsx          # Empty state
├── components/Products/
│   └── ProductCard.tsx        # Modified to show "Add to Cart" button
├── hooks/queries/
│   └── cart.ts                # TanStack Query hooks
└── stores/
    └── cartStore.ts           # Zustand store for cart state
```

## Components and Interfaces

### Backend Components

#### Cart Repository (`server/polar/cart/repository.py`)

Handles all database operations for cart items.

```python
class CartRepository(RepositoryBase[CartItem]):
    async def get_by_user(
        self,
        session: AsyncSession,
        user_id: UUID
    ) -> Sequence[CartItem]:
        """Get all non-expired cart items for a user."""

    async def get_by_session(
        self,
        session: AsyncSession,
        session_token: str
    ) -> Sequence[CartItem]:
        """Get all non-expired cart items for a guest session."""

    async def get_by_id_and_owner(
        self,
        session: AsyncSession,
        item_id: UUID,
        user_id: UUID | None,
        session_token: str | None
    ) -> CartItem | None:
        """Get a cart item by ID, verifying ownership."""

    async def upsert_item(
        self,
        session: AsyncSession,
        user_id: UUID | None,
        session_token: str | None,
        product_id: UUID,
        quantity: int,
        *,
        flush: bool = False
    ) -> CartItem:
        """Insert or update a cart item, incrementing quantity if exists."""

    async def delete_expired(
        self,
        session: AsyncSession,
        days: int = 7
    ) -> int:
        """Delete cart items older than specified days."""

    async def migrate_session_to_user(
        self,
        session: AsyncSession,
        session_token: str,
        user_id: UUID,
        *,
        flush: bool = False
    ) -> int:
        """Migrate guest cart items to user account, merging duplicates."""
```

#### Cart Service (`server/polar/cart/service.py`)

Contains business logic for cart operations.

```python
class CartService:
    async def add_item(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
        product_id: UUID,
        quantity: int = 1
    ) -> CartItem:
        """Add a product to the cart or increment quantity if exists."""

    async def remove_item(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
        item_id: UUID
    ) -> None:
        """Remove a specific cart item."""

    async def get_cart(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous]
    ) -> CartResponse:
        """Get all cart items with calculated totals."""

    async def clear_cart(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous]
    ) -> None:
        """Remove all cart items for the customer."""

    async def migrate_guest_cart(
        self,
        session: AsyncSession,
        session_token: str,
        user_id: UUID
    ) -> int:
        """Migrate guest cart to user account on login."""
```

#### Cart Endpoints (`server/polar/cart/endpoints.py`)

RESTful API endpoints for cart operations.

```python
@router.post("/v1/cart/items", response_model=CartItemResponse, status_code=201)
async def add_cart_item(
    auth_subject: CartWrite,
    product_id: UUID,
    quantity: int = 1,
    session: AsyncSession = Depends(get_db_session)
) -> CartItem:
    """Add a product to the cart."""

@router.delete("/v1/cart/items/{item_id}", status_code=204)
async def remove_cart_item(
    item_id: UUID,
    auth_subject: CartWrite,
    session: AsyncSession = Depends(get_db_session)
) -> None:
    """Remove a specific cart item."""

@router.get("/v1/cart", response_model=CartResponse)
async def get_cart(
    auth_subject: CartRead,
    session: AsyncSession = Depends(get_db_session)
) -> CartResponse:
    """Get all cart items with totals."""

@router.delete("/v1/cart", status_code=204)
async def clear_cart(
    auth_subject: CartWrite,
    session: AsyncSession = Depends(get_db_session)
) -> None:
    """Clear all items from the cart."""
```

#### Authentication (`server/polar/cart/auth.py`)

Cart-specific authentication configuration.

```python
_CartRead = Authenticator(
    required_scopes={Scope.web_default, Scope.cart_read},
    allowed_subjects={User, Anonymous},
)
CartRead = Annotated[AuthSubject[User | Anonymous], Depends(_CartRead)]

_CartWrite = Authenticator(
    required_scopes={Scope.web_default, Scope.cart_write},
    allowed_subjects={User, Anonymous},
)
CartWrite = Annotated[AuthSubject[User | Anonymous], Depends(_CartWrite)]
```

### Frontend Components

#### Cart Store (`clients/apps/web/src/stores/cartStore.ts`)

Zustand store for cart state management.

```typescript
interface CartStore {
  items: CartItem[]
  itemCount: number
  subtotal: number
  tax: number
  total: number

  addItem: (productId: string, quantity?: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}
```

#### Cart Hooks (`clients/apps/web/src/hooks/queries/cart.ts`)

TanStack Query hooks for API interactions.

```typescript
export const useCart = () => {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => api.cart.getCart(),
  })
}

export const useAddToCart = () => {
  return useMutation({
    mutationFn: ({ productId, quantity }: AddToCartParams) =>
      api.cart.addItem(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
```

#### Cart Page (`clients/apps/web/src/components/Cart/CartPage.tsx`)

Main cart page component displaying all cart items and totals.

```typescript
export const CartPage = () => {
  const { data: cart, isLoading } = useCart();
  const { mutate: removeItem } = useRemoveFromCart();

  if (isLoading) return <Spinner />;
  if (!cart || cart.items.length === 0) return <EmptyCart />;

  return (
    <div>
      {cart.items.map(item => (
        <CartItem key={item.id} item={item} onRemove={removeItem} />
      ))}
      <CartSummary subtotal={cart.subtotal} tax={cart.tax} total={cart.total} />
      <Button onClick={handleCheckout}>Proceed to Checkout</Button>
    </div>
  );
};
```

## Data Models

### Backend Models

#### CartItem Model (`server/polar/models/cart_item.py`)

```python
class CartItem(RecordModel):
    __tablename__ = "cart_items"

    user_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    session_token: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    product_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    @declared_attr
    def product(cls) -> Mapped["Product"]:
        return relationship("Product", lazy="selectin")
```

### API Schemas

#### Request Schemas (`server/polar/cart/schemas.py`)

```python
class CartItemCreate(Schema):
    product_id: UUID
    quantity: int = Field(default=1, ge=1, le=100)

class CartItemResponse(Schema):
    id: UUID
    product_id: UUID
    product: ProductResponse
    quantity: int
    subtotal: int  # price * quantity in cents
    created_at: datetime
    updated_at: datetime

class CartResponse(Schema):
    items: list[CartItemResponse]
    subtotal: int  # sum of all item subtotals in cents
    tax: int  # estimated tax in cents
    total: int  # subtotal + tax in cents
    item_count: int  # total number of items
```

### Frontend Types

```typescript
interface CartItem {
  id: string
  productId: string
  product: Product
  quantity: number
  subtotal: number
  createdAt: string
  updatedAt: string
}

interface Cart {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  itemCount: number
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:

1. **Properties 1.1 and 1.2** (user storage and guest storage) can be combined into a single property about cart item persistence with correct owner identification.

2. **Properties 1.3 and 1.4** (user retrieval and guest retrieval) are both round-trip properties that can be combined into a single property about cart persistence.

3. **Properties 5.5 and 5.6** (authentication handling) are covered by the general authentication system and don't need separate properties.

4. **Property 10.3** is redundant with **Property 2.6** - both test quantity validation.

5. **Properties 6.5 and 6.6** (order creation and cart clearing on checkout) can be combined into a single property about checkout completion.

6. **Properties 7.1 and 7.3** (migration and deletion) can be combined into a single comprehensive migration property.

### Property 1: Cart Item Persistence with Owner Identification

_For any_ customer (authenticated user or guest session) and any one-time product, adding the product to the cart should result in a cart item being stored with the correct owner identifier (user_id for authenticated users, session_token for guests).

**Validates: Requirements 1.1, 1.2**

### Property 2: Cart Persistence Round Trip

_For any_ customer and any set of cart items, adding items to the cart and then retrieving the cart should return all the added items with matching product IDs and quantities.

**Validates: Requirements 1.3, 1.4**

### Property 3: Cart Item Required Fields

_For any_ cart item created, it should contain all required fields: product_id, quantity, created_at, and updated_at timestamps.

**Validates: Requirements 1.5**

### Property 4: New Product Addition

_For any_ customer and any one-time product not already in their cart, adding the product should create a new cart item with quantity 1.

**Validates: Requirements 2.1**

### Property 5: Quantity Increment on Duplicate Addition

_For any_ cart item with quantity N, adding the same product again should result in the cart item having quantity N+1.

**Validates: Requirements 2.2**

### Property 6: Cart Item Deletion

_For any_ cart item, removing it should result in the item no longer being retrievable from the cart.

**Validates: Requirements 2.3**

### Property 7: Complete Cart Retrieval

_For any_ customer with cart items, retrieving the cart should return all items with complete product details and correctly calculated subtotals (price × quantity for each item).

**Validates: Requirements 2.4**

### Property 8: Cart Clearing

_For any_ customer with N cart items, clearing the cart should result in 0 cart items remaining.

**Validates: Requirements 2.5**

### Property 9: Quantity Validation

_For any_ quantity value, the cart service should accept values in the range [1, 100] and reject values outside this range with a 422 error.

**Validates: Requirements 2.6, 10.3**

### Property 10: Recurring Product Rejection

_For any_ recurring product (subscription), attempting to add it to the cart should result in an error indicating that subscriptions cannot be added to the cart.

**Validates: Requirements 3.1**

### Property 11: One-Time Product Addition Allowed

_For any_ cart containing one-time products and any additional one-time product, adding the additional product should succeed.

**Validates: Requirements 3.2**

### Property 12: Expired Cart Item Exclusion

_For any_ cart item with updated_at timestamp older than 7 days, it should not appear in cart retrieval results.

**Validates: Requirements 4.1**

### Property 13: Cart Cleanup Selective Deletion

_For any_ set of cart items with various updated_at timestamps, running the cleanup process should delete only items older than 7 days and preserve items newer than 7 days.

**Validates: Requirements 4.3**

### Property 14: Updated Timestamp on Modification

_For any_ cart item modification operation (quantity change, etc.), the updated_at timestamp should be more recent than before the modification.

**Validates: Requirements 4.4**

### Property 15: HTTP Status Code Correctness

_For any_ cart API operation, successful operations should return 2xx status codes, not-found errors should return 404, and validation errors should return 422.

**Validates: Requirements 5.7**

### Property 16: Checkout Session Creation with All Items

_For any_ cart with N items, creating a checkout session should result in a checkout containing all N cart items.

**Validates: Requirements 6.1**

### Property 17: Subtotal Calculation

_For any_ set of cart items, the calculated subtotal should equal the sum of (price × quantity) for each item.

**Validates: Requirements 6.2**

### Property 18: Tax Calculation

_For any_ cart subtotal and customer location, the checkout service should calculate tax based on the subtotal and location.

**Validates: Requirements 6.3**

### Property 19: Platform Fee Calculation

_For any_ combined total, the platform fee should be calculated according to the platform fee formula.

**Validates: Requirements 6.4**

### Property 20: Checkout Completion Effects

_For any_ cart with N items, successful checkout completion should result in N order items being created and the cart being emptied.

**Validates: Requirements 6.5, 6.6**

### Property 21: Guest Cart Migration with Quantity Merging

_For any_ guest cart with items and user cart with potentially overlapping items, migration should transfer all guest items to the user account, summing quantities for duplicate products, and delete the guest cart items.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 22: Navigation Cart Count Display

_For any_ cart state with N items, the navigation header should display the count N.

**Validates: Requirements 8.3**

### Property 23: Cart Page Complete Item Display

_For any_ cart with items, the cart page should render all items with product name, price, quantity, and subtotal for each item.

**Validates: Requirements 8.5**

### Property 24: Remove Button Presence

_For any_ cart with N items, the cart page should display N remove buttons (one per item).

**Validates: Requirements 8.6**

### Property 25: Cart Page Total Display

_For any_ cart, the cart page should display the calculated subtotal, estimated tax, and total.

**Validates: Requirements 8.7**

### Property 26: Cart State Synchronization

_For any_ successful cart operation (add, remove, clear), the local cart state should be updated to reflect the change.

**Validates: Requirements 9.2**

### Property 27: Cart Item Count Accuracy

_For any_ cart state, the exposed item count should equal the actual number of items in the cart.

**Validates: Requirements 9.5**

### Property 28: Out of Stock Error

_For any_ product that is out of stock, attempting to add it to the cart should result in an error preventing the operation.

**Validates: Requirements 10.1**

### Property 29: Non-Existent Product Error

_For any_ non-existent product ID, attempting to add it to the cart should return a 404 error.

**Validates: Requirements 10.2**

### Property 30: Non-Existent Cart Item Removal Error

_For any_ non-existent cart item ID, attempting to remove it should return a 404 error.

**Validates: Requirements 10.4**

### Property 31: Consistent Error Response Format

_For any_ error condition in the cart API, the error response should follow a consistent JSON format with descriptive error messages.

**Validates: Requirements 10.5**

## Error Handling

### Backend Error Handling

The cart service defines custom exceptions that inherit from a base `CartError` class:

```python
class CartError(PolarError):
    """Base class for cart-related errors."""
    pass

class RecurringProductNotAllowed(CartError):
    def __init__(self, product: Product) -> None:
        self.product = product
        message = f"Recurring products cannot be added to cart. Product {product.id} is a subscription."
        super().__init__(message, 422)

class ProductNotFound(CartError):
    def __init__(self, product_id: UUID) -> None:
        self.product_id = product_id
        message = f"Product {product_id} not found."
        super().__init__(message, 404)

class CartItemNotFound(CartError):
    def __init__(self, item_id: UUID) -> None:
        self.item_id = item_id
        message = f"Cart item {item_id} not found."
        super().__init__(message, 404)

class InvalidQuantity(CartError):
    def __init__(self, quantity: int) -> None:
        self.quantity = quantity
        message = f"Quantity must be between 1 and 100. Received: {quantity}"
        super().__init__(message, 422)

class ProductOutOfStock(CartError):
    def __init__(self, product: Product) -> None:
        self.product = product
        message = f"Product {product.id} is out of stock."
        super().__init__(message, 422)
```

### Frontend Error Handling

The frontend uses TanStack Query's error handling with toast notifications:

```typescript
const { mutate: addToCart } = useAddToCart({
  onError: (error) => {
    if (error.status === 422) {
      toast.error(error.message || 'Invalid request')
    } else if (error.status === 404) {
      toast.error('Product not found')
    } else {
      toast.error('Failed to add item to cart')
    }
  },
  onSuccess: () => {
    toast.success('Added to cart')
  },
})
```

### Session Token Management

For guest users, the session token is managed via cookies:

- Token is generated on first cart interaction if not present
- Token is stored in an HTTP-only cookie for security
- Token is sent with all cart API requests
- Token is cleared after successful migration to user account

## Testing Strategy

### Dual Testing Approach

The shopping cart feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

### Property-Based Testing

We will use **Hypothesis** for Python backend property tests and **fast-check** for TypeScript frontend property tests.

Each property test must:

- Run a minimum of 100 iterations
- Reference its design document property in a comment
- Use the tag format: `# Feature: shopping-cart, Property {number}: {property_text}`

Example property test structure:

```python
# Feature: shopping-cart, Property 2: Cart Persistence Round Trip
@given(
    user_id=st.uuids(),
    products=st.lists(st.builds(Product), min_size=1, max_size=10),
    quantities=st.lists(st.integers(min_value=1, max_value=100), min_size=1, max_size=10)
)
@settings(max_examples=100)
async def test_cart_persistence_round_trip(user_id, products, quantities):
    # Add items to cart
    for product, quantity in zip(products, quantities):
        await cart_service.add_item(session, user_id, product.id, quantity)

    # Retrieve cart
    cart = await cart_service.get_cart(session, user_id)

    # Verify all items are present with correct quantities
    assert len(cart.items) == len(products)
    for product, quantity in zip(products, quantities):
        item = next(i for i in cart.items if i.product_id == product.id)
        assert item.quantity == quantity
```

### Unit Testing

Unit tests should focus on:

1. **Specific examples**: Test concrete scenarios like adding a specific product
2. **Edge cases**: Empty cart, single item, maximum quantity
3. **Error conditions**: Out of stock, invalid product ID, expired cart items
4. **Integration points**: Checkout integration, migration on login

Example unit test structure:

```python
class TestCartService:
    async def test_add_item_creates_new_cart_item(self, session, user, product):
        """Test that adding a new product creates a cart item with quantity 1."""
        item = await cart_service.add_item(session, user.id, product.id)

        assert item.product_id == product.id
        assert item.quantity == 1
        assert item.user_id == user.id

    async def test_add_item_increments_existing_quantity(self, session, user, cart_item):
        """Test that adding an existing product increments its quantity."""
        original_quantity = cart_item.quantity

        item = await cart_service.add_item(session, user.id, cart_item.product_id)

        assert item.id == cart_item.id
        assert item.quantity == original_quantity + 1
```

### Test Organization

Backend tests follow the structure:

```
tests/cart/
├── test_endpoints.py      # E2E API tests
├── test_service.py        # Service layer unit tests
├── test_repository.py     # Repository layer unit tests
├── test_tasks.py          # Background job tests
└── test_properties.py     # Property-based tests
```

Frontend tests follow the structure:

```
clients/apps/web/src/components/Cart/
├── __tests__/
│   ├── CartPage.test.tsx
│   ├── CartItem.test.tsx
│   └── CartStore.test.ts
└── __properties__/
    └── cart.properties.test.ts
```

### Test Coverage Goals

- Backend: Minimum 90% code coverage
- Frontend: Minimum 85% code coverage
- All correctness properties must have corresponding property tests
- All error conditions must have unit tests
- All API endpoints must have E2E tests

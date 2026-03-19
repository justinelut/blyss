# Design Document: Additional Marketplace Features

## Overview

This design document specifies the implementation of six complementary marketplace features that enhance the BLYSS platform's product discovery, creator engagement, and user personalization capabilities. These features build upon the existing marketplace infrastructure (homepage, storefronts, cart, Paystack integration) to create a complete e-commerce experience.

## CRITICAL IMPLEMENTATION GUIDELINES

**AVOID DUPLICATION - CHECK FIRST:**
- Before implementing any component, thoroughly check what's already implemented in the codebase
- Search for existing similar functionality before creating new code
- Verify that the feature doesn't already exist in a different form
- Do not duplicate existing functionality - reuse and extend instead
- Use grep/search tools to find existing implementations
- Check existing models, services, endpoints, and components

The six feature systems are:

1. **Product Detail System**: Comprehensive product pages with images, creator information, and related products
2. **Newsletter System**: Creator newsletter subscriptions with email management
3. **Donation System**: One-time donations to support creators
4. **Category System**: Product organization and discovery by category
5. **Wishlist System**: Authenticated user product saving and synchronization
6. **Review System**: Product reviews and ratings for verified purchases

### Key Design Principles

1. **Modular Architecture**: Each system is independently deployable and maintainable
2. **Authentication Flexibility**: Support both authenticated and anonymous users where appropriate
3. **Performance First**: Server-side rendering, caching, and lazy loading throughout
4. **Mobile Responsive**: All features work seamlessly on mobile devices
5. **Data Integrity**: Proper foreign key relationships and cascade behaviors
6. **Extensibility**: Design for future enhancements (e.g., review moderation, advanced analytics)

### Technology Stack

**Backend**:

- FastAPI for API endpoints
- SQLAlchemy for ORM and database models
- PostgreSQL for data persistence
- Dramatiq for background jobs (email sending)
- Paystack for donation payment processing

**Frontend**:

- Next.js 14 with App Router
- React Server Components for SEO
- TanStack Query for data fetching
- Zustand for client state management
- Tailwind CSS for styling

## Architecture

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BLYSS Marketplace                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Product    │  │  Newsletter  │  │   Donation   │     │
│  │    Detail    │  │    System    │  │    System    │     │
│  │    System    │  │              │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐     │
│  │   Category   │  │   Wishlist   │  │    Review    │     │
│  │    System    │  │    System    │  │    System    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Shared Infrastructure                         │  │
│  │  - Product API                                        │  │
│  │  - Organization API                                   │  │
│  │  - Authentication System                              │  │
│  │  - Email Service                                      │  │
│  │  - Payment Processing (Paystack)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

Each feature system follows the established Polar modular structure:

```
server/polar/{feature}/
├── __init__.py
├── endpoints.py      # API routes
├── service.py        # Business logic
├── repository.py     # Database queries
├── schemas.py        # Pydantic models
├── auth.py          # Authentication rules
└── tasks.py         # Background jobs (if needed)

server/polar/models/
└── {feature}.py     # SQLAlchemy models

clients/apps/web/src/
├── app/(main)/product/[slug]/
│   └── page.tsx     # Product detail page
├── app/(main)/[organization]/
│   └── storefront components
└── hooks/queries/
    └── {feature}.ts # TanStack Query hooks
```

### Data Flow Patterns

**Read Operations** (Product Details, Reviews):

```
User Request → Next.js Server Component → API Endpoint → Repository → Database
                                                                          ↓
User Response ← React Hydration ← Server HTML ← Service Logic ← Query Result
```

**Write Operations** (Newsletter, Donations, Wishlist, Reviews):

```
User Action → Client Component → API Endpoint → Service Validation
                                                        ↓
                                                  Repository
                                                        ↓
                                                  Database Transaction
                                                        ↓
                                                  Background Job (if needed)
                                                        ↓
                                                  Email/Notification
```

## Components and Interfaces

### 1. Product Detail System

#### 1.1 Backend Models

**Location**: `server/polar/models/product_view.py`

```python
from sqlalchemy import ForeignKey, Index, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from polar.kit.db.models import RecordModel

class ProductView(RecordModel):
    """Track product page views for analytics"""
    __tablename__ = "product_views"
    __table_args__ = (
        Index("ix_product_views_product_id", "product_id"),
        Index("ix_product_views_created_at", "created_at"),
    )

    product_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
```

#### 1.2 API Endpoints

**Location**: `server/polar/product/endpoints.py` (extend existing)

```python
@router.get("/{slug}", response_model=ProductDetailPublic)
async def get_product_by_slug(
    slug: str,
    session: AsyncReadSession = Depends(get_db_read_session),
    auth_subject: WebUserOrAnonymous = Depends(WebUserOrAnonymous),
) -> ProductDetailPublic:
    """
    Get product details by slug.
    Accessible to anonymous users.
    Tracks view for analytics.
    """
    pass

@router.get("/{id}/related", response_model=ListResource[ProductPublic])
async def get_related_products(
    id: UUID,
    limit: int = Query(4, ge=1, le=12),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[ProductPublic]:
    """
    Get related products based on category and creator.
    """
    pass
```

#### 1.3 Frontend Page Component

**Location**: `clients/apps/web/src/app/(main)/product/[slug]/page.tsx`

```typescript
interface ProductDetailPageProps {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  // Server-side fetch for SEO
  const product = await fetchProductBySlug(params.slug)

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductDetailView product={product} />
    </div>
  )
}
```

#### 1.4 Product Detail View Component

**Location**: `clients/apps/web/src/components/Product/ProductDetailView.tsx`

```typescript
interface ProductDetailViewProps {
  product: ProductDetail
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <ProductImageGallery images={product.images} />
      <ProductInfo product={product} />
      <ProductDescription description={product.description} />
      <CreatorInfo creator={product.creator} />
      <RelatedProducts productId={product.id} />
    </div>
  )
}
```

### 2. Newsletter System

#### 2.1 Backend Models

**Location**: `server/polar/models/newsletter_subscription.py`

```python
from sqlalchemy import Boolean, ForeignKey, Index, String, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from polar.kit.db.models import RecordModel

class NewsletterSubscription(RecordModel):
    """Newsletter subscriptions for creator updates"""
    __tablename__ = "newsletter_subscriptions"
    __table_args__ = (
        UniqueConstraint("email", "organization_id", name="uq_newsletter_email_org"),
        Index("ix_newsletter_subscriptions_organization_id", "organization_id"),
        Index("ix_newsletter_subscriptions_email", "email"),
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    unsubscribe_token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    organization: Mapped["Organization"] = relationship("Organization", lazy="raise")
```

#### 2.2 Newsletter Service

**Location**: `server/polar/newsletter/service.py`

```python
class NewsletterService:
    async def subscribe(
        self,
        session: AsyncSession,
        email: str,
        organization_id: UUID,
    ) -> NewsletterSubscription:
        """Subscribe email to organization newsletter"""
        pass

    async def unsubscribe(
        self,
        session: AsyncSession,
        token: str,
    ) -> NewsletterSubscription:
        """Unsubscribe using token from email"""
        pass

    async def send_newsletter(
        self,
        session: AsyncSession,
        organization_id: UUID,
        subject: str,
        content: str,
    ) -> int:
        """Send newsletter to all active subscribers"""
        pass
```

#### 2.3 API Endpoints

**Location**: `server/polar/newsletter/endpoints.py`

```python
@router.post("/subscribe", response_model=NewsletterSubscriptionPublic)
async def subscribe_to_newsletter(
    subscription_create: NewsletterSubscriptionCreate,
    session: AsyncSession = Depends(get_db_session),
) -> NewsletterSubscriptionPublic:
    """Subscribe to creator newsletter. No authentication required."""
    pass

@router.post("/unsubscribe/{token}")
async def unsubscribe_from_newsletter(
    token: str,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Unsubscribe using token from email"""
    pass
```

### 3. Donation System

#### 3.1 Backend Models

**Location**: `server/polar/models/donation.py`

```python
from sqlalchemy import ForeignKey, Index, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from polar.kit.db.models import RecordModel

class Donation(RecordModel):
    """One-time donations to creators"""
    __tablename__ = "donations"
    __table_args__ = (
        Index("ix_donations_organization_id", "organization_id"),
        Index("ix_donations_donor_email", "donor_email"),
        Index("ix_donations_created_at", "created_at"),
    )

    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # in cents
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    donor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    donor_email: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Paystack payment reference
    payment_reference: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    payment_status: Mapped[str] = mapped_column(String(50), nullable=False)  # pending, success, failed

    organization: Mapped["Organization"] = relationship("Organization", lazy="raise")
```

#### 3.2 Donation Service

**Location**: `server/polar/donation/service.py`

```python
class DonationService:
    async def initiate_donation(
        self,
        session: AsyncSession,
        organization_id: UUID,
        amount: int,
        donor_name: str,
        donor_email: str,
        message: str | None = None,
    ) -> tuple[Donation, str]:
        """
        Create donation record and initiate Paystack payment.
        Returns (donation, payment_url)
        """
        pass

    async def confirm_donation(
        self,
        session: AsyncSession,
        payment_reference: str,
    ) -> Donation:
        """Confirm donation payment via Paystack webhook"""
        pass

    async def get_creator_donations(
        self,
        session: AsyncSession,
        organization_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Donation]:
        """Get donation history for creator"""
        pass
```

#### 3.3 API Endpoints

**Location**: `server/polar/donation/endpoints.py`

```python
@router.post("/initiate", response_model=DonationInitiateResponse)
async def initiate_donation(
    donation_create: DonationCreate,
    session: AsyncSession = Depends(get_db_session),
) -> DonationInitiateResponse:
    """Initiate donation payment. No authentication required."""
    pass

@router.post("/webhook/paystack")
async def paystack_donation_webhook(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Handle Paystack payment confirmation webhook"""
    pass

@router.get("/creator/{organization_id}", response_model=ListResource[DonationPublic])
async def get_creator_donations(
    organization_id: UUID,
    auth_subject: WebUser,
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[DonationPublic]:
    """Get donations for creator. Requires authentication."""
    pass
```

### 4. Category System

#### 4.1 Backend Models

**Location**: `server/polar/models/product_category.py`

```python
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from polar.kit.db.models import RecordModel

class ProductCategory(RecordModel):
    """Product categories for organization"""
    __tablename__ = "product_categories"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_product_category_slug"),
        Index("ix_product_categories_slug", "slug"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ProductCategoryAssignment(RecordModel):
    """Many-to-many relationship between products and categories"""
    __tablename__ = "product_category_assignments"
    __table_args__ = (
        UniqueConstraint("product_id", "category_id", name="uq_product_category"),
        Index("ix_product_category_assignments_product_id", "product_id"),
        Index("ix_product_category_assignments_category_id", "category_id"),
    )

    product_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("product_categories.id", ondelete="CASCADE"),
        nullable=False,
    )

    product: Mapped["Product"] = relationship("Product", lazy="raise")
    category: Mapped["ProductCategory"] = relationship("ProductCategory", lazy="raise")
```

#### 4.2 Category Service

**Location**: `server/polar/category/service.py`

```python
class CategoryService:
    async def create_category(
        self,
        session: AsyncSession,
        name: str,
        slug: str,
        description: str | None = None,
    ) -> ProductCategory:
        """Create new product category"""
        pass

    async def assign_product_to_category(
        self,
        session: AsyncSession,
        product_id: UUID,
        category_id: UUID,
    ) -> ProductCategoryAssignment:
        """Assign product to category"""
        pass

    async def get_products_by_category(
        self,
        session: AsyncSession,
        category_slug: str,
        limit: int = 24,
        offset: int = 0,
    ) -> list[Product]:
        """Get products in category"""
        pass
```

### 5. Wishlist System

#### 5.1 Backend Models

**Location**: `server/polar/models/wishlist.py`

```python
from sqlalchemy import ForeignKey, Index, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from polar.kit.db.models import RecordModel

class WishlistItem(RecordModel):
    """User wishlist items"""
    __tablename__ = "wishlist_items"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),
        Index("ix_wishlist_items_user_id", "user_id"),
        Index("ix_wishlist_items_product_id", "product_id"),
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", lazy="raise")
    product: Mapped["Product"] = relationship("Product", lazy="raise")
```

#### 5.2 Wishlist Service

**Location**: `server/polar/wishlist/service.py`

```python
class WishlistService:
    async def add_to_wishlist(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
    ) -> WishlistItem:
        """Add product to user wishlist"""
        pass

    async def remove_from_wishlist(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
    ) -> None:
        """Remove product from wishlist"""
        pass

    async def get_user_wishlist(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> list[Product]:
        """Get all products in user wishlist"""
        pass

    async def is_in_wishlist(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
    ) -> bool:
        """Check if product is in user wishlist"""
        pass
```

### 6. Review System

#### 6.1 Backend Models

**Location**: `server/polar/models/product_review.py`

```python
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from polar.kit.db.models import RecordModel

class ProductReview(RecordModel):
    """Product reviews from verified purchasers"""
    __tablename__ = "product_reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_review_user_product"),
        Index("ix_product_reviews_product_id", "product_id"),
        Index("ix_product_reviews_user_id", "user_id"),
        Index("ix_product_reviews_rating", "rating"),
    )

    product_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    review_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified_purchase: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    product: Mapped["Product"] = relationship("Product", lazy="raise")
    user: Mapped["User"] = relationship("User", lazy="raise")
    order: Mapped["Order"] = relationship("Order", lazy="raise")
```

#### 6.2 Review Service

**Location**: `server/polar/review/service.py`

```python
class ReviewService:
    async def create_review(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
        order_id: UUID,
        rating: int,
        review_text: str | None = None,
    ) -> ProductReview:
        """Create product review. Validates verified purchase."""
        pass

    async def update_review(
        self,
        session: AsyncSession,
        review_id: UUID,
        user_id: UUID,
        rating: int,
        review_text: str | None = None,
    ) -> ProductReview:
        """Update existing review"""
        pass

    async def delete_review(
        self,
        session: AsyncSession,
        review_id: UUID,
        user_id: UUID,
    ) -> None:
        """Delete review"""
        pass

    async def get_product_reviews(
        self,
        session: AsyncSession,
        product_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ProductReview]:
        """Get reviews for product"""
        pass

    async def get_product_rating_summary(
        self,
        session: AsyncSession,
        product_id: UUID,
    ) -> dict:
        """Get average rating and count for product"""
        pass

    async def has_purchased_product(
        self,
        session: AsyncSession,
        user_id: UUID,
        product_id: UUID,
    ) -> bool:
        """Check if user has purchased product"""
        pass
```

## Data Models

### Product Detail Schema

```typescript
interface ProductDetail {
  id: string
  name: string
  description: string
  price: number
  currency: string
  images: string[]
  categories: Category[]
  isAvailable: boolean
  stock: number | null
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string
    slug: string
    avatar: string | null
    bio: string | null
  }
  reviews: {
    averageRating: number
    totalCount: number
  }
}
```

### Newsletter Subscription Schema

```typescript
interface NewsletterSubscription {
  id: string
  email: string
  organizationId: string
  isActive: boolean
  createdAt: string
}

interface NewsletterSubscriptionCreate {
  email: string
  organizationId: string
}
```

### Donation Schema

```typescript
interface Donation {
  id: string
  amount: number
  currency: string
  donorName: string
  donorEmail: string
  message: string | null
  organizationId: string
  paymentReference: string
  paymentStatus: 'pending' | 'success' | 'failed'
  createdAt: string
}

interface DonationCreate {
  organizationId: string
  amount: number
  donorName: string
  donorEmail: string
  message?: string
}

interface DonationInitiateResponse {
  donation: Donation
  paymentUrl: string
}
```

### Category Schema

```typescript
interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  productCount: number
  displayOrder: number
}

interface CategoryCreate {
  name: string
  slug: string
  description?: string
}
```

### Wishlist Schema

```typescript
interface WishlistItem {
  id: string
  userId: string
  productId: string
  product: ProductPublic
  createdAt: string
}
```

### Review Schema

```typescript
interface ProductReview {
  id: string
  productId: string
  userId: string
  userName: string
  userAvatar: string | null
  rating: number
  reviewText: string | null
  isVerifiedPurchase: boolean
  createdAt: string
  updatedAt: string
}

interface ReviewCreate {
  productId: string
  orderId: string
  rating: number
  reviewText?: string
}

interface ReviewUpdate {
  rating: number
  reviewText?: string
}

interface ProductRatingSummary {
  averageRating: number
  totalReviews: number
  ratingDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Product Detail Completeness

_For any_ product, when rendered on the product detail page, the output must contain the product name, price, description, images, and creator information (name, avatar, storefront link).

**Validates: Requirements 1.1, 1.2**

### Property 2: Product Availability Conditional Rendering

_For any_ product, when the product is available (in stock), the detail page must display "Add to Cart" and "Buy Now" buttons; when the product is out of stock, the page must display "Out of Stock" message instead of purchase buttons.

**Validates: Requirements 1.3, 1.4, 1.7**

### Property 3: Related Products Minimum Count

_For any_ product with a category, the related products query must return at least 4 products (or all available products if fewer than 4 exist in the same category).

**Validates: Requirements 1.5**

### Property 4: Newsletter Email Validation

_For any_ email string, the newsletter subscription system must accept it if and only if it matches valid email format (contains @ symbol, valid domain structure).

**Validates: Requirements 2.7**

### Property 5: Newsletter Subscription Persistence

_For any_ valid email and organization ID, when a subscription is created, querying the database must return the subscription record with matching email and organization ID.

**Validates: Requirements 2.2**

### Property 6: Newsletter Duplicate Prevention

_For any_ email and organization ID, if a subscription already exists, attempting to create another subscription with the same email and organization ID must return an error indicating existing subscription.

**Validates: Requirements 2.6**

### Property 7: Newsletter Unsubscribe Token Validity

_For any_ newsletter subscription, the unsubscribe token must successfully remove the subscription when used, and the subscription must no longer appear in active subscriptions.

**Validates: Requirements 2.5**

### Property 8: Newsletter Email Contains Unsubscribe Link

_For any_ newsletter email generated by the system, the email content must contain an unsubscribe link with a valid token.

**Validates: Requirements 2.4**

### Property 9: Email Job Creation on Events

_For any_ event that triggers email sending (newsletter subscription, successful donation, review submission), an email job must be created in the system within the event handler.

**Validates: Requirements 2.3, 3.6, 9.3**

### Property 10: Donation Amount Validation

_For any_ donation amount, the system must accept it if and only if the amount is between 100 and 1000000 (inclusive) in the platform currency.

**Validates: Requirements 3.3**

### Property 11: Donation Persistence and Payment Initiation

_For any_ valid donation request, the system must create a donation record in the database and return a Paystack payment URL.

**Validates: Requirements 3.4, 3.7**

### Property 12: Donation History Accuracy

\*Fo
rying each category must include that product in the results.

**Validates: Requirements 4.6**

### Property 15: Category Product Count Accuracy

_For any_ category, the product count displayed must equal the number of products assigned to that category.

**Validates: Requirements 4.7**

### Property 16: Wishlist Add and Retrieve

_For any_ authenticated user and product, when the product is added to the user's wishlist, querying the user's wishlist must include that product.

**Validates: Requirements 5.2, 5.4**

### Property 17: Wishlist Remove Operation

_For any_ authenticated user and product in their wishlist, when the product is removed, querying the user's wishlist must not include that product.

**Validates: Requirements 5.5**

### Property 18: Wishlist Button State Consistency

_For any_ authenticated user and product, if the product is in the user's wishlist, the UI must display "Remove from Wishlist"; if not in wishlist, the UI must display "Save to Wishlist".

**Validates: Requirements 5.3**

### Property 19: Wishlist Cascade Delete

_For any_ product that exists in user wishlists, when the product is deleted, all wishlist items referencing that product must be automatically removed.

**Validates: Requirements 5.8**

### Property 20: Wishlist Cross-Device Synchronization

_For any_ authenticated user, wishlist items added on one device must appear when the user logs in on any other device.

**Validates: Requirements 11.1, 11.2**

### Property 21: Review Rating Validation

_For any_ review submission, the system must accept the rating if and only if it is an integer between 1 and 5 (inclusive).

**Validates: Requirements 6.3**

### Property 22: Review Text Length Validation

_For any_ review submission, the system must accept the review text if and only if it is 1000 characters or fewer (or null for no text).

**Validates: Requirements 6.4**

### Property 23: Review Verified Purchase Authorization

_For any_ user and product, the user can submit a review if and only if they have a completed order containing that product.

**Validates: Requirements 6.2**

### Property 24: Review Average Rating Calculation

_For any_ product with reviews, the average rating must equal the sum of all review ratings divided by the number of reviews, rounded to one decimal place.

**Validates: Requirements 6.6**

### Property 25: Review Count Accuracy

_For any_ product, the review count displayed must equal the number of review records for that product.

**Validates: Requirements 6.7**

### Property 26: Review Update Authorization

_For any_ review, only the user who created the review can update it, and the updated review must reflect the new rating and text.

**Validates: Requirements 6.9**

### Property 27: Review Delete Authorization

_For any_ review, only the user who created the review can delete it, and after deletion, the review must not appear in product reviews.

**Validates: Requirements 6.10**

### Property 28: Review Deletion Recalculates Average

_For any_ product with multiple reviews, when a review is deleted, the average rating must be recalculated to reflect only the remaining reviews.

**Validates: Requirements 12.4**

### Property 29: Donation Receipt Completeness

_For any_ successful donation, the generated receipt must contain donor name, amount, date, and transaction ID.

**Validates: Requirements 9.1, 9.2**

### Property 30: Category Update Persistence

_For any_ category, when the name or description is updated, querying the category must return the updated values.

**Validates: Requirements 10.2**

### Property 31: Category Deletion Cascade

_For any_ category with assigned products, when the category is deleted, all product-category assignments for that category must be removed.

**Validates: Requirements 10.4**

### Property 32: Category Display Order Enforcement

_For any_ set of categories, when queried for display, the categories must be ordered by the display_order field in ascending order.

**Validates: Requirements 10.5**

### Property 33: Category Slug Uniqueness

_For any_ category slug, attempting to create a second category with the same slug must be rejected with a uniqueness constraint error.

**Validates: Requirements 10.6**

### Property 34: Newsletter Unsubscribe Isolation

_For any_ user subscribed to multiple creator newsletters, unsubscribing from one creator's newsletter must not affect subscriptions to other creators.

**Validates: Requirements 14.1**

### Property 35: Product View Tracking

_For any_ product detail page view, a product view record must be created with the product ID and timestamp.

**Validates: Requirements 15.1**

### Property 36: Add to Cart Click Tracking

_For any_ "Add to Cart" button click, an analytics event must be recorded with the product ID and timestamp.

**Validates: Requirements 15.2**

### Property 37: Donation Total Calculation

_For any_ organization, the total donations received must equal the sum of all successful donation amounts for that organization.

**Validates: Requirements 15.3**

### Property 38: Newsletter Subscriber Growth Tracking

_For any_ organization and time period, the subscriber growth must equal the number of new subscriptions minus unsubscriptions in that period.

**Validates: Requirements 15.4**

### Property 39: Review Rating Trend Tracking

_For any_ product and time period, the average rating trend must reflect the average of all reviews created within that time period.

**Validates: Requirements 15.5**

## Error Handling

### Product Detail System Errors

**Scenario**: Product not found by slug

**Handling**:

- Return 404 Not Found
- Display user-friendly error page
- Suggest browsing marketplace or searching

**Implementation**:

```python
product = await product_service.get_by_slug(session, slug)
if not product:
    raise HTTPException(status_code=404, detail="Product not found")
```

**Scenario**: Related products query fails

**Handling**:

- Log error for monitoring
- Return empty related products list
- Don't block main product display

**Implementation**:

```python
try:
    related = await product_service.get_related(session, product.id)
except Exception as e:
    logger.error(f"Failed to fetch related products: {e}")
    related = []
```

### Newsletter System Errors

**Scenario**: Invalid email format

**Handling**:

- Return 422 Unprocessable Entity
- Provide clear validation error message
- Highlight email field in UI

**Implementation**:

```python
if not is_valid_email(email):
    raise HTTPException(
        status_code=422,
        detail="Invalid email format"
    )
```

**Scenario**: Duplicate subscription attempt

**Handling**:

- Return 409 Conflict
- Message: "You're already subscribed to this newsletter"
- Provide unsubscribe link

**Implementation**:

```python
existing = await newsletter_repo.get_by_email_and_org(session, email, org_id)
if existing and existing.is_active:
    raise HTTPException(
        status_code=409,
        detail="Already subscribed to this newsletter"
    )
```

**Scenario**: Email sending fails

**Handling**:

- Log error with full context
- Retry up to 3 times with exponential backoff
- Alert monitoring if all retries fail
- Don't block user flow (async job)

**Implementation**:

```python
@dramatiq.actor(max_retries=3, min_backoff=1000, max_backoff=30000)
async def send_newsletter_confirmation(subscription_id: str):
    try:
        await email_service.send_confirmation(subscription_id)
    except Exception as e:
        logger.error(f"Failed to send confirmation email: {e}")
        raise  # Trigger retry
```

### Donation System Errors

**Scenario**: Invalid donation amount

**Handling**:

- Return 422 Unprocessable Entity
- Message: "Donation amount must be between KES 100 and KES 1,000,000"
- Highlight amount field

**Implementation**:

```python
if not (100 <= amount <= 1000000):
    raise HTTPException(
        status_code=422,
        detail="Donation amount must be between 100 and 1000000"
    )
```

**Scenario**: Paystack payment initiation fails

**Handling**:

- Return 502 Bad Gateway
- Message: "Payment service temporarily unavailable"
- Provide retry button
- Log error with Paystack response

**Implementation**:

```python
try:
    payment_url = await paystack_service.initialize_transaction(...)
except PaystackError as e:
    logger.error(f"Paystack initialization failed: {e}")
    raise HTTPException(
        status_code=502,
        detail="Payment service temporarily unavailable. Please try again."
    )
```

**Scenario**: Webhook signature verification fails

**Handling**:

- Return 401 Unauthorized
- Log security warning
- Don't process webhook
- Alert security monitoring

**Implementation**:

```python
if not verify_paystack_signature(request.headers, request.body):
    logger.warning("Invalid Paystack webhook signature")
    raise HTTPException(status_code=401, detail="Invalid signature")
```

### Category System Errors

**Scenario**: Category slug already exists

**Handling**:

- Return 409 Conflict
- Message: "Category with this slug already exists"
- Suggest alternative slug

**Implementation**:

```python
try:
    category = await category_service.create(session, name, slug)
except IntegrityError:
    raise HTTPException(
        status_code=409,
        detail="Category with this slug already exists"
    )
```

**Scenario**: Category not found

**Handling**:

- Return 404 Not Found
- Display empty state with category list
- Suggest browsing all products

**Implementation**:

```python
category = await category_repo.get_by_slug(session, slug)
if not category:
    raise HTTPException(status_code=404, detail="Category not found")
```

### Wishlist System Errors

**Scenario**: Unauthenticated user attempts wishlist operation

**Handling**:

- Return 401 Unauthorized
- Redirect to login page
- Preserve intended action (return URL)

**Implementation**:

```python
if not auth_subject.is_user:
    raise HTTPException(
        status_code=401,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"}
    )
```

**Scenario**: Product not found when adding to wishlist

**Handling**:

- Return 404 Not Found
- Message: "Product not found or no longer available"
- Refresh product list

**Implementation**:

```python
product = await product_repo.get(session, product_id)
if not product or product.is_archived:
    raise HTTPException(
        status_code=404,
        detail="Product not found or no longer available"
    )
```

**Scenario**: Duplicate wishlist item

**Handling**:

- Return 409 Conflict (or treat as idempotent success)
- Message: "Product already in wishlist"
- Update UI to show "Remove from Wishlist"

**Implementation**:

```python
existing = await wishlist_repo.get_by_user_and_product(session, user_id, product_id)
if existing:
    return existing  # Idempotent - return existing item
```

### Review System Errors

**Scenario**: User attempts to review without purchase

**Handling**:

- Return 403 Forbidden
- Message: "You must purchase this product before reviewing"
- Provide "Buy Now" link

**Implementation**:

```python
has_purchased = await review_service.has_purchased_product(session, user_id, product_id)
if not has_purchased:
    raise HTTPException(
        status_code=403,
        detail="You must purchase this product before reviewing"
    )
```

**Scenario**: Invalid rating value

**Handling**:

- Return 422 Unprocessable Entity
- Message: "Rating must be between 1 and 5"
- Reset rating input to valid value

**Implementation**:

```python
if not (1 <= rating <= 5):
    raise HTTPException(
        status_code=422,
        detail="Rating must be between 1 and 5"
    )
```

**Scenario**: Review text exceeds character limit

**Handling**:

- Return 422 Unprocessable Entity
- Message: "Review text must be 1000 characters or less"
- Show character count in UI

**Implementation**:

```python
if review_text and len(review_text) > 1000:
    raise HTTPException(
        status_code=422,
        detail="Review text must be 1000 characters or less"
    )
```

**Scenario**: User attempts to edit another user's review

**Handling**:

- Return 403 Forbidden
- Message: "You can only edit your own reviews"
- Log security event

**Implementation**:

```python
review = await review_repo.get(session, review_id)
if review.user_id != user_id:
    logger.warning(f"User {user_id} attempted to edit review {review_id}")
    raise HTTPException(
        status_code=403,
        detail="You can only edit your own reviews"
    )
```

### Database Errors

**Scenario**: Database connection fails

**Handling**:

- Return 503 Service Unavailable
- Message: "Service temporarily unavailable"
- Retry with exponential backoff
- Alert monitoring

**Implementation**:

```python
try:
    async with get_db_session() as session:
        # ... database operations
except OperationalError as e:
    logger.error(f"Database connection failed: {e}")
    raise HTTPException(
        status_code=503,
        detail="Service temporarily unavailable"
    )
```

**Scenario**: Foreign key constraint violation

**Handling**:

- Return 400 Bad Request
- Message: "Referenced resource not found"
- Log error with details

**Implementation**:

```python
try:
    await session.commit()
except IntegrityError as e:
    if "foreign key constraint" in str(e):
        raise HTTPException(
            status_code=400,
            detail="Referenced resource not found"
        )
    raise
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, error conditions, and integration points between components. Unit tests verify concrete scenarios and ensure components work together correctly.

**Property Tests**: Verify universal properties across all inputs using randomization. Property tests ensure correctness holds for the entire input space, not just specific examples.

Together, these approaches provide comprehensive coverage: unit tests catch concrete bugs and verify integration, while property tests verify general correctness across all possible inputs.

### Property-Based Testing Configuration

**Library Selection**:

- **Backend (Python)**: Use `hypothesis` for property-based testing
- **Frontend (TypeScript)**: Use `fast-check` for property-based testing

**Test Configuration**:

- Minimum 100 iterations per property test
- Each property test must reference its design document property
- Tag format: `Feature: additional-marketplace-features, Property {number}: {property_text}`

**Example Property Test (Backend)**:

```python
from hypothesis import given, strategies as st
import pytest

@given(
    email=st.emails(),
    org_id=st.uuids()
)
@pytest.mark.asyncio
async def test_newsletter_subscription_persistence(email, org_id, db_session):
    """
    Feature: additional-marketplace-features, Property 5: Newsletter Subscription Persistence
    For any valid email and organization ID, when a subscription is created,
    querying the database must return the subscription record.
    """
    # Create subscription
    subscription = await newsletter_service.subscribe(
        db_session,
        email=email,
        organization_id=org_id
    )

    # Query database
    retrieved = await newsletter_repo.get_by_email_and_org(
        db_session,
        email=email,
        organization_id=org_id
    )

    # Verify persistence
    assert retrieved is not None
    assert retrieved.email == email
    assert retrieved.organization_id == org_id
    assert retrieved.id == subscription.id
```

**Example Property Test (Frontend)**:

```typescript
import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

describe('Feature: additional-marketplace-features, Property 10: Donation Amount Validation', () => {
  it('should accept amounts between 100 and 1000000', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 1000000 }), (amount) => {
        const result = validateDonationAmount(amount)
        expect(result.isValid).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  it('should reject amounts outside valid range', () => {
    fc.assert(
      fc.property(
        fc.integer().filter((n) => n < 100 || n > 1000000),
        (amount) => {
          const result = validateDonationAmount(amount)
          expect(result.isValid).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })
})
```

### Unit Testing Strategy

**Critical Unit Test Cases**:

**Product Detail System**:

- Product detail page renders with all required fields
- Related products query returns products from same category
- Out of stock products show correct message
- Product view tracking creates database record
- Anonymous users can access product pages

**Newsletter System**:

- Valid email subscriptions are created
- Invalid email formats are rejected
- Duplicate subscriptions return conflict error
- Unsubscribe tokens work correctly
- Confirmation emails are queued
- Newsletter emails contain unsubscribe links

**Donation System**:

- Valid donation amounts are accepted
- Invalid amounts (< 100 or > 1000000) are rejected
- Paystack payment initialization returns URL
- Successful donations create database records
- Donation receipts contain all required fields
- Webhook signature verification works

**Category System**:

- Categories can be created with unique slugs
- Duplicate slugs are rejected
- Products can be assigned to multiple categories
- Category product queries return correct products
- Product counts are accurate
- Category deletion removes assignments

**Wishlist System**:

- Authenticated users can add products to wishlist
- Unauthenticated users are redirected to login
- Products can be removed from wishlist
- Wishlist queries return user's products
- Product deletion cascades to wishlist items
- Wishlist syncs across devices (same user)

**Review System**:

- Users with verified purchases can create reviews
- Users without purchases cannot review
- Rating validation (1-5) works
- Review text length validation (≤1000) works
- Average rating calculation is correct
- Review count is accurate
- Users can edit their own reviews
- Users cannot edit others' reviews
- Review deletion recalculates average

### Integration Testing

**End-to-End Scenarios**:

1. **Product Discovery to Purchase Flow**:
   - Browse marketplace → view product detail
   - See related products → click related product
   - Add to cart → proceed to checkout
   - Verify product views are tracked

2. **Newsletter Subscription Flow**:
   - Visit creator storefront → see newsletter form
   - Enter email → submit subscription
   - Receive confirmation email → verify unsubscribe link
   - Click unsubscribe → verify removal

3. **Donation Flow**:
   - Visit creator storefront → click donate
   - Enter amount and details → submit
   - Redirect to Paystack → complete payment
   - Receive receipt email → verify details

4. **Category Navigation Flow**:
   - View homepage → see category navigation
   - Click category → see filtered products
   - Verify all products belong to category
   - Verify product count matches

5. **Wishlist Management Flow**:
   - Login → view product → add to wishlist
   - View wishlist → see saved product
   - Remove from wishlist → verify removal
   - Login on different device → see same wishlist

6. **Review Submission Flow**:
   - Purchase product → receive order confirmation
   - View product detail → see review form
   - Submit review → see review appear
   - Verify average rating updates
   - Edit review → see changes
   - Delete review → verify removal and rating update

### Performance Testing

**Metrics to Validate**:

- Product detail page load time < 2 seconds (3G connection)
- Related products query < 200ms
- Newsletter subscription < 500ms
- Donation initiation < 1 second
- Category product query < 300ms
- Wishlist operations < 200ms
- Review submission < 500ms
- Average rating calculation < 100ms

**Database Query Optimization**:

- Index on `product_views.product_id` and `product_views.created_at`
- Index on `newsletter_subscriptions.email` and `newsletter_subscriptions.organization_id`
- Index on `donations.organization_id` and `donations.created_at`
- Index on `product_category_assignments.product_id` and `product_category_assignments.category_id`
- Index on `wishlist_items.user_id` and `wishlist_items.product_id`
- Index on `product_reviews.product_id` and `product_reviews.rating`

**Caching Strategy**:

- Product details: 5 minute cache
- Related products: 10 minute cache
- Category lists: 15 minute cache
- Product ratings: 5 minute cache
- Newsletter subscriber counts: 1 hour cache

### Manual Testing Checklist

**Product Detail System**:

- [ ] Product page displays all information correctly
- [ ] Images load and gallery navigation works
- [ ] Related products section shows similar products
- [ ] Out of stock message appears when appropriate
- [ ] Add to Cart and Buy Now buttons work
- [ ] Anonymous users can access pages
- [ ] Product views are tracked

**Newsletter System**:

- [ ] Subscription form appears on storefronts
- [ ] Valid emails are accepted
- [ ] Invalid emails show error
- [ ] Duplicate subscriptions show appropriate message
- [ ] Confirmation emails are sent
- [ ] Unsubscribe links work
- [ ] Creator can view subscriber count

**Donation System**:

- [ ] Donate button appears on storefronts
- [ ] Donation form accepts valid amounts
- [ ] Invalid amounts show error
- [ ] Paystack payment flow works
- [ ] Successful donations show thank you message
- [ ] Receipt emails are sent
- [ ] Creator can view donation history

**Category System**:

- [ ] Admin can create categories
- [ ] Category slugs must be unique
- [ ] Products can be assigned to categories
- [ ] Category pages show correct products
- [ ] Product counts are accurate
- [ ] Category navigation appears on homepage
- [ ] Empty categories show appropriate message

**Wishlist System**:

- [ ] Authenticated users see wishlist button
- [ ] Anonymous users are redirected to login
- [ ] Products can be added to wishlist
- [ ] Wishlist button state updates correctly
- [ ] Wishlist page shows all saved products
- [ ] Products can be removed from wishlist
- [ ] Wishlist syncs across devices

**Review System**:

- [ ] Review form appears for verified purchases
- [ ] Non-purchasers see appropriate message
- [ ] Rating validation works (1-5)
- [ ] Review text length validation works
- [ ] Reviews appear after submission
- [ ] Average rating is calculated correctly
- [ ] Review count is accurate
- [ ] Users can edit their own reviews
- [ ] Users cannot edit others' reviews
- [ ] Review deletion works and updates average

**Mobile Responsiveness**:

- [ ] Product detail page works on mobile
- [ ] Newsletter forms work on mobile
- [ ] Donation forms work on mobile
- [ ] Category navigation works on mobile
- [ ] Wishlist interface works on mobile
- [ ] Review forms work on mobile

**Cross-Browser Testing**:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

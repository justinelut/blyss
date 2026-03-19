# Implementation Plan: Additional Marketplace Features

## Overview

This implementation plan covers six complementary marketplace feature systems that enhance the BLYSS platform. The features are designed to be implemented incrementally, with each system building upon the existing marketplace infrastructure. The implementation follows the established Polar modular architecture with FastAPI backend and Next.js frontend.

## CRITICAL IMPLEMENTATION GUIDELINES

**AVOID DUPLICATION - CHECK FIRST:**
- **Before implementing ANY task, thoroughly check what's already implemented in the codebase**
- **Search for existing similar functionality before creating new code**
- **Verify that the feature doesn't already exist in a different form**
- **Do not duplicate existing functionality - reuse and extend instead**
- Use grep/search tools to find existing implementations
- Check existing models, services, endpoints, and components
- If similar functionality exists, extend it rather than recreating it
- something like category i think its already implemented with polar by default or what kind of category were u adding? check if the can crush

## Tasks

- [x] 1. Set up database models and migrations
  - [x] 1.1 Create ProductView model for analytics tracking
    - Create `server/polar/models/product_view.py` with ProductView model
    - Add indexes for product_id and created_at
    - _Requirements: 15.1_

  - [x] 1.2 Create NewsletterSubscription model
    - Create `server/polar/models/newsletter_subscription.py` with NewsletterSubscription model
    - Add unique constraint on email + organization_id
    - Add indexes for organization_id and email
    - Generate unsubscribe_token on creation
    - _Requirements: 2.2, 2.5, 2.6_

  - [x] 1.3 Create Donation model
    - Create `server/polar/models/donation.py` with Donation model
    - Add indexes for organization_id, donor_email, and created_at
    - Include payment_reference and payment_status fields
    - _Requirements: 3.4, 3.7_

  - [x] 1.4 Create ProductCategory and ProductCategoryAssignment models
    - Create `server/polar/models/product_category.py` with both models
    - Add unique constraint on category slug
    - Add unique constraint on product_id + category_id for assignments
    - Add indexes for efficient querying
    - _Requirements: 4.1, 4.2, 4.6_

  - [x] 1.5 Create WishlistItem model
    - Create `server/polar/models/wishlist.py` with WishlistItem model
    - Add unique constraint on user_id + product_id
    - Add indexes for user_id and product_id
    - Configure CASCADE delete for product deletion
    - _Requirements: 5.2, 5.8_

  - [x] 1.6 Create ProductReview model
    - Create `server/polar/models/product_review.py` with ProductReview model
    - Add unique constraint on user_id + product_id
    - Add indexes for product_id, user_id, and rating
    - Include order_id foreign key for verified purchase validation
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 1.7 Generate and apply database migrations
    - Run `uv run alembic revision --autogenerate -m "Add marketplace feature models"`
    - Review generated migration for correctness
    - Apply migration with `uv run task db_migrate`
    - _Requirements: All model requirements_

- [-] 2. Implement Product Detail System backend
  - [x] 2.1 Create product detail schemas
    - Create `server/polar/product/schemas.py` additions for ProductDetailPublic
    - Include creator information, categories, and review summary
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Extend product repository with detail queries
    - Add `get_by_slug` method to product repository
    - Add `get_related_products` method using category and creator matching
    - Add `track_product_view` method for analytics
    - _Requirements: 1.1, 1.5, 15.1_

  - [x] 2.3 Extend product endpoints for detail page
    - Add GET `/{slug}` endpoint for product detail by slug
    - Add GET `/{id}/related` endpoint for related products
    - Track product views in detail endpoint
    - Support anonymous and authenticated users
    - _Requirements: 1.1, 1.2, 1.5, 1.8_

  - [x] 2.4 Write unit tests for product detail endpoints
    - Test product detail retrieval by slug
    - Test related products query with various scenarios
    - Test product view tracking
    - Test anonymous user access
    - _Requirements: 1.1, 1.5, 1.8_

- [x] 3. Implement Newsletter System backend
  - [x] 3.1 Create newsletter repository
    - Create `server/polar/newsletter/repository.py` with NewsletterRepository
    - Implement CRUD operations for subscriptions
    - Add `get_by_email_and_org` method for duplicate checking
    - Add `get_active_subscribers` method for newsletter sending
    - _Requirements: 2.2, 2.6_

  - [x] 3.2 Create newsletter service
    - Create `server/polar/newsletter/service.py` with NewsletterService
    - Implement `subscribe` method with email validation
    - Implement `unsubscribe` method using token
    - Implement `send_newsletter` method for bulk sending
    - Generate unique unsubscribe tokens
    - _Requirements: 2.2, 2.5, 2.7, 2.8_

  - [x] 3.3 Create newsletter schemas
    - Create `server/polar/newsletter/schemas.py`
    - Define NewsletterSubscriptionCreate, NewsletterSubscriptionPublic
    - Add email validation in schemas
    - _Requirements: 2.7_

  - [x] 3.4 Create newsletter endpoints
    - Create `server/polar/newsletter/endpoints.py`
    - Add POST `/subscribe` endpoint (no auth required)
    - Add POST `/unsubscribe/{token}` endpoint
    - Add GET `/creator/{organization_id}/subscribers` endpoint (auth required)
    - _Requirements: 2.2, 2.5, 2.8_

  - [x] 3.5 Create newsletter email tasks
    - Create `server/polar/newsletter/tasks.py` with Dramatiq actors
    - Implement `send_subscription_confirmation` task
    - Implement `send_newsletter_to_subscribers` task
    - Include unsubscribe link in all emails
    - _Requirements: 2.3, 2.4_

  - [x] 3.6 Write unit tests for newsletter system
    - Test subscription creation and duplicate prevention
    - Test email validation
    - Test unsubscribe functionality
    - Test newsletter sending to multiple subscribers
    - _Requirements: 2.2, 2.6, 2.7, 2.5_

- [-] 4. Implement Donation System backend
  - [x] 4.1 Create donation repository
    - Create `server/polar/donation/repository.py` with DonationRepository
    - Implement CRUD operations for donations
    - Add `get_by_payment_reference` method
    - Add `get_creator_donations` method with pagination
    - _Requirements: 3.7, 3.8_

  - [x] 4.2 Create donation service
    - Create `server/polar/donation/service.py` with DonationService
    - Implement `initiate_donation` method with Paystack integration
    - Implement `confirm_donation` method for webhook handling
    - Implement `get_creator_donations` method
    - Validate donation amounts (100-1000000)
    - _Requirements: 3.3, 3.4, 3.7_

  - [x] 4.3 Create donation schemas
    - Create `server/polar/donation/schemas.py`
    - Define DonationCreate, DonationPublic, DonationInitiateResponse
    - Add amount validation in schemas
    - _Requirements: 3.3_

  - [x] 4.4 Create donation endpoints
    - Create `server/polar/donation/endpoints.py`
    - Add POST `/initiate` endpoint (no auth required)
    - Add POST `/webhook/paystack` endpoint for payment confirmation
    - Add GET `/creator/{organization_id}` endpoint (auth required)
    - Verify Paystack webhook signatures
    - _Requirements: 3.4, 3.8_

  - [x] 4.5 Create donation email tasks
    - Create `server/polar/donation/tasks.py` with Dramatiq actors
    - Implement `send_donation_confirmation` task
    - Implement `send_donation_receipt` task
    - Include transaction details in receipt
    - _Requirements: 3.6, 9.1, 9.2, 9.3_

  - [x] 4.6 Write unit tests for donation system
    - Test donation initiation and Paystack integration
    - Test amount validation
    - Test webhook signature verification
    - Test donation confirmation flow
    - Test receipt generation
    - _Requirements: 3.3, 3.4, 9.1, 9.2_

- [x] 5. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Category System backend
  - [x] 6.1 Create category repository
    - Create `server/polar/category/repository.py` with CategoryRepository
    - Implement CRUD operations for categories
    - Add `get_by_slug` method
    - Add `get_products_by_category` method with pagination
    - Add `get_product_count` method for each category
    - _Requirements: 4.1, 4.3, 4.7_

  - [x] 6.2 Create category service
    - Create `server/polar/category/service.py` with CategoryService
    - Implement `create_category` method with slug validation
    - Implement `assign_product_to_category` method
    - Implement `unassign_product_from_category` method
    - Implement `get_products_by_category` method
    - Support multiple categories per product
    - _Requirements: 4.2, 4.3, 4.6_

  - [x] 6.3 Create category schemas
    - Create `server/polar/category/schemas.py`
    - Define CategoryCreate, CategoryUpdate, CategoryPublic
    - Include product_count in CategoryPublic
    - _Requirements: 4.7_

  - [x] 6.4 Create category endpoints
    - Create `server/polar/category/endpoints.py`
    - Add POST `/` endpoint for creating categories (admin only)
    - Add GET `/{slug}` endpoint for category details
    - Add GET `/{slug}/products` endpoint for products in category
    - Add PUT `/{id}` endpoint for updating categories (admin only)
    - Add DELETE `/{id}` endpoint for deleting categories (admin only)
    - _Requirements: 4.1, 4.3, 10.1, 10.2, 10.3_

  - [x] 6.5 Write unit tests for category system
    - Test category creation and slug uniqueness
    - Test product assignment to multiple categories
    - Test category deletion and cascade behavior
    - Test product count calculation
    - Test display order enforcement
    - _Requirements: 4.1, 4.6, 4.7, 10.4, 10.5, 10.6_

- [-] 7. Implement Wishlist System backend
  - [x] 7.1 Create wishlist repository
    - Create `server/polar/wishlist/repository.py` with WishlistRepository
    - Implement `add_to_wishlist` method
    - Implement `remove_from_wishlist` method
    - Implement `get_user_wishlist` method
    - Implement `is_in_wishlist` method
    - _Requirements: 5.2, 5.4, 5.5_

  - [x] 7.2 Create wishlist service
    - Create `server/polar/wishlist/service.py` with WishlistService
    - Implement `add_to_wishlist` with duplicate prevention
    - Implement `remove_from_wishlist` method
    - Implement `get_user_wishlist` method with product details
    - Validate product exists and is not archived
    - _Requirements: 5.2, 5.5, 5.4_

  - [x] 7.3 Create wishlist schemas
    - Create `server/polar/wishlist/schemas.py`
    - Define WishlistItemPublic with embedded product details
    - _Requirements: 5.4_

  - [x] 7.4 Create wishlist endpoints
    - Create `server/polar/wishlist/endpoints.py`
    - Add POST `/` endpoint for adding to wishlist (auth required)
    - Add DELETE `/{product_id}` endpoint for removing from wishlist (auth required)
    - Add GET `/` endpoint for getting user wishlist (auth required)
    - Add GET `/check/{product_id}` endpoint for checking if in wishlist (auth required)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.7_

  - [x] 7.5 Write unit tests for wishlist system
    - Test adding products to wishlist
    - Test removing products from wishlist
    - Test wishlist retrieval
    - Test duplicate prevention
    - Test cascade delete when product is deleted
    - Test authentication requirement
    - _Requirements: 5.2, 5.5, 5.7, 5.8_

- [-] 8. Implement Review System backend
  - [x] 8.1 Create review repository
    - Create `server/polar/review/repository.py` with ReviewRepository
    - Implement CRUD operations for reviews
    - Add `get_product_reviews` method with pagination
    - Add `get_product_rating_summary` method
    - Add `calculate_average_rating` method
    - _Requirements: 6.5, 6.6, 6.7_

  - [x] 8.2 Create review service
    - Create `server/polar/review/service.py` with ReviewService
    - Implement `create_review` with verified purchase validation
    - Implement `update_review` with authorization check
    - Implement `delete_review` with authorization check
    - Implement `has_purchased_product` method
    - Validate rating (1-5) and review text length (max 1000)
    - _Requirements: 6.2, 6.3, 6.4, 6.9, 6.10_

  - [x] 8.3 Create review schemas
    - Create `server/polar/review/schemas.py`
    - Define ReviewCreate, ReviewUpdate, ReviewPublic
    - Define ProductRatingSummary with rating distribution
    - Add validation for rating and text length
    - _Requirements: 6.3, 6.4, 6.6, 6.7_

  - [x] 8.4 Create review endpoints
    - Create `server/polar/review/endpoints.py`
    - Add POST `/` endpoint for creating reviews (auth required, verified purchase)
    - Add PUT `/{id}` endpoint for updating reviews (auth required, owner only)
    - Add DELETE `/{id}` endpoint for deleting reviews (auth required, owner only)
    - Add GET `/product/{product_id}` endpoint for product reviews
    - Add GET `/product/{product_id}/summary` endpoint for rating summary
    - _Requirements: 6.2, 6.5, 6.6, 6.7, 6.9, 6.10_

  - [x] 8.5 Write unit tests for review system
    - Test review creation with verified purchase validation
    - Test rating and text validation
    - Test review update authorization
    - Test review delete authorization
    - Test average rating calculation
    - Test rating distribution calculation
    - Test recalculation after review deletion
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.7, 6.9, 6.10, 12.4_

- [x] 9. Checkpoint - Ensure all backend systems are complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Product Detail System frontend
  - [x] 10.1 Create product detail page
    - Create `clients/apps/web/src/app/(main)/product/[slug]/page.tsx`
    - Implement server-side data fetching for SEO
    - Fetch product details, related products, and reviews
    - _Requirements: 1.1, 1.8_

  - [x] 10.2 Create ProductDetailView component
    - Create `clients/apps/web/src/components/Product/ProductDetailView.tsx`
    - Display product name, price, description, images
    - Display creator information with storefront link
    - Show "Add to Cart" and "Buy Now" buttons when available
    - Show "Out of Stock" message when unavailable
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [x] 10.3 Create ProductImageGallery component
    - Create `clients/apps/web/src/components/Product/ProductImageGallery.tsx`
    - Display product images with navigation controls
    - Implement lazy loading for images below the fold
    - _Requirements: 1.6, 7.2_

  - [x] 10.4 Create RelatedProducts component
    - Create `clients/apps/web/src/components/Product/RelatedProducts.tsx`
    - Display at least 4 related products
    - Prefetch related products data
    - _Requirements: 1.5, 7.3_

  - [x] 10.5 Create TanStack Query hooks for product details
    - Add hooks to `clients/apps/web/src/hooks/queries/products.ts`
    - Create `useProductBySlug` hook
    - Create `useRelatedProducts` hook
    - Implement 5-minute caching
    - _Requirements: 1.1, 1.5, 7.4_

- [x] 11. Implement Newsletter System frontend
  - [x] 11.1 Create NewsletterSubscriptionForm component
    - Create `clients/apps/web/src/components/Newsletter/NewsletterSubscriptionForm.tsx`
    - Display email input and subscribe button
    - Show validation errors for invalid emails
    - Show success message after subscription
    - Show message for existing subscriptions
    - _Requirements: 2.1, 2.2, 2.6, 2.7_

  - [x] 11.2 Add newsletter form to storefront pages
    - Integrate NewsletterSubscriptionForm into organization storefront
    - Position form prominently on storefront
    - _Requirements: 2.1_

  - [x] 11.3 Create TanStack Query hooks for newsletter
    - Add hooks to `clients/apps/web/src/hooks/queries/newsletter.ts`
    - Create `useSubscribeToNewsletter` mutation hook
    - Handle success and error states
    - _Requirements: 2.2_

- [x] 12. Implement Donation System frontend
  - [x] 12.1 Create DonationButton component
    - Create `clients/apps/web/src/components/Donation/DonationButton.tsx`
    - Display "Donate" button on creator storefronts
    - Open donation modal on click
    - _Requirements: 3.1_

  - [x] 12.2 Create DonationModal component
    - Create `clients/apps/web/src/components/Donation/DonationModal.tsx`
    - Display custom amount input form
    - Validate amount (100-1000000)
    - Show donor name and email inputs
    - Show optional message textarea
    - Redirect to Paystack payment URL on submit
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 12.3 Create donation success page
    - Create `clients/apps/web/src/app/(main)/donation/success/page.tsx`
    - Display thank you message
    - Show donation details
    - _Requirements: 3.5_

  - [x] 12.4 Create TanStack Query hooks for donations
    - Add hooks to `clients/apps/web/src/hooks/queries/donations.ts`
    - Create `useInitiateDonation` mutation hook
    - Create `useCreatorDonations` query hook for creators
    - _Requirements: 3.4, 3.8_

- [x] 13. Checkpoint - Ensure frontend integrations work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement Category System frontend
  - [x] 14.1 Create category page
    - Create `clients/apps/web/src/app/(main)/category/[slug]/page.tsx`
    - Display category name and description
    - Display products in category with pagination
    - Show empty state when no products
    - _Requirements: 4.3, 4.8_

  - [x] 14.2 Create CategoryNavigation component
    - Create `clients/apps/web/src/components/Category/CategoryNavigation.tsx`
    - Display list of categories with product counts
    - Show categories in display order
    - Add to homepage and product pages
    - _Requirements: 4.4, 4.5, 4.7_

  - [x] 14.3 Create TanStack Query hooks for categories
    - Add hooks to `clients/apps/web/src/hooks/queries/categories.ts`
    - Create `useCategories` query hook
    - Create `useCategoryProducts` query hook
    - _Requirements: 4.3, 4.4_

- [x] 15. Implement Wishlist System frontend
  - [x] 15.1 Create WishlistButton component
    - Create `clients/apps/web/src/components/Wishlist/WishlistButton.tsx`
    - Display "Save to Wishlist" or "Remove from Wishlist" based on state
    - Handle authentication requirement (redirect to login if not authenticated)
    - Toggle wishlist state on click
    - _Requirements: 5.1, 5.2, 5.3, 5.7_

  - [x] 15.2 Add wishlist button to product pages
    - Integrate WishlistButton into ProductDetailView
    - Show button for authenticated users
    - _Requirements: 5.1_

  - [x] 15.3 Create wishlist page
    - Create `clients/apps/web/src/app/(main)/wishlist/page.tsx`
    - Display all saved products
    - Allow removing products from wishlist
    - Show empty state when no items
    - _Requirements: 5.4, 5.5_

  - [x] 15.4 Add wishlist link to user menu
    - Add wishlist navigation item to user menu
    - Show wishlist item count badge
    - _Requirements: 5.6_

  - [x] 15.5 Create TanStack Query hooks for wishlist
    - Add hooks to `clients/apps/web/src/hooks/queries/wishlist.ts`
    - Create `useWishlist` query hook
    - Create `useAddToWishlist` mutation hook
    - Create `useRemoveFromWishlist` mutation hook
    - Create `useIsInWishlist` query hook
    - Implement optimistic updates for instant UI feedback
    - _Requirements: 5.2, 5.5, 11.3_

- [x] 16. Implement Review System frontend
  - [x] 16.1 Create ReviewForm component
    - Create `clients/apps/web/src/components/Review/ReviewForm.tsx`
    - Display star rating selector (1-5)
    - Display review text textarea (max 1000 chars)
    - Show character count
    - Validate verified purchase before showing form
    - Show message if user hasn't purchased product
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.8_

  - [x] 16.2 Create ReviewList component
    - Create `clients/apps/web/src/components/Review/ReviewList.tsx`
    - Display product reviews with pagination
    - Show reviewer name, avatar, rating, text, and date
    - Show "Verified Purchase" badge
    - Show edit/delete buttons for user's own reviews
    - _Requirements: 6.5, 6.9, 6.10_

  - [x] 16.3 Create ProductRatingSummary component
    - Create `clients/apps/web/src/components/Review/ProductRatingSummary.tsx`
    - Display average rating and total review count
    - Display rating distribution (1-5 stars)
    - _Requirements: 6.6, 6.7_

  - [x] 16.4 Add review components to product detail page
    - Integrate ProductRatingSummary into ProductDetailView
    - Integrate ReviewForm into ProductDetailView
    - Integrate ReviewList into ProductDetailView
    - _Requirements: 6.1, 6.5_

  - [x] 16.5 Create TanStack Query hooks for reviews
    - Add hooks to `clients/apps/web/src/hooks/queries/reviews.ts`
    - Create `useProductReviews` query hook
    - Create `useProductRatingSummary` query hook
    - Create `useCreateReview` mutation hook
    - Create `useUpdateReview` mutation hook
    - Create `useDeleteReview` mutation hook
    - _Requirements: 6.5, 6.6, 6.9, 6.10_

- [x] 17. Implement mobile responsiveness
  - [x] 17.1 Make product detail page mobile responsive
    - Ensure ProductDetailView works on 320px+ screens
    - Stack image gallery and product info vertically on mobile
    - Optimize image gallery for touch navigation
    - _Requirements: 13.1_

  - [x] 17.2 Make newsletter form mobile responsive
    - Ensure NewsletterSubscriptionForm works on mobile devices
    - Optimize input sizes for mobile
    - _Requirements: 13.2_

  - [x] 17.3 Make donation form mobile responsive
    - Ensure DonationModal works on mobile devices
    - Optimize form layout for small screens
    - _Requirements: 13.3_

  - [x] 17.4 Make category navigation mobile responsive
    - Ensure CategoryNavigation works on mobile devices
    - Use horizontal scroll or dropdown on mobile
    - _Requirements: 13.4_

  - [x] 17.5 Make wishlist page mobile responsive
    - Ensure wishlist page works on mobile devices
    - Optimize product grid for mobile
    - _Requirements: 13.5_

  - [x] 17.6 Make review components mobile responsive
    - Ensure ReviewForm and ReviewList work on mobile devices
    - Optimize star rating selector for touch
    - _Requirements: 13.6_

- [x] 18. Implement analytics tracking
  - [x] 18.1 Add product view tracking
    - Track product page views in product detail endpoint
    - Store session_id and user_id if available
    - _Requirements: 15.1_

  - [x] 18.2 Add "Add to Cart" click tracking
    - Track "Add to Cart" button clicks
    - Send analytics event to backend
    - _Requirements: 15.2_

  - [x] 18.3 Create analytics dashboard for creators
    - Create `clients/apps/web/src/app/(main)/dashboard/analytics/page.tsx`
    - Display product view counts
    - Display "Add to Cart" click counts
    - Display total donations received
    - Display newsletter subscriber growth
    - Display average rating trends
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 19. Final integration and testing
  - [ ] 19.1 Test complete product detail flow
    - Test product detail page rendering
    - Test related products display
    - Test image gallery navigation
    - Test "Add to Cart" and "Buy Now" buttons
    - Test out of stock display
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 19.2 Test complete newsletter flow
    - Test newsletter subscription
    - Test duplicate subscription handling
    - Test confirmation email sending
    - Test unsubscribe link functionality
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 19.3 Test complete donation flow
    - Test donation initiation
    - Test Paystack payment redirect
    - Test donation confirmation via webhook
    - Test receipt generation and email
    - _Requirements: 3.4, 3.5, 3.6, 9.1, 9.2, 9.3_

  - [ ] 19.4 Test complete category flow
    - Test category creation (admin)
    - Test product assignment to categories
    - Test category page display
    - Test category navigation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 19.5 Test complete wishlist flow
    - Test adding products to wishlist
    - Test removing products from wishlist
    - Test wishlist page display
    - Test cross-device synchronization
    - Test authentication requirement
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 11.1, 11.2_

  - [ ] 19.6 Test complete review flow
    - Test review creation with verified purchase
    - Test review update and delete
    - Test average rating calculation
    - Test rating distribution display
    - Test review moderation (admin)
    - _Requirements: 6.2, 6.5, 6.6, 6.7, 6.9, 6.10, 12.1, 12.2, 12.3, 12.4_

- [ ] 20. Final checkpoint - Ensure all features are complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation follows the established Polar modular architecture
- Backend uses Python with FastAPI, SQLAlchemy, and PostgreSQL
- Frontend uses Next.js 14 with App Router, TanStack Query, and Tailwind CSS
- All features support mobile devices (320px+ screens)
- Authentication is handled via the existing Polar auth system
- Payment processing uses the existing Paystack integration
- Email sending uses the existing Dramatiq background job system
- Database migrations are managed via Alembic

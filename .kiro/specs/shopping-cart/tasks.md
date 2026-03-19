# Implementation Plan: Shopping Cart

## Overview

This implementation plan breaks down the shopping cart feature into discrete coding tasks. The cart allows customers to add multiple one-time digital products and purchase them together in a single checkout session. The implementation follows Polar's modular architecture with backend services in Python/FastAPI and frontend components in TypeScript/Next.js.

## Tasks

- [x] 1. Set up database schema and models
  - Create Alembic migration for cart_items table with all constraints and indexes
  - Create CartItem SQLAlchemy model in server/polar/models/cart_item.py
  - Add relationship to Product model
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Implement cart repository layer
  - [x] 2.1 Create CartRepository class inheriting from RepositoryBase
    - Implement get_by_user method to retrieve non-expired cart items for authenticated users
    - Implement get_by_session method to retrieve non-expired cart items for guest sessions
    - Implement get_by_id_and_owner method with ownership verification
    - Implement upsert_item method with quantity increment logic for duplicates
    - Implement delete_expired method for cleanup operations
    - Implement migrate_session_to_user method with quantity merging for duplicate products
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 4.1, 4.3, 7.1, 7.2, 7.3_

  - [x] 2.2 Write property test for cart persistence round trip
    - **Property 2: Cart Persistence Round Trip**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 2.3 Write property test for quantity increment on duplicate addition
    - **Property 5: Quantity Increment on Duplicate Addition**
    - **Validates: Requirements 2.2**

  - [x] 2.4 Write property test for guest cart migration with quantity merging
    - **Property 21: Guest Cart Migration with Quantity Merging**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 3. Implement cart service layer
  - [x] 3.1 Create CartService class with business logic
    - Implement add_item method with product type validation and quantity handling
    - Implement remove_item method with ownership verification
    - Implement get_cart method with total calculations (subtotal, tax, total)
    - Implement clear_cart method to delete all items for a customer
    - Implement migrate_guest_cart method for login migration
    - Add validation for one-time products only (reject recurring products)
    - Add validation for quantity range [1, 100]
    - Add validation for product existence and stock status
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 7.1, 7.4, 10.1, 10.2, 10.3_

  - [x] 3.2 Write property test for recurring product rejection
    - **Property 10: Recurring Product Rejection**
    - **Validates: Requirements 3.1**

  - [x] 3.3 Write property test for quantity validation
    - **Property 9: Quantity Validation**
    - **Validates: Requirements 2.6, 10.3**

  - [x] 3.4 Write property test for subtotal calculation
    - **Property 17: Subtotal Calculation**
    - **Validates: Requirements 6.2**

  - [x] 3.5 Write unit tests for cart service
    - Test add_item creates new cart item with quantity 1
    - Test add_item increments existing quantity
    - Test remove_item deletes cart item
    - Test clear_cart removes all items
    - Test product out of stock error
    - Test non-existent product error
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 10.1, 10.2_

- [x] 4. Create custom exceptions
  - Define CartError base class inheriting from PolarError
  - Define RecurringProductNotAllowed exception with 422 status
  - Define ProductNotFound exception with 404 status
  - Define CartItemNotFound exception with 404 status
  - Define InvalidQuantity exception with 422 status
  - Define ProductOutOfStock exception with 422 status
  - _Requirements: 3.4, 10.2, 10.4, 10.5_

- [x] 5. Implement authentication configuration
  - Create server/polar/cart/auth.py with CartRead and CartWrite authenticators
  - Configure allowed_subjects to include User and Anonymous
  - Configure required_scopes for cart_read and cart_write
  - _Requirements: 5.5, 5.6_

- [x] 6. Implement cart API endpoints
  - [x] 6.1 Create cart endpoints module
    - Implement POST /v1/cart/items endpoint to add items
    - Implement DELETE /v1/cart/items/{item_id} endpoint to remove items
    - Implement GET /v1/cart endpoint to retrieve cart with totals
    - Implement DELETE /v1/cart endpoint to clear cart
    - Add session token extraction from cookies/headers for anonymous users
    - Return appropriate HTTP status codes (200, 201, 204, 404, 422)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 6.2 Write E2E tests for cart endpoints
    - Test POST /v1/cart/items creates cart item
    - Test POST /v1/cart/items increments quantity for duplicate
    - Test DELETE /v1/cart/items/{item_id} removes item
    - Test GET /v1/cart returns all items with totals
    - Test DELETE /v1/cart clears all items
    - Test guest session token handling
    - Test authenticated user handling
    - Test error responses (404, 422)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 7. Create Pydantic schemas
  - Define CartItemCreate schema with product_id and quantity validation
  - Define CartItemResponse schema with all cart item fields
  - Define CartResponse schema with items array and calculated totals
  - _Requirements: 2.4, 5.1, 5.3_

- [ ] 8. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement background cleanup task
  - [x] 9.1 Create Dramatiq task for cart cleanup
    - Implement periodic task to delete cart items older than 7 days
    - Schedule task to run daily
    - Log cleanup statistics (number of items deleted)
    - _Requirements: 4.2, 4.3_

  - [x] 9.2 Write unit test for cleanup task
    - Test that items older than 7 days are deleted
    - Test that items newer than 7 days are preserved
    - _Requirements: 4.3_

- [x] 10. Integrate cart with checkout service
  - [x] 10.1 Modify checkout service to accept cart items
    - Update create_checkout method to handle multiple cart items
    - Calculate combined subtotal for all cart items
    - Calculate tax based on combined subtotal and customer location
    - Calculate platform fees based on combined total
    - Create order items for each cart item on successful checkout
    - Clear cart items after successful checkout completion
    - Ensure existing single-product checkout continues to work
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 10.2 Write property test for checkout completion effects
    - **Property 20: Checkout Completion Effects**
    - **Validates: Requirements 6.5, 6.6**

  - [x] 10.3 Write unit tests for checkout integration
    - Test checkout session creation with multiple cart items
    - Test order items creation for each cart item
    - Test cart clearing after successful checkout
    - Test single-product checkout still works
    - _Requirements: 6.1, 6.5, 6.6, 6.7_

- [x] 11. Implement guest cart migration on login
  - [x] 11.1 Add migration hook to authentication flow
    - Detect guest session token during login
    - Call cart service migrate_guest_cart method
    - Handle duplicate products by summing quantities
    - Delete guest cart items after migration
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 11.2 Write unit test for migration on login
    - Test guest cart items are migrated to user account
    - Test duplicate products have quantities summed
    - Test guest cart is deleted after migration
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 12. Generate TypeScript API client
  - Run pnpm run generate in clients/packages/client to update API client with cart endpoints
  - Verify generated types match backend schemas
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 13. Checkpoint - Ensure backend integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 14. Implement cart state management
  - [x] 14.1 Create Zustand cart store
    - Define CartStore interface with items, itemCount, subtotal, tax, total
    - Implement addItem method that calls API and updates local state
    - Implement removeItem method that calls API and updates local state
    - Implement clearCart method that calls API and updates local state
    - Implement refreshCart method that fetches current cart from API
    - Expose itemCount for navigation header display
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 14.2 Write property test for cart state synchronization
    - **Property 26: Cart State Synchronization**
    - **Validates: Requirements 9.2**

  - [x] 14.3 Write unit tests for cart store
    - Test addItem updates local state
    - Test removeItem updates local state
    - Test clearCart updates local state
    - Test refreshCart fetches from API
    - Test itemCount calculation
    - _Requirements: 9.2, 9.5_

- [x] 15. Implement TanStack Query hooks
  - Create useCart hook for fetching cart data
  - Create useAddToCart mutation hook with optimistic updates
  - Create useRemoveFromCart mutation hook with optimistic updates
  - Create useClearCart mutation hook
  - Configure query invalidation on mutations
  - Add error handling with toast notifications
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.6_

- [x] 16. Implement cart UI components
  - [x] 16.1 Create CartIcon component for navigation header
    - Display cart icon with item count badge
    - Navigate to cart page on click
    - Update count reactively from cart store
    - _Requirements: 8.3, 8.4_

  - [x] 16.2 Create CartItem component
    - Display product name, price, quantity, and subtotal
    - Display remove button for each item
    - Handle remove action with confirmation
    - _Requirements: 8.5, 8.6_

  - [x] 16.3 Create EmptyCart component
    - Display message indicating cart is empty
    - Display link to browse products
    - _Requirements: 8.9_

  - [x] 16.4 Create CartPage component
    - Display all cart items using CartItem component
    - Display combined subtotal, estimated tax, and total
    - Display "Proceed to Checkout" button
    - Handle empty cart state with EmptyCart component
    - Handle loading state with spinner
    - Handle errors with error messages
    - _Requirements: 8.5, 8.6, 8.7, 8.8, 8.9, 10.6_

  - [x] 16.5 Write unit tests for cart UI components
    - Test CartIcon displays correct count
    - Test CartItem renders product details
    - Test CartItem remove button works
    - Test EmptyCart displays message and link
    - Test CartPage displays all items
    - Test CartPage displays totals
    - Test CartPage handles empty state
    - _Requirements: 8.3, 8.5, 8.6, 8.7, 8.9_

- [x] 17. Modify ProductCard component
  - [x] 17.1 Update ProductCard to show appropriate button
    - Display "Add to Cart" button for one-time products
    - Display "Buy Now" button for recurring products (bypass cart)
    - Handle add to cart action with loading state
    - Display success/error toast notifications
    - _Requirements: 8.1, 8.2_

  - [x] 17.2 Write unit test for ProductCard button logic
    - Test one-time product shows "Add to Cart" button
    - Test recurring product shows "Buy Now" button
    - Test add to cart action calls correct API
    - _Requirements: 8.1, 8.2_

- [x] 18. Add cart route to Next.js app
  - Create app/(main)/cart/page.tsx with CartPage component
  - Configure route metadata (title, description)
  - Add cart link to navigation menu
  - _Requirements: 8.4_

- [x] 19. Implement session token management
  - Create utility to generate session tokens for guest users
  - Store session token in HTTP-only cookie
  - Send session token with all cart API requests
  - Clear session token after migration to user account
  - _Requirements: 1.2, 1.4, 5.5_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at reasonable breaks
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Backend uses Python with FastAPI, SQLAlchemy, and Hypothesis for property tests
- Frontend uses TypeScript with Next.js, React, Zustand, and fast-check for property tests

# Requirements Document

## Introduction

This document defines the requirements for adding multi-product shopping cart functionality to Polar. The shopping cart will allow customers to add multiple one-time digital products to a cart and purchase them together in a single checkout session. Subscriptions will continue to bypass the cart and proceed directly to checkout.

## Glossary

- **Cart**: A temporary collection of products that a customer intends to purchase
- **Cart_Item**: A single product entry in a cart, including quantity and metadata
- **Cart_Service**: The backend service responsible for cart business logic
- **Cart_Repository**: The data access layer for cart operations
- **Checkout_Service**: The service that processes cart contents into orders
- **Customer**: A user or guest who can add products to a cart
- **Guest_Cart**: A cart associated with a session token rather than a user account
- **One_Time_Product**: A digital product purchased once without recurring billing
- **Recurring_Product**: A subscription product with recurring billing (bypasses cart)
- **Session_Token**: A unique identifier for guest cart sessions
- **User_Cart**: A cart associated with an authenticated user account

## Requirements

### Requirement 1: Cart Data Persistence

**User Story:** As a customer, I want my cart to persist across sessions, so that I don't lose my selected products when I close my browser.

#### Acceptance Criteria

1. WHEN an authenticated user adds a product to their cart, THE Cart_Service SHALL store the cart item with the user_id
2. WHEN a guest adds a product to their cart, THE Cart_Service SHALL store the cart item with a session_token
3. WHEN an authenticated user returns to the site, THE Cart_Service SHALL retrieve their existing cart items
4. WHEN a guest returns with the same session, THE Cart_Service SHALL retrieve their cart items using the session_token
5. THE Cart_Repository SHALL store cart items with product_id, quantity, created_at, and updated_at timestamps

### Requirement 2: Cart Item Management

**User Story:** As a customer, I want to add, remove, and view products in my cart, so that I can manage my purchase before checkout.

#### Acceptance Criteria

1. WHEN a customer adds a one-time product to their cart, THE Cart_Service SHALL create a new cart item with quantity 1
2. WHEN a customer adds a product already in their cart, THE Cart_Service SHALL increment the quantity of the existing cart item
3. WHEN a customer removes a cart item, THE Cart_Service SHALL delete the cart item from the database
4. WHEN a customer requests their cart, THE Cart_Service SHALL return all cart items with product details and calculated totals
5. WHEN a customer clears their cart, THE Cart_Service SHALL delete all cart items for that customer
6. THE Cart_Service SHALL support quantity values between 1 and 100 for each cart item

### Requirement 3: Product Type Validation

**User Story:** As a platform administrator, I want to prevent mixing one-time and recurring products in the cart, so that checkout logic remains simple and predictable.

#### Acceptance Criteria

1. WHEN a customer attempts to add a recurring product to their cart, THE Cart_Service SHALL return an error indicating subscriptions cannot be added to cart
2. WHEN a customer has one-time products in their cart, THE Cart_Service SHALL allow adding additional one-time products
3. THE Cart_Service SHALL validate product type before adding items to the cart
4. WHEN a product type validation fails, THE Cart_Service SHALL return a 422 status code with a descriptive error message

### Requirement 4: Cart Expiration

**User Story:** As a platform administrator, I want abandoned carts to expire after 7 days, so that we don't accumulate stale data in the database.

#### Acceptance Criteria

1. WHEN a cart item has not been updated for 7 days, THE Cart_Service SHALL exclude it from cart retrieval operations
2. THE Cart_Repository SHALL provide a method to delete cart items older than 7 days
3. WHEN the cart cleanup process runs, THE Cart_Service SHALL delete all cart items with updated_at timestamps older than 7 days
4. THE Cart_Service SHALL update the updated_at timestamp whenever a cart item is modified

### Requirement 5: Cart API Endpoints

**User Story:** As a frontend developer, I want RESTful API endpoints for cart operations, so that I can build the cart user interface.

#### Acceptance Criteria

1. THE Cart_API SHALL provide a POST /v1/cart/items endpoint that accepts product_id and optional quantity
2. THE Cart_API SHALL provide a DELETE /v1/cart/items/{item_id} endpoint to remove specific cart items
3. THE Cart_API SHALL provide a GET /v1/cart endpoint that returns all cart items with totals
4. THE Cart_API SHALL provide a DELETE /v1/cart endpoint to clear the entire cart
5. WHEN an API request is made without authentication, THE Cart_API SHALL use the session_token from cookies or headers
6. WHEN an API request is made with authentication, THE Cart_API SHALL associate cart operations with the user_id
7. THE Cart_API SHALL return appropriate HTTP status codes (200, 201, 404, 422) for each operation

### Requirement 6: Multi-Product Checkout Integration

**User Story:** As a customer, I want to purchase all items in my cart together, so that I can complete my purchase in a single transaction.

#### Acceptance Criteria

1. WHEN a customer initiates checkout from their cart, THE Checkout_Service SHALL create a checkout session with all cart items
2. THE Checkout_Service SHALL calculate the combined subtotal for all cart items
3. THE Checkout_Service SHALL calculate tax based on the combined subtotal and customer location
4. THE Checkout_Service SHALL calculate platform fees based on the combined total
5. WHEN checkout is successfully completed, THE Checkout_Service SHALL create order items for each cart item
6. WHEN checkout is successfully completed, THE Cart_Service SHALL clear all items from the customer's cart
7. THE Checkout_Service SHALL support existing single-product checkout without modification

### Requirement 7: Guest Cart Migration

**User Story:** As a guest customer who logs in, I want my cart items to be preserved, so that I don't have to re-add products after authentication.

#### Acceptance Criteria

1. WHEN a guest with cart items logs in, THE Cart_Service SHALL migrate all guest cart items to the user's account
2. WHEN migrating cart items, THE Cart_Service SHALL merge duplicate products by summing quantities
3. WHEN migration is complete, THE Cart_Service SHALL delete the guest cart items
4. THE Cart_Service SHALL update the user_id and clear the session_token for migrated items

### Requirement 8: Cart UI Components

**User Story:** As a customer, I want intuitive UI components for cart interactions, so that I can easily manage my shopping experience.

#### Acceptance Criteria

1. WHEN viewing a one-time product, THE Product_Card SHALL display an "Add to Cart" button
2. WHEN viewing a recurring product, THE Product_Card SHALL display a "Buy Now" button that bypasses the cart
3. THE Navigation_Header SHALL display a cart icon with the current item count
4. WHEN the cart icon is clicked, THE Navigation_Header SHALL navigate to the cart page
5. THE Cart_Page SHALL display all cart items with product name, price, quantity, and subtotal
6. THE Cart_Page SHALL display a "Remove" button for each cart item
7. THE Cart_Page SHALL display the combined subtotal, estimated tax, and total
8. THE Cart_Page SHALL display a "Proceed to Checkout" button
9. WHEN the cart is empty, THE Cart_Page SHALL display a message indicating the cart is empty with a link to browse products

### Requirement 9: Cart State Management

**User Story:** As a frontend developer, I want centralized cart state management, so that the cart UI stays synchronized across components.

#### Acceptance Criteria

1. THE Cart_Store SHALL maintain the current cart state including items and totals
2. WHEN a cart operation succeeds, THE Cart_Store SHALL update the local state
3. WHEN the application loads, THE Cart_Store SHALL fetch the current cart from the API
4. THE Cart_Store SHALL provide methods for add, remove, clear, and refresh operations
5. THE Cart_Store SHALL expose the cart item count for display in the navigation header

### Requirement 10: Cart Validation and Error Handling

**User Story:** As a customer, I want clear error messages when cart operations fail, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN a product is out of stock, THE Cart_Service SHALL return an error preventing the add operation
2. WHEN a product no longer exists, THE Cart_Service SHALL return a 404 error
3. WHEN quantity exceeds the maximum allowed, THE Cart_Service SHALL return a 422 error with the maximum quantity
4. WHEN a cart item is not found during removal, THE Cart_Service SHALL return a 404 error
5. THE Cart_API SHALL return descriptive error messages in a consistent JSON format
6. WHEN an error occurs, THE Cart_UI SHALL display the error message to the customer

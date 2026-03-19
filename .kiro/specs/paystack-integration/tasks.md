# Implementation Plan: Paystack Integration

## Overview

This implementation plan breaks down the Paystack integration into discrete coding tasks. The integration adds Paystack as a payment processor for the Blyss platform, supporting M-Pesa payments, automatic revenue splits (80% creator, 20% platform), and subaccount management for creators.

The implementation follows the existing Polar architecture patterns and maintains backward compatibility with Stripe orders.

## Tasks

- [x] 1. Set up Paystack module structure and configuration
  - Create `server/polar/integrations/paystack/` directory with `__init__.py`, `service.py`, `endpoints.py`, `tasks.py`, and `schemas.py`
  - Add Paystack configuration to `server/polar/config.py` (PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, PAYSTACK_WEBHOOK_SECRET, PLATFORM_FEE_BASIS_POINTS)
  - Add environment variable validation on startup
  - _Requirements: 1.4, 1.7, 1.8, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 2. Create database migration for Organization model
  - Generate Alembic migration to add Paystack fields to Organization table
  - Add `subaccount_code` (nullable string), `subaccount_status` (enum: pending/active/failed), `mpesa_number` (nullable string), `mpesa_verified` (boolean, default false), `payout_method` (enum: bank/mpesa)
  - Set default values for existing organizations
  - Run migration to apply changes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ] 3. Implement PaystackService core API methods
  - [x] 3.1 Create PaystackService class with initialization
    - Implement `__init__` method to load API keys from settings
    - Set base URL to `https://api.paystack.co`
    - Add HTTP client setup for API requests
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Write property test for PaystackService initialization
    - **Property 4: API Interactions Are Logged**
    - **Validates: Requirements 1.6, 9.1**

  - [x] 3.3 Implement `initialize_transaction` method
    - Accept email, amount (in kobo), currency, reference, subaccount, metadata parameters
    - Make POST request to `/transaction/initialize` endpoint
    - Return response with authorization_url and reference
    - Add structured logging for all API calls
    - _Requirements: 1.1, 1.3, 1.6_

  - [x] 3.4 Write property test for transaction initialization
    - **Property 1: Transaction Initialization Returns Required Fields**
    - **Validates: Requirements 1.1, 1.3**

  - [x] 3.5 Implement `verify_transaction` method
    - Accept transaction reference parameter
    - Make GET request to `/transaction/verify/{reference}` endpoint
    - Return transaction status and details
    - Add structured logging
    - _Requirements: 1.2, 1.6_

  - [x] 3.6 Write property test for transaction verification
    - **Property 2: Transaction Verification Returns Valid Status**
    - **Validates: Requirements 1.2**

  - [x] 3.7 Implement error handling for PaystackService
    - Create PaystackError base exception class
    - Create specific exception classes (PaystackAuthenticationError, PaystackValidationError, PaystackNetworkError, PaystackTransactionError)
    - Add error parsing and exception raising in API methods
    - Ensure descriptive error messages with error type and details
    - _Requirements: 1.5, 9.2, 9.5_

  - [x] 3.8 Write property test for API error handling
    - **Property 3: API Errors Produce Descriptive Exceptions**
    - **Validates: Requirements 1.5, 9.2**

  - [x] 3.9 Write unit tests for PaystackService core methods
    - Test successful transaction initialization
    - Test successful transaction verification
    - Test error scenarios (authentication failure, network errors)
    - Mock Paystack API responses
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement subaccount management
  - [x] 5.1 Implement `create_subaccount` method in PaystackService
    - Accept business_name, settlement_bank, account_number, percentage_charge parameters
    - Make POST request to `/subaccount` endpoint
    - Configure with 80% settlement percentage
    - Return subaccount_code and status
    - Add structured logging
    - _Requirements: 3.1, 3.2, 3.3, 3.7_

  - [x] 5.2 Write property test for subaccount creation
    - **Property 11: Organization Subaccount Creation**
    - **Property 12: Subaccount Settlement Percentage**
    - **Validates: Requirements 3.1, 3.2, 3.3, 4.2**

  - [x] 5.3 Implement `update_subaccount` method in PaystackService
    - Accept subaccount_code, settlement_bank, account_number parameters
    - Make PUT request to `/subaccount/{subaccount_code}` endpoint
    - Return updated subaccount details
    - Add structured logging
    - _Requirements: 3.8_

  - [x] 5.4 Write property test for subaccount updates
    - **Property 15: Subaccount Updates Propagate**
    - **Validates: Requirements 3.8**

  - [x] 5.5 Extend OrganizationService with subaccount creation
    - Add `create_organization_subaccount` method
    - Call PaystackService.create_subaccount with organization details
    - Update organization with subaccount_code and subaccount_status
    - Handle errors and set status to 'failed' on failure
    - Store error message for debugging
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 5.6 Write property test for subaccount status tracking
    - **Property 13: Subaccount Status Tracking**
    - **Validates: Requirements 3.4, 3.5**

  - [x] 5.7 Write property test for business name matching
    - **Property 14: Subaccount Business Name Matches Organization**
    - **Validates: Requirements 3.7**

  - [x] 5.8 Add subaccount creation trigger on organization creation
    - Hook into organization creation flow
    - Enqueue background task to create Paystack subaccount
    - Handle async subaccount creation
    - _Requirements: 3.1_

  - [x] 5.9 Write unit tests for subaccount management
    - Test successful subaccount creation
    - Test failed subaccount creation with error handling
    - Test subaccount update
    - Test retry logic for failed subaccounts
    - Mock Paystack API responses
    - _Requirements: 3.1, 3.5, 3.6, 3.8_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement webhook endpoint and signature verification
  - [x] 7.1 Create webhook endpoint in endpoints.py
    - Add POST route at `/integrations/paystack/webhook`
    - Accept Request object and AsyncSession
    - Return 202 status code
    - _Requirements: 2.1_

  - [x] 7.2 Implement webhook signature verification
    - Extract signature from request headers
    - Compute HMAC signature using PAYSTACK_WEBHOOK_SECRET
    - Compare signatures using constant-time comparison
    - Return HTTP 401 if verification fails
    - _Requirements: 2.2, 2.3_

  - [x] 7.3 Write property test for webhook signature verification
    - **Property 5: Webhook Signature Verification**
    - **Validates: Requirements 2.2, 2.3**

  - [x] 7.4 Implement webhook event parsing
    - Parse JSON payload from request body
    - Extract event type and event data
    - Validate payload structure
    - _Requirements: 2.4_

  - [x] 7.5 Write property test for webhook event parsing
    - **Property 6: Webhook Event Parsing**
    - **Validates: Requirements 2.4**

  - [x] 7.6 Implement webhook event storage
    - Store webhook event in database for audit purposes
    - Include event_id, event_type, payload, timestamp
    - Ensure idempotent storage (check for duplicate event_id)
    - _Requirements: 2.7, 2.9_

  - [x] 7.7 Write property test for webhook event storage
    - **Property 9: Webhook Events Are Stored**
    - **Validates: Requirements 2.7**

  - [x] 7.8 Write property test for webhook idempotency
    - **Property 10: Webhook Idempotency**
    - **Validates: Requirements 2.9**

  - [x] 7.9 Enqueue background task for webhook processing
    - Route charge.success events to charge_success task
    - Route charge.failed events to charge_failed task
    - Ensure webhook response within 10 seconds
    - _Requirements: 2.5, 2.6, 2.8_

  - [x] 7.10 Write unit tests for webhook endpoint
    - Test valid webhook with correct signature
    - Test invalid webhook with incorrect signature
    - Test webhook event storage
    - Test duplicate webhook handling
    - Mock webhook payloads and signatures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.9_

- [x] 8. Implement webhook event handlers
  - [x] 8.1 Create charge_success task handler in tasks.py
    - Add Dramatiq actor with HIGH priority
    - Retrieve webhook event from database
    - Extract transaction reference from payload
    - Verify transaction with Paystack API
    - Create Order record with transaction details
    - Update Checkout status to confirmed
    - Store Paystack transaction reference in order
    - Add retry logic (max 3 retries, exponential backoff)
    - _Requirements: 2.5, 6.4, 6.5, 6.6_

  - [x] 8.2 Write property test for charge success order creation
    - **Property 7: Charge Success Creates Order**
    - **Validates: Requirements 2.5, 6.5**

  - [x] 8.3 Write property test for payment verification before order creation
    - **Property 27: Payment Verification Before Order Creation**
    - **Validates: Requirements 6.4**

  - [x] 8.4 Write property test for transaction reference storage
    - **Property 28: Transaction Reference Stored in Order**
    - **Validates: Requirements 6.6**

  - [x] 8.5 Create charge_failed task handler in tasks.py
    - Add Dramatiq actor with HIGH priority
    - Retrieve webhook event from database
    - Extract transaction reference from payload
    - Update Checkout status to failed
    - Do not create Order record
    - Add retry logic
    - _Requirements: 2.6_

  - [x] 8.6 Write property test for charge failed checkout update
    - **Property 8: Charge Failed Updates Checkout**
    - **Validates: Requirements 2.6**

  - [x] 8.7 Write unit tests for webhook event handlers
    - Test charge_success with valid transaction
    - Test charge_failed with failed transaction
    - Test retry logic on transient failures
    - Mock Paystack API and database operations
    - _Requirements: 2.5, 2.6_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 10. Integrate Paystack into checkout flow
  - [x] 10.1 Update checkout service to initialize Paystack transactions
    - Add logic to detect if organization uses Paystack
    - Check subaccount_status is 'active' before payment initialization
    - Raise error if subaccount is not active
    - Calculate tax amounts before payment initialization
    - Call PaystackService.initialize_transaction with checkout details
    - Include subaccount_code for payment splitting
    - Include order metadata in transaction
    - Store transaction reference in checkout
    - _Requirements: 4.1, 4.7, 6.1, 6.7, 6.8_

  - [x] 10.2 Write property test for payment includes subaccount code
    - **Property 16: Payment Includes Subaccount Code**
    - **Validates: Requirements 4.1**

  - [x] 10.3 Write property test for inactive subaccount prevention
    - **Property 20: Inactive Subaccount Prevents Payment**
    - **Validates: Requirements 4.7**

  - [x] 10.4 Write property test for checkout initialization
    - **Property 26: Checkout Initializes Paystack Transaction**
    - **Validates: Requirements 6.1, 6.2**

  - [x] 10.5 Write property test for tax calculation
    - **Property 29: Tax Calculation Before Payment**
    - **Validates: Requirements 6.7**

  - [x] 10.6 Write property test for order metadata
    - **Property 30: Order Metadata in Transaction**
    - **Validates: Requirements 6.8**

  - [x] 10.7 Update checkout UI to display Paystack payment interface
    - Add Paystack payment button with authorization URL
    - Support M-Pesa, card, and bank transfer payment methods
    - Display payment status and errors
    - _Requirements: 6.2, 6.3_

  - [x] 10.8 Implement payment verification failure handling
    - Return checkout to open status on verification failure
    - Display error message to customer
    - Allow retry of payment
    - _Requirements: 6.9_

  - [x] 10.9 Write property test for failed verification
    - **Property 31: Failed Verification Returns Checkout to Open**
    - **Validates: Requirements 6.9**

  - [x] 10.10 Write unit tests for checkout flow integration
    - Test successful checkout with Paystack
    - Test checkout with inactive subaccount
    - Test payment verification failure
    - Mock PaystackService methods
    - _Requirements: 6.1, 6.4, 6.9, 4.7_

- [x] 11. Implement platform fee calculation and recording
  - [x] 11.1 Add platform fee calculation logic
    - Calculate platform_fee_amount as 20% of order amount
    - Calculate creator_payout as order amount minus platform fee
    - Ensure amounts are in KES currency
    - _Requirements: 4.4, 7.2, 7.5_

  - [x] 11.2 Write property test for platform fee calculation
    - **Property 17: Platform Fee Calculation**
    - **Validates: Requirements 4.4, 7.2, 7.3, 7.5**

  - [x] 11.3 Update order creation to record split amounts
    - Store platform_fee_amount in Order model
    - Store creator payout amount in order data
    - Ensure currency consistency
    - _Requirements: 4.5, 7.3, 7.6_

  - [x] 11.4 Write property test for order split amounts
    - **Property 18: Order Split Amounts Recorded**
    - **Validates: Requirements 4.5**

  - [x] 11.5 Write property test for currency consistency
    - **Property 19: Currency Consistency**
    - **Validates: Requirements 4.6, 7.6**

  - [x] 11.6 Update order details UI to display platform fee
    - Show platform fee separately in order summary
    - Show creator payout amount
    - Display payment processor type (Paystack)
    - _Requirements: 7.4, 10.3_

  - [x] 11.7 Write property test for payment processor type display
    - **Property 35: Payment Processor Type Displayed**
    - **Validates: Requirements 10.3**

  - [x] 11.8 Write unit tests for platform fee calculation
    - Test fee calculation with various order amounts
    - Test split amount recording in orders
    - Test currency consistency
    - _Requirements: 4.4, 4.5, 7.2, 7.5_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement M-Pesa payout configuration
  - [x] 13.1 Implement `send_verification_transaction` method in PaystackService
    - Accept mpesa_number parameter
    - Send KES 10 (1000 kobo) verification transaction
    - Return transaction reference and status
    - Add structured logging
    - _Requirements: 5.3_

  - [x] 13.2 Write property test for M-Pesa verification transaction
    - **Property 22: M-Pesa Verification Transaction**
    - **Validates: Requirements 5.3, 5.4**

  - [x] 13.3 Create M-Pesa configuration endpoint
    - Add POST route at `/organizations/{id}/mpesa`
    - Validate M-Pesa number format (+254XXXXXXXXX)
    - Send verification transaction via PaystackService
    - Store M-Pesa number with mpesa_verified=false
    - Return updated organization
    - Require WebUser authentication
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 13.4 Write property test for M-Pesa number validation
    - **Property 21: M-Pesa Number Format Validation**
    - **Validates: Requirements 5.2**

  - [x] 13.5 Create M-Pesa verification endpoint
    - Add POST route at `/organizations/{id}/mpesa/verify`
    - Check verification transaction status with Paystack
    - Update mpesa_verified to true on success
    - Update Paystack subaccount with M-Pesa number as settlement account
    - Return updated organization
    - Require WebUser authentication
    - _Requirements: 5.5, 5.6_

  - [x] 13.6 Write property test for M-Pesa verification status update
    - **Property 23: M-Pesa Verification Updates Status**
    - **Validates: Requirements 5.5, 5.6**

  - [x] 13.7 Write property test for unverified M-Pesa numbers
    - **Property 24: Unverified M-Pesa Numbers Not Used for Payouts**
    - **Validates: Requirements 5.9**

  - [x] 13.8 Write property test for failed verification
    - **Property 25: Failed Verification Preserves Unverified Status**
    - **Validates: Requirements 5.8**

  - [x] 13.9 Create M-Pesa configuration UI
    - Add M-Pesa number input field to organization settings
    - Add validation for Kenyan phone number format
    - Display verification status
    - Add retry button for failed verifications
    - Allow choice between bank account and M-Pesa for payouts
    - _Requirements: 5.1, 5.7, 5.8_

  - [x] 13.10 Write unit tests for M-Pesa configuration
    - Test M-Pesa number validation (valid and invalid formats)
    - Test verification transaction sending
    - Test verification success flow
    - Test verification failure flow
    - Test subaccount update with M-Pesa details
    - Mock PaystackService methods
    - _Requirements: 5.2, 5.3, 5.5, 5.6, 5.8_

- [x] 14. Implement subaccount status UI
  - [x] 14.1 Create subaccount status display component
    - Show subaccount_status (pending, active, failed) with appropriate indicators
    - Display configured payout method (bank or M-Pesa)
    - Show M-Pesa number and verification status if configured
    - Add retry button for failed subaccount creation
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 14.2 Implement subaccount retry functionality
    - Add endpoint to retry failed subaccount creation
    - Call OrganizationService.create_organization_subaccount
    - Update organization with new subaccount_code or error
    - _Requirements: 3.6, 12.7_

  - [x] 14.3 Write unit tests for subaccount status UI
    - Test status display for pending, active, and failed states
    - Test retry functionality
    - Test payout method display
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.7_

- [x] 15. Ensure backward compatibility with Stripe
  - [x] 15.1 Verify Stripe order preservation
    - Ensure existing Stripe orders remain unchanged
    - Test querying both Stripe and Paystack orders
    - Verify payment processor type is displayed correctly
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 15.2 Write property test for Stripe order preservation
    - **Property 33: Stripe Orders Remain Unchanged**
    - **Validates: Requirements 10.1**

  - [x] 15.3 Write property test for query support
    - **Property 34: Query Support for Both Processors**
    - **Validates: Requirements 10.2**

  - [x] 15.4 Implement webhook routing separation
    - Ensure Stripe webhooks are not routed to Paystack handlers
    - Ensure Paystack webhooks are not routed to Stripe handlers
    - Add webhook routing logic based on endpoint path
    - _Requirements: 10.4_

  - [x] 15.5 Write property test for webhook routing separation
    - **Property 36: Webhook Routing Separation**
    - **Validates: Requirements 10.4**

  - [x] 15.6 Write unit tests for backward compatibility
    - Test Stripe order queries
    - Test mixed Stripe and Paystack order queries
    - Test webhook routing for both processors
    - _Requirements: 10.1, 10.2, 10.4_

- [x] 16. Implement logging and monitoring
  - [x] 16.1 Add structured logging for all Paystack operations
    - Log transaction initialization with sanitized parameters
    - Log transaction verification results
    - Log subaccount creation and updates
    - Log webhook events with sanitized payloads
    - Log M-Pesa verification transactions
    - Ensure no sensitive data (API keys, secrets) in logs
    - _Requirements: 1.6, 9.1, 9.6_

  - [x] 16.2 Write property test for sensitive data in logs
    - **Property 32: Sensitive Data Not in Logs**
    - **Validates: Requirements 9.6**

  - [x] 16.3 Add error logging with context
    - Log API errors with error type and message
    - Log payment failures with transaction reference
    - Log subaccount creation failures with organization ID
    - Log webhook processing errors with event ID
    - _Requirements: 9.1, 9.4_

  - [x] 16.4 Set up monitoring for payment metrics
    - Track payment success and failure rates
    - Track subaccount creation success rates
    - Track webhook processing times
    - Track M-Pesa verification success rates
    - _Requirements: 9.7_

  - [x] 16.5 Write unit tests for logging
    - Test that API calls are logged
    - Test that errors are logged with context
    - Test that sensitive data is not logged
    - _Requirements: 1.6, 9.1, 9.6_

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Integration testing and deployment preparation
  - [x] 18.1 Run end-to-end integration tests
    - Test complete payment flow from checkout to order creation
    - Test subaccount creation and M-Pesa configuration
    - Test webhook processing with test events
    - Test error scenarios and recovery
    - Use Paystack test mode with test API keys

  - [x] 18.2 Update API client generation
    - Run `pnpm run generate` in `clients/packages/client` to update TypeScript client
    - Verify new Paystack endpoints are included
    - Test frontend integration with new API endpoints

  - [x] 18.3 Create deployment documentation
    - Document required environment variables
    - Document database migration steps
    - Document Paystack webhook configuration
    - Document testing procedures

  - [x] 18.4 Prepare for production deployment
    - Set up Paystack live mode API keys in production environment
    - Configure webhook URL in Paystack dashboard
    - Set up monitoring and alerting
    - Create rollback plan

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses Python with FastAPI, SQLAlchemy, and Dramatiq
- Frontend uses Next.js with TypeScript
- All Paystack API interactions use test mode during development

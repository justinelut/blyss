# Requirements Document: Paystack Integration

## Introduction

This document specifies the requirements for integrating Paystack as the payment processor for Blyss, a Kenya-based creator marketplace. The integration replaces Stripe with Paystack to support local payment methods (M-Pesa), automatic revenue splits between creators and platform, and Kenya-specific payment workflows. The platform fee will be increased from 4% to 20%, with creators receiving 80% of payments through Paystack subaccounts.

## Glossary

- **Paystack**: Nigerian payment gateway supporting African payment methods including M-Pesa
- **Paystack_Service**: Backend service handling Paystack API interactions
- **Subaccount**: Paystack feature enabling automatic payment splits to creator accounts
- **M-Pesa**: Mobile money payment system widely used in Kenya
- **Platform**: The Blyss marketplace system
- **Creator**: Organization selling products through the platform
- **Customer**: End user purchasing products from creators
- **Checkout**: Payment session for product purchase
- **Order**: Completed transaction record
- **Webhook**: HTTP callback from Paystack for payment events
- **Split_Transaction**: Paystack transaction automatically divided between platform and creator
- **Settlement_Account**: Bank account or M-Pesa number receiving payouts
- **Verification_Transaction**: Small payment sent to validate M-Pesa number ownership

## Requirements

### Requirement 1: Paystack Core Integration

**User Story:** As a platform administrator, I want to integrate Paystack as a payment processor, so that the platform can accept payments through African payment methods.

#### Acceptance Criteria

1. THE Paystack_Service SHALL initialize payment transactions using the Paystack API
2. THE Paystack_Service SHALL verify payment status using the Paystack API
3. WHEN a payment is initialized, THE Paystack_Service SHALL return a payment reference and authorization URL
4. THE Paystack_Service SHALL support both test mode and live mode configurations
5. THE Paystack_Service SHALL handle API errors and return descriptive error messages
6. THE Paystack_Service SHALL log all API interactions for debugging purposes
7. WHERE test mode is enabled, THE Paystack_Service SHALL use test API keys
8. WHERE live mode is enabled, THE Paystack_Service SHALL use live API keys

### Requirement 2: Webhook Event Processing

**User Story:** As a platform administrator, I want to receive and process Paystack webhook notifications, so that payment status updates are reflected in the system.

#### Acceptance Criteria

1. THE Platform SHALL expose a webhook endpoint for Paystack notifications
2. WHEN a webhook request is received, THE Platform SHALL verify the signature using the webhook secret
3. IF signature verification fails, THEN THE Platform SHALL reject the request with HTTP 401
4. WHEN a valid webhook is received, THE Platform SHALL parse the event type and payload
5. THE Platform SHALL process charge.success events to mark orders as paid
6. THE Platform SHALL process charge.failed events to mark checkouts as failed
7. THE Platform SHALL store webhook events for audit purposes
8. THE Platform SHALL respond to webhook requests within 10 seconds to prevent timeouts
9. THE Platform SHALL handle duplicate webhook events idempotently

### Requirement 3: Subaccount Management for Creators

**User Story:** As a creator, I want a Paystack subaccount automatically created for my organization, so that I can receive my share of payments directly.

#### Acceptance Criteria

1. WHEN an organization is created, THE Platform SHALL create a Paystack subaccount for the organization
2. THE Platform SHALL store the subaccount_code in the Organization model
3. THE Platform SHALL configure subaccounts with an 80% settlement percentage
4. THE Platform SHALL store subaccount status (pending, active, failed) in the Organization model
5. IF subaccount creation fails, THEN THE Platform SHALL store the error and mark status as failed
6. THE Platform SHALL allow retry of failed subaccount creation
7. WHEN a subaccount is created, THE Platform SHALL use the organization name as the business name
8. THE Platform SHALL support updating subaccount details when organization information changes

### Requirement 4: Automatic Payment Splits

**User Story:** As a platform administrator, I want payments to automatically split 80/20 between creators and platform, so that revenue distribution happens without manual intervention.

#### Acceptance Criteria

1. WHEN a payment is initialized, THE Paystack_Service SHALL include the creator subaccount_code in the transaction
2. THE Paystack_Service SHALL configure transactions with 80% going to the creator subaccount
3. THE Paystack_Service SHALL configure transactions with 20% going to the platform account
4. THE Platform SHALL calculate and store platform_fee_amount as 20% of the order amount
5. WHEN an order is created, THE Platform SHALL record the split amounts for both platform and creator
6. THE Platform SHALL support KES currency for all transactions
7. IF a subaccount is not active, THEN THE Platform SHALL prevent payment initialization and return an error

### Requirement 5: M-Pesa Payout Configuration

**User Story:** As a creator, I want to configure my M-Pesa number for payouts, so that I can receive payments directly to my mobile money account.

#### Acceptance Criteria

1. THE Platform SHALL provide a UI for creators to enter their M-Pesa phone number
2. THE Platform SHALL validate M-Pesa phone numbers match the Kenyan format (+254XXXXXXXXX)
3. WHEN a creator submits an M-Pesa number, THE Platform SHALL send a KES 10 verification transaction
4. THE Platform SHALL store the M-Pesa number in the Organization model with verified status false
5. WHEN the verification transaction succeeds, THE Platform SHALL mark the M-Pesa number as verified
6. THE Platform SHALL update the Paystack subaccount with the verified M-Pesa number as settlement account
7. THE Platform SHALL allow creators to choose between bank account and M-Pesa for payouts
8. IF verification fails, THEN THE Platform SHALL display an error message and allow retry
9. THE Platform SHALL store only verified M-Pesa numbers for payout configuration

### Requirement 6: Checkout Flow Integration

**User Story:** As a customer, I want to complete purchases using Paystack payment methods, so that I can pay using M-Pesa and other local payment options.

#### Acceptance Criteria

1. WHEN a checkout is created, THE Platform SHALL initialize a Paystack transaction
2. THE Platform SHALL display the Paystack payment interface to the customer
3. THE Platform SHALL support M-Pesa, card, and bank transfer payment methods
4. WHEN a customer completes payment, THE Platform SHALL verify the transaction with Paystack
5. WHEN payment verification succeeds, THE Platform SHALL create an order record
6. THE Platform SHALL store the Paystack transaction reference in the order
7. THE Platform SHALL calculate tax amounts before initializing payment
8. THE Platform SHALL include order metadata in the Paystack transaction
9. IF payment verification fails, THEN THE Platform SHALL return the checkout to open status

### Requirement 7: Platform Fee Configuration

**User Story:** As a platform administrator, I want to configure the platform fee to 20%, so that the platform receives appropriate revenue from transactions.

#### Acceptance Criteria

1. THE Platform SHALL set PLATFORM_FEE_BASIS_POINTS to 2000
2. WHEN calculating order amounts, THE Platform SHALL apply 20% platform fee
3. THE Platform SHALL store platform_fee_amount in the Order model
4. THE Platform SHALL display platform fee separately in order details
5. THE Platform SHALL calculate creator payout as order amount minus platform fee
6. THE Platform SHALL ensure platform_fee_amount is stored in the same currency as the order

### Requirement 8: Database Schema Updates

**User Story:** As a developer, I want database fields to store Paystack-related data, so that the system can track subaccounts and payment configurations.

#### Acceptance Criteria

1. THE Organization model SHALL include a subaccount_code field (nullable string)
2. THE Organization model SHALL include a subaccount_status field (enum: pending, active, failed)
3. THE Organization model SHALL include an mpesa_number field (nullable string)
4. THE Organization model SHALL include an mpesa_verified field (boolean, default false)
5. THE Organization model SHALL include a payout_method field (enum: bank, mpesa)
6. THE Platform SHALL create a database migration for these new fields
7. THE Platform SHALL set default values for existing organizations (subaccount_status=pending, mpesa_verified=false)

### Requirement 9: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can debug payment issues and ensure system reliability.

#### Acceptance Criteria

1. WHEN a Paystack API call fails, THE Paystack_Service SHALL log the error with request and response details
2. THE Paystack_Service SHALL raise specific exceptions for different error types (authentication, validation, network)
3. THE Platform SHALL log all webhook events with timestamp and payload
4. WHEN payment verification fails, THE Platform SHALL log the failure reason
5. THE Platform SHALL expose error messages to users in a user-friendly format
6. THE Platform SHALL not expose sensitive API keys or secrets in logs or error messages
7. THE Platform SHALL track payment success and failure rates for monitoring

### Requirement 10: Backward Compatibility

**User Story:** As a platform administrator, I want existing Stripe orders to remain functional, so that historical data is preserved during the migration.

#### Acceptance Criteria

1. THE Platform SHALL maintain existing Stripe order records without modification
2. THE Platform SHALL support querying both Stripe and Paystack orders
3. THE Platform SHALL display payment processor type in order details
4. THE Platform SHALL not attempt to process Stripe webhooks through Paystack handlers
5. THE Platform SHALL allow filtering orders by payment processor
6. THE Platform SHALL preserve all existing Stripe-related fields in the Order model

### Requirement 11: Environment Configuration

**User Story:** As a developer, I want environment variables for Paystack configuration, so that I can deploy to different environments securely.

#### Acceptance Criteria

1. THE Platform SHALL read PAYSTACK_SECRET_KEY from environment variables
2. THE Platform SHALL read PAYSTACK_PUBLIC_KEY from environment variables
3. THE Platform SHALL read PAYSTACK_WEBHOOK_SECRET from environment variables
4. THE Platform SHALL validate that required environment variables are set on startup
5. IF required environment variables are missing, THEN THE Platform SHALL log an error and fail to start
6. THE Platform SHALL support separate test and live mode keys through environment configuration

### Requirement 12: Subaccount Status UI

**User Story:** As a creator, I want to view my subaccount status, so that I know if my payout configuration is complete.

#### Acceptance Criteria

1. THE Platform SHALL display subaccount status on the organization settings page
2. WHEN subaccount status is pending, THE Platform SHALL display a pending indicator
3. WHEN subaccount status is active, THE Platform SHALL display a success indicator
4. WHEN subaccount status is failed, THE Platform SHALL display an error message with retry option
5. THE Platform SHALL display the configured payout method (bank or M-Pesa)
6. WHERE M-Pesa is configured, THE Platform SHALL display the M-Pesa number and verification status
7. THE Platform SHALL provide a button to retry subaccount creation if status is failed

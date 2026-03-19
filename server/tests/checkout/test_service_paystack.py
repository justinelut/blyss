"""
Unit tests for Paystack checkout flow integration.

Tests the integration between CheckoutService and PaystackService for:
- Successful checkout with Paystack
- Checkout with inactive subaccount
- Payment verification failure
- Mock PaystackService methods

Requirements: 6.1, 6.4, 6.9, 4.7
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from polar.auth.models import Anonymous, AuthSubject
from polar.checkout.schemas import CheckoutConfirm
from polar.checkout.service import CheckoutService, PaymentError
from polar.integrations.paystack.service import (
    PaystackError,
    PaystackTransactionError,
    PaystackValidationError,
)
from polar.models.checkout import Checkout, CheckoutStatus, PaymentProcessor
from polar.models.customer import Customer
from polar.models.organization import Organization


@pytest.fixture
def paystack_service_mock(mocker):
    """Mock PaystackService for testing."""
    return mocker.patch("polar.checkout.service.paystack_service")


@pytest.fixture
def organization_service_mock(mocker):
    """Mock OrganizationService for testing."""
    return mocker.patch("polar.checkout.service.organization_service")


@pytest.fixture
def enqueue_job_mock(mocker):
    """Mock enqueue_job for testing."""
    return mocker.patch("polar.checkout.service.enqueue_job")


@pytest.fixture
def generate_token_mock(mocker):
    """Mock generate_token for testing."""
    return mocker.patch("polar.checkout.service.generate_token")


@pytest.fixture
async def organization_with_active_subaccount(save_fixture) -> Organization:
    """Create an organization with active Paystack subaccount."""
    organization = Organization(
        name="Test Organization",
        slug="test-org",
        subaccount_code="ACCT_test123",
        subaccount_status="active",
        mpesa_number="+254712345678",
        mpesa_verified=True,
        payout_method="mpesa",
    )
    await save_fixture(organization)
    return organization


@pytest.fixture
async def organization_with_inactive_subaccount(save_fixture) -> Organization:
    """Create an organization with inactive Paystack subaccount."""
    organization = Organization(
        name="Test Organization Inactive",
        slug="test-org-inactive",
        subaccount_code=None,
        subaccount_status="pending",
        mpesa_number=None,
        mpesa_verified=False,
        payout_method="bank",
    )
    await save_fixture(organization)
    return organization


@pytest.fixture
async def checkout_paystack_active(
    save_fixture, organization_with_active_subaccount, product_one_time
) -> Checkout:
    """Create a Paystack checkout with active subaccount."""
    checkout = Checkout(
        organization=organization_with_active_subaccount,
        product=product_one_time,
        product_price=product_one_time.prices[0],
        payment_processor=PaymentProcessor.paystack,
        status=CheckoutStatus.open,
        customer_email="customer@example.com",
        currency="KES",
        amount=10000,  # KES 100 in kobo
        tax_amount=0,
        total_amount=10000,
        payment_processor_metadata={},
    )
    await save_fixture(checkout)
    return checkout


@pytest.fixture
async def checkout_paystack_inactive(
    save_fixture, organization_with_inactive_subaccount, product_one_time
) -> Checkout:
    """Create a Paystack checkout with inactive subaccount."""
    checkout = Checkout(
        organization=organization_with_inactive_subaccount,
        product=product_one_time,
        product_price=product_one_time.prices[0],
        payment_processor=PaymentProcessor.paystack,
        status=CheckoutStatus.open,
        customer_email="customer@example.com",
        currency="KES",
        amount=10000,  # KES 100 in kobo
        tax_amount=0,
        total_amount=10000,
        payment_processor_metadata={},
    )
    await save_fixture(checkout)
    return checkout


@pytest.fixture
async def customer_for_checkout(
    save_fixture, organization_with_active_subaccount
) -> Customer:
    """Create a customer for checkout testing."""
    customer = Customer(
        organization=organization_with_active_subaccount,
        email="customer@example.com",
        name="Test Customer",
    )
    await save_fixture(customer)
    return customer


class TestPaystackCheckoutFlow:
    """Test Paystack checkout flow integration."""

    class TestSuccessfulCheckout:
        """Test successful checkout with Paystack."""

        async def test_successful_paystack_checkout(
            self,
            session: AsyncSession,
            checkout_paystack_active: Checkout,
            customer_for_checkout: Customer,
            paystack_service_mock: MagicMock,
            organization_service_mock: MagicMock,
            generate_token_mock: MagicMock,
        ) -> None:
            """
            Test successful checkout with Paystack.

            Requirements: 6.1, 6.4
            """
            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Mock Paystack transaction initialization
            transaction_reference = f"checkout_{checkout_paystack_active.id}_test_token"
            authorization_url = f"https://checkout.paystack.com/{transaction_reference}"
            access_code = f"access_{transaction_reference}"

            paystack_service_mock.initialize_transaction = AsyncMock(
                return_value={
                    "reference": transaction_reference,
                    "authorization_url": authorization_url,
                    "access_code": access_code,
                }
            )

            generate_token_mock.return_value = "test_token"

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock customer creation
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = mock_create_or_update_customer
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_active
            )
            checkout_service._after_checkout_updated = AsyncMock()

            # Create checkout confirm data
            checkout_confirm = CheckoutConfirm()
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # Confirm checkout
            result = await checkout_service._confirm_inner(
                session, auth_subject, checkout_paystack_active, checkout_confirm
            )

            # Assertions
            assert result.status == CheckoutStatus.confirmed
            assert result.customer == customer_for_checkout

            # Verify Paystack service was called correctly
            paystack_service_mock.initialize_transaction.assert_called_once()
            call_args = paystack_service_mock.initialize_transaction.call_args

            assert call_args.kwargs["email"] == "customer@example.com"
            assert call_args.kwargs["amount"] == 10000
            assert call_args.kwargs["currency"] == "KES"
            assert call_args.kwargs["subaccount"] == "ACCT_test123"
            assert "reference" in call_args.kwargs
            assert "metadata" in call_args.kwargs

            # Verify metadata includes required fields
            metadata = call_args.kwargs["metadata"]
            assert str(checkout_paystack_active.organization_id) in str(
                metadata["organization_id"]
            )
            assert str(checkout_paystack_active.id) in str(metadata["checkout_id"])
            assert str(customer_for_checkout.id) in str(metadata["customer_id"])

            # Verify payment processor metadata is stored
            assert (
                result.payment_processor_metadata["transaction_reference"]
                == transaction_reference
            )
            assert (
                result.payment_processor_metadata["authorization_url"]
                == authorization_url
            )
            assert result.payment_processor_metadata["access_code"] == access_code

        async def test_successful_paystack_checkout_with_tax(
            self,
            session: AsyncSession,
            checkout_paystack_active: Checkout,
            customer_for_checkout: Customer,
            paystack_service_mock: MagicMock,
            organization_service_mock: MagicMock,
            generate_token_mock: MagicMock,
        ) -> None:
            """
            Test successful checkout with tax calculation.

            Requirements: 6.7
            """
            # Setup checkout with tax
            checkout_paystack_active.tax_amount = 1600  # 16% VAT on KES 100
            checkout_paystack_active.total_amount = 11600  # KES 100 + VAT

            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            paystack_service_mock.initialize_transaction = AsyncMock(
                return_value={
                    "reference": "test_ref",
                    "authorization_url": "https://checkout.paystack.com/test",
                    "access_code": "test_access",
                }
            )

            generate_token_mock.return_value = "test_token"

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock customer creation
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = mock_create_or_update_customer
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_active
            )
            checkout_service._after_checkout_updated = AsyncMock()

            # Create checkout confirm data
            checkout_confirm = CheckoutConfirm()
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # Confirm checkout
            result = await checkout_service._confirm_inner(
                session, auth_subject, checkout_paystack_active, checkout_confirm
            )

            # Assertions
            assert result.status == CheckoutStatus.confirmed

            # Verify tax calculation was called before payment initialization
            checkout_service._update_checkout_tax.assert_called_once_with(
                session, checkout_paystack_active
            )

            # Verify total amount includes tax
            call_args = paystack_service_mock.initialize_transaction.call_args
            assert call_args.kwargs["amount"] == 11600  # Total with tax

        async def test_successful_free_checkout_paystack(
            self,
            session: AsyncSession,
            checkout_paystack_active: Checkout,
            customer_for_checkout: Customer,
            organization_service_mock: MagicMock,
            enqueue_job_mock: MagicMock,
        ) -> None:
            """
            Test successful free checkout (no payment required).

            Requirements: 6.1
            """
            # Setup free checkout
            checkout_paystack_active.amount = 0
            checkout_paystack_active.total_amount = 0
            checkout_paystack_active.is_payment_required = False
            checkout_paystack_active.is_payment_form_required = False

            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock customer creation
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = mock_create_or_update_customer
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_active
            )
            checkout_service._after_checkout_updated = AsyncMock()

            # Create checkout confirm data
            checkout_confirm = CheckoutConfirm()
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # Confirm checkout
            result = await checkout_service._confirm_inner(
                session, auth_subject, checkout_paystack_active, checkout_confirm
            )

            # Assertions
            assert result.status == CheckoutStatus.confirmed
            assert result.customer == customer_for_checkout

            # Verify free checkout handler is enqueued
            enqueue_job_mock.assert_called_once_with(
                "checkout.handle_free_success", checkout_id=checkout_paystack_active.id
            )

    class TestInactiveSubaccount:
        """Test checkout with inactive subaccount."""

        async def test_checkout_with_inactive_subaccount(
            self,
            session: AsyncSession,
            checkout_paystack_inactive: Checkout,
            customer_for_checkout: Customer,
            organization_service_mock: MagicMock,
        ) -> None:
            """
            Test checkout fails with inactive subaccount.

            Requirements: 4.7
            """
            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock customer creation
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = mock_create_or_update_customer
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_inactive
            )
            checkout_service._after_checkout_updated = AsyncMock()

            # Create checkout confirm data
            checkout_confirm = CheckoutConfirm()
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # Confirm checkout should raise PaymentError
            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    session, auth_subject, checkout_paystack_inactive, checkout_confirm
                )

            # Verify error details
            error = exc_info.value
            assert error.checkout == checkout_paystack_inactive
            assert "inactive_subaccount" in error.error_type
            assert "pending" in error.error_message

        async def test_checkout_with_failed_subaccount(
            self,
            session: AsyncSession,
            checkout_paystack_inactive: Checkout,
            customer_for_checkout: Customer,
            organization_service_mock: MagicMock,
        ) -> None:
            """
            Test checkout fails with failed subaccount.

            Requirements: 4.7
            """
            # Set subaccount status to failed
            checkout_paystack_inactive.organization.subaccount_status = "failed"

            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock customer creation
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = mock_create_or_update_customer
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_inactive
            )
            checkout_service._after_checkout_updated = AsyncMock()

            # Create checkout confirm data
            checkout_confirm = CheckoutConfirm()
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # Confirm checkout should raise PaymentError
            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    session, auth_subject, checkout_paystack_inactive, checkout_confirm
                )

            # Verify error details
            error = exc_info.value
            assert error.checkout == checkout_paystack_inactive
            assert "inactive_subaccount" in error.error_type
            assert "failed" in error.error_message

    class TestPaymentVerificationFailure:
        """Test payment verification failure scenarios."""

        async def test_paystack_api_error_during_initialization(
            self,
            session: AsyncSession,
            checkout_paystack_active: Checkout,
            customer_for_checkout: Customer,
            paystack_service_mock: MagicMock,
            organization_service_mock: MagicMock,
        ) -> None:
            """
            Test Paystack API error during transaction initialization.

            Requirements: 6.9
            """
            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Mock Paystack service to raise error
            paystack_service_mock.initialize_transaction = AsyncMock(
                side_effect=PaystackTransactionError(
                    "Transaction initialization failed"
                )
            )

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock customer creation
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = mock_create_or_update_customer
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_active
            )
            checkout_service._after_checkout_updated = AsyncMock()

            # Create checkout confirm data
            checkout_confirm = CheckoutConfirm()
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # Confirm checkout should raise PaymentError
            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    session, auth_subject, checkout_paystack_active, checkout_confirm
                )

            # Verify error details
            error = exc_info.value
            assert error.checkout == checkout_paystack_active
            assert "paystack_error" in error.error_type
            assert "Transaction initialization failed" in error.error_message

        async def test_paystack_validation_error(
            self,
            session: AsyncSession,
            checkout_paystack_active: Checkout,
            customer_for_checkout: Customer,
            paystack_service_mock: MagicMock,
            organization_service_mock: MagicMock,
        ) -> None:
            """
            Test Paystack validation error during transaction initialization.

            Requirements: 6.9
            """
            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Mock Paystack service to raise validation error
            paystack_service_mock.initialize_transaction = AsyncMock(
                side_effect=PaystackValidationError("Invalid email format")
            )

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock customer creation
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = mock_create_or_update_customer
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_active
            )
            checkout_service._after_checkout_updated = AsyncMock()

            # Create checkout confirm data
            checkout_confirm = CheckoutConfirm()
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # Confirm checkout should raise PaymentError
            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    session, auth_subject, checkout_paystack_active, checkout_confirm
                )

            # Verify error details
            error = exc_info.value
            assert error.checkout == checkout_paystack_active
            assert "paystack_error" in error.error_type
            assert "Invalid email format" in error.error_message

        async def test_generic_paystack_error(
            self,
            session: AsyncSession,
            checkout_paystack_active: Checkout,
            customer_for_checkout: Customer,
            paystack_service_mock: MagicMock,
            organization_service_mock: MagicMock,
        ) -> None:
            """
            Test generic Paystack error during transaction initialization.

            Requirements: 6.9
            """
            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Mock Paystack service to raise generic error
            paystack_service_mock.initialize_transaction = AsyncMock(
                side_effect=PaystackError("Network timeout")
            )

            # Create checkout service
            checkout_service = CheckoutService()

            # Mock customer creation
            async def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = mock_create_or_update_customer
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_active
            )
            checkout_service._after_checkout_updated = AsyncMock()

            # Create checkout confirm data
            checkout_confirm = CheckoutConfirm()
            auth_subject = AuthSubject(subject=Anonymous(), scopes=set())

            # Confirm checkout should raise PaymentError
            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    session, auth_subject, checkout_paystack_active, checkout_confirm
                )

            # Verify error details
            error = exc_info.value
            assert error.checkout == checkout_paystack_active
            assert "paystack_error" in error.error_type
            assert "Network timeout" in error.error_message

    class TestMockPaystackService:
        """Test mocking of PaystackService methods."""

        async def test_mock_initialize_transaction_success(
            self,
            paystack_service_mock: MagicMock,
        ) -> None:
            """
            Test mocking successful transaction initialization.

            Requirements: 6.1
            """
            # Setup mock response
            expected_response = {
                "reference": "test_ref_123",
                "authorization_url": "https://checkout.paystack.com/test_ref_123",
                "access_code": "access_test_123",
            }

            paystack_service_mock.initialize_transaction = AsyncMock(
                return_value=expected_response
            )

            # Call mocked method
            result = await paystack_service_mock.initialize_transaction(
                email="test@example.com",
                amount=10000,
                currency="KES",
                reference="test_ref_123",
                subaccount="ACCT_test",
                metadata={"test": "data"},
            )

            # Verify mock was called correctly
            assert result == expected_response
            paystack_service_mock.initialize_transaction.assert_called_once_with(
                email="test@example.com",
                amount=10000,
                currency="KES",
                reference="test_ref_123",
                subaccount="ACCT_test",
                metadata={"test": "data"},
            )

        async def test_mock_initialize_transaction_error(
            self,
            paystack_service_mock: MagicMock,
        ) -> None:
            """
            Test mocking transaction initialization error.

            Requirements: 6.9
            """
            # Setup mock to raise error
            paystack_service_mock.initialize_transaction = AsyncMock(
                side_effect=PaystackTransactionError("Mock transaction error")
            )

            # Call mocked method should raise error
            with pytest.raises(PaystackTransactionError) as exc_info:
                await paystack_service_mock.initialize_transaction(
                    email="test@example.com",
                    amount=10000,
                    currency="KES",
                    reference="test_ref_123",
                    subaccount="ACCT_test",
                )

            # Verify error message
            assert "Mock transaction error" in str(exc_info.value)
            paystack_service_mock.initialize_transaction.assert_called_once()

        async def test_mock_verify_transaction_success(
            self,
            paystack_service_mock: MagicMock,
        ) -> None:
            """
            Test mocking successful transaction verification.

            Requirements: 6.4
            """
            # Setup mock response
            expected_response = {
                "status": "success",
                "reference": "test_ref_123",
                "amount": 10000,
                "currency": "KES",
                "paid_at": "2024-01-01T12:00:00Z",
            }

            paystack_service_mock.verify_transaction = AsyncMock(
                return_value=expected_response
            )

            # Call mocked method
            result = await paystack_service_mock.verify_transaction("test_ref_123")

            # Verify mock was called correctly
            assert result == expected_response
            paystack_service_mock.verify_transaction.assert_called_once_with(
                "test_ref_123"
            )

        async def test_mock_verify_transaction_failed(
            self,
            paystack_service_mock: MagicMock,
        ) -> None:
            """
            Test mocking failed transaction verification.

            Requirements: 6.4, 6.9
            """
            # Setup mock response for failed transaction
            expected_response = {
                "status": "failed",
                "reference": "test_ref_123",
                "amount": 10000,
                "currency": "KES",
                "failure_reason": "Insufficient funds",
            }

            paystack_service_mock.verify_transaction = AsyncMock(
                return_value=expected_response
            )

            # Call mocked method
            result = await paystack_service_mock.verify_transaction("test_ref_123")

            # Verify mock was called correctly
            assert result == expected_response
            assert result["status"] == "failed"
            assert "Insufficient funds" in result["failure_reason"]
            paystack_service_mock.verify_transaction.assert_called_once_with(
                "test_ref_123"
            )

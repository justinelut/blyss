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
import pytest_asyncio
from pytest_mock import MockerFixture
from sqlalchemy.ext.asyncio import AsyncSession

from polar.auth.models import Anonymous, AuthSubject
from polar.checkout.schemas import CheckoutConfirm
from polar.checkout.service import CheckoutService, PaymentError
from polar.kit.address import AddressInput
from polar.integrations.paystack.service import (
    PaystackError,
    PaystackTransactionError,
    PaystackValidationError,
)
from polar.models.checkout import Checkout, CheckoutStatus, PaymentProcessor
from polar.models.customer import Customer
from polar.models.organization import Organization

# Project runs pytest in strict asyncio mode (asyncio_mode = "strict" in
# pyproject.toml), so every async test needs an explicit asyncio marker and
# every async fixture must use @pytest_asyncio.fixture. Without this the whole
# file failed to collect: "async def functions are not natively supported".
pytestmark = pytest.mark.asyncio


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


@pytest_asyncio.fixture
async def organization_with_active_subaccount(save_fixture) -> Organization:
    """Create an organization with active Paystack subaccount."""
    organization = Organization(
        name="Test Organization",
        slug="test-org",
        customer_invoice_prefix="TESTORG",
        subaccount_code="ACCT_test123",
        subaccount_status="active",
        mpesa_number="+254712345678",
        mpesa_verified=True,
        payout_method="mpesa",
    )
    await save_fixture(organization)
    return organization


@pytest_asyncio.fixture
async def organization_with_inactive_subaccount(save_fixture) -> Organization:
    """Create an organization with inactive Paystack subaccount."""
    organization = Organization(
        name="Test Organization Inactive",
        slug="test-org-inactive",
        customer_invoice_prefix="TESTORGINACTIVE",
        subaccount_code=None,
        subaccount_status="pending",
        mpesa_number=None,
        mpesa_verified=False,
        payout_method="bank",
    )
    await save_fixture(organization)
    return organization


@pytest_asyncio.fixture
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
        client_secret="polar_c_test_active",
        customer_email="customer@example.com",
        currency="KES",
        amount=10000,  # KES 100 in kobo
        tax_amount=0,
        discount=None,
        payment_processor_metadata={},
    )
    await save_fixture(checkout)
    return checkout


@pytest_asyncio.fixture
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
        client_secret="polar_c_test_inactive",
        customer_email="customer@example.com",
        currency="KES",
        amount=10000,  # KES 100 in kobo
        tax_amount=0,
        discount=None,
        payment_processor_metadata={},
    )
    await save_fixture(checkout)
    return checkout


@pytest_asyncio.fixture
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
            checkout_service = CheckoutService(cart_service=MagicMock())

            # Mock customer creation
            def mock_create_or_update_customer(session, auth_subject, checkout):
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
            checkout_confirm = CheckoutConfirm(
                customer_billing_address=AddressInput.model_validate(
                    {"country": "KE"}
                ),
                confirmation_token_id="ctoken_test",
            )
            auth_subject = AuthSubject(
                subject=Anonymous(), scopes=set(), session=None
            )

            # Confirm checkout
            result = await checkout_service._confirm_inner(
                session, auth_subject, checkout_paystack_active, checkout_confirm
            )

            # Assertions — Mode A: confirm just locks the checkout and
            # attaches the customer. It does NOT call Paystack's
            # server-side initialize_transaction; the frontend opens the
            # Paystack popup (paystackPop) which performs the charge, and
            # the charge.success webhook creates the Order.
            assert result.status == CheckoutStatus.confirmed
            assert result.customer == customer_for_checkout

            # The legacy server-to-server initialization must NOT happen.
            paystack_service_mock.initialize_transaction.assert_not_called()

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
            # total_amount is a computed property (amount + tax_amount);
            # with amount=10000 + tax_amount=1600 it resolves to 11600.

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
            checkout_service = CheckoutService(cart_service=MagicMock())

            # Mock customer creation
            def mock_create_or_update_customer(session, auth_subject, checkout):
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
            checkout_confirm = CheckoutConfirm(
                customer_billing_address=AddressInput.model_validate(
                    {"country": "KE"}
                ),
                confirmation_token_id="ctoken_test",
            )
            auth_subject = AuthSubject(
                subject=Anonymous(), scopes=set(), session=None
            )

            # Confirm checkout
            result = await checkout_service._confirm_inner(
                session, auth_subject, checkout_paystack_active, checkout_confirm
            )

            # Assertions
            assert result.status == CheckoutStatus.confirmed

            # Tax is still normalised on confirm (Blyss zeroes Stripe Tax
            # for Paystack; the call runs so tax_amount is consistent).
            checkout_service._update_checkout_tax.assert_called_with(
                session, checkout_paystack_active
            )

            # Mode A: no server-side transaction init. The popup charges
            # the buyer (amount + tax) client-side.
            paystack_service_mock.initialize_transaction.assert_not_called()

        async def test_successful_free_checkout_paystack(
            self,
            session: AsyncSession,
            checkout_paystack_active: Checkout,
            customer_for_checkout: Customer,
            organization_service_mock: MagicMock,
            enqueue_job_mock: MagicMock,
            mocker: MockerFixture,
        ) -> None:
            """
            Test successful free checkout (no payment required).

            Requirements: 6.1
            """
            # Setup free checkout. amount is a real column; is_payment_required
            # and is_payment_form_required are computed properties (derived
            # from the product price), so we patch them at the class level
            # rather than assigning to the instance.
            checkout_paystack_active.amount = 0
            mocker.patch.object(
                type(checkout_paystack_active),
                "is_payment_required",
                new_callable=mocker.PropertyMock,
                return_value=False,
            )
            mocker.patch.object(
                type(checkout_paystack_active),
                "is_payment_form_required",
                new_callable=mocker.PropertyMock,
                return_value=False,
            )

            # Setup mocks
            organization_service_mock.is_organization_ready_for_payment = AsyncMock(
                return_value=True
            )

            # Create checkout service
            checkout_service = CheckoutService(cart_service=MagicMock())

            # Mock customer creation
            def mock_create_or_update_customer(session, auth_subject, checkout):
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
            checkout_confirm = CheckoutConfirm(
                customer_billing_address=AddressInput.model_validate(
                    {"country": "KE"}
                ),
                confirmation_token_id="ctoken_test",
            )
            auth_subject = AuthSubject(
                subject=Anonymous(), scopes=set(), session=None
            )

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
            checkout_service = CheckoutService(cart_service=MagicMock())

            # Mock customer creation
            def mock_create_or_update_customer(session, auth_subject, checkout):
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
            checkout_confirm = CheckoutConfirm(
                customer_billing_address=AddressInput.model_validate(
                    {"country": "KE"}
                ),
                confirmation_token_id="ctoken_test",
            )
            auth_subject = AuthSubject(
                subject=Anonymous(), scopes=set(), session=None
            )

            # Confirm checkout should raise PaymentError
            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    session, auth_subject, checkout_paystack_inactive, checkout_confirm
                )

            # Verify error details
            error = exc_info.value
            assert error.checkout == checkout_paystack_inactive
            assert "inactive_subaccount" in error.error_type
            assert "unavailable" in error.error.lower()

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
            checkout_service = CheckoutService(cart_service=MagicMock())

            # Mock customer creation
            def mock_create_or_update_customer(session, auth_subject, checkout):
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
            checkout_confirm = CheckoutConfirm(
                customer_billing_address=AddressInput.model_validate(
                    {"country": "KE"}
                ),
                confirmation_token_id="ctoken_test",
            )
            auth_subject = AuthSubject(
                subject=Anonymous(), scopes=set(), session=None
            )

            # Confirm checkout should raise PaymentError
            with pytest.raises(PaymentError) as exc_info:
                await checkout_service._confirm_inner(
                    session, auth_subject, checkout_paystack_inactive, checkout_confirm
                )

            # Verify error details
            error = exc_info.value
            assert error.checkout == checkout_paystack_inactive
            assert "inactive_subaccount" in error.error_type
            assert "unavailable" in error.error.lower()

    class TestPaymentVerificationFailure:
        """Mode A: confirm never calls Paystack server-side.

        The legacy Mode B tests here asserted that errors from
        paystack.initialize_transaction (the /transaction/initialize
        server-to-server call) surfaced as PaymentError at confirm time.
        That path was removed: in Mode A the frontend opens the Paystack
        popup (paystackPop) which performs the charge, and the
        charge.success webhook creates the Order. So there is no
        server-side initialization to fail at confirm. The only
        confirm-time payment gate left is the inactive-subaccount check,
        covered by TestInactiveSubaccount above.
        """

        async def test_confirm_does_not_call_server_side_initialization(
            self,
            session: AsyncSession,
            checkout_paystack_active: Checkout,
            customer_for_checkout: Customer,
            paystack_service_mock: MagicMock,
            organization_service_mock: MagicMock,
        ) -> None:
            """Confirming a Paystack checkout must not hit Paystack's
            server-side initialize_transaction — the popup charges the
            buyer instead."""
            organization_service_mock.is_organization_ready_for_payment = (
                AsyncMock(return_value=True)
            )
            # If anything tries the server-side path, make it loud.
            paystack_service_mock.initialize_transaction = AsyncMock(
                side_effect=AssertionError(
                    "initialize_transaction must not be called in Mode A"
                )
            )

            checkout_service = CheckoutService(cart_service=MagicMock())

            def mock_create_or_update_customer(session, auth_subject, checkout):
                class MockCustomerContext:
                    async def __aenter__(self):
                        return customer_for_checkout, False

                    async def __aexit__(self, exc_type, exc_val, exc_tb):
                        pass

                return MockCustomerContext()

            checkout_service._create_or_update_customer = (
                mock_create_or_update_customer
            )
            checkout_service._update_checkout_tax = AsyncMock(
                return_value=checkout_paystack_active
            )
            checkout_service._after_checkout_updated = AsyncMock()

            checkout_confirm = CheckoutConfirm(
                customer_billing_address=AddressInput.model_validate(
                    {"country": "KE"}
                ),
                confirmation_token_id="ctoken_test",
            )
            auth_subject = AuthSubject(
                subject=Anonymous(), scopes=set(), session=None
            )

            result = await checkout_service._confirm_inner(
                session, auth_subject, checkout_paystack_active, checkout_confirm
            )

            assert result.status == CheckoutStatus.confirmed
            paystack_service_mock.initialize_transaction.assert_not_called()


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


class TestCustomerIdentityBinding:
    """A logged-in buyer's order must bind to their Blyss account email.

    The customer portal maps a signed-in user to a customer purely by
    account email. If checkout bound the order to whatever email the buyer
    typed into the Paystack popup, the order (and its benefit grants) landed
    on a separate customer the portal could never see — so the buyer saw
    only some of their orders and none of their benefits.
    """

    async def test_logged_in_user_binds_to_account_email(
        self,
        session: AsyncSession,
        save_fixture,
        organization_with_active_subaccount: Organization,
    ) -> None:
        from polar.auth.models import AuthSubject
        from polar.models.user import User

        account_email = "buyer.account@example.com"
        user = User(
            id=__import__("uuid").uuid4(),
            email=account_email,
            email_verified=True,
            oauth_accounts=[],
        )
        await save_fixture(user)

        # Checkout carries a DIFFERENT email (typed into the popup).
        checkout = Checkout(
            organization=organization_with_active_subaccount,
            payment_processor=PaymentProcessor.paystack,
            status=CheckoutStatus.open,
            client_secret="polar_c_bind_test",
            customer=None,
            customer_email="typed-into-popup@example.com",
            currency="KES",
            amount=10000,
            tax_amount=0,
            discount=None,
            payment_processor_metadata={},
            customer_metadata={},
        )
        await save_fixture(checkout)

        checkout_service = CheckoutService(cart_service=MagicMock())
        auth_subject: AuthSubject[User] = AuthSubject(
            subject=user, scopes=set(), session=None
        )

        async with checkout_service._create_or_update_customer(
            session, auth_subject, checkout
        ) as (customer, _generate_session):
            # Bound to the account email, NOT the popup email.
            assert customer.email == account_email
            assert customer.email != checkout.customer_email

    async def test_anonymous_buyer_uses_checkout_email(
        self,
        session: AsyncSession,
        save_fixture,
        organization_with_active_subaccount: Organization,
    ) -> None:
        from polar.auth.models import Anonymous, AuthSubject

        checkout = Checkout(
            organization=organization_with_active_subaccount,
            payment_processor=PaymentProcessor.paystack,
            status=CheckoutStatus.open,
            client_secret="polar_c_anon_test",
            customer=None,
            customer_email="guest@example.com",
            currency="KES",
            amount=10000,
            tax_amount=0,
            discount=None,
            payment_processor_metadata={},
            customer_metadata={},
        )
        await save_fixture(checkout)

        checkout_service = CheckoutService(cart_service=MagicMock())
        auth_subject = AuthSubject(subject=Anonymous(), scopes=set(), session=None)

        async with checkout_service._create_or_update_customer(
            session, auth_subject, checkout
        ) as (customer, _generate_session):
            assert customer.email == "guest@example.com"

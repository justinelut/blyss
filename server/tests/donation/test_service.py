"""Unit tests for DonationService.

This module contains unit tests for the DonationService class, focusing on
donation initiation, amount validation, payment confirmation, and receipt generation.
"""

from unittest.mock import patch

import pytest

from polar.donation.service import (
    DonationNotFoundError,
    DonationService,
    InvalidDonationAmountError,
)
from polar.models import Donation, Organization
from tests.fixtures.database import SaveFixture


@pytest.fixture
def mock_donation_service() -> DonationService:
    """Create a DonationService instance for testing."""
    return DonationService()


class TestInitiateDonation:
    """Tests for DonationService.initiate_donation method."""

    @pytest.mark.asyncio
    async def test_successful_donation_initiation(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test successful donation initiation with valid amount."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        with patch(
            "polar.donation.service.paystack_service.initialize_transaction"
        ) as mock_paystack:
            mock_paystack.return_value = {
                "authorization_url": "https://checkout.paystack.com/test123",
                "access_code": "test_access_code",
                "reference": "donation_test_ref",
            }

            donation, payment_url = await mock_donation_service.initiate_donation(
                session,
                organization.id,
                amount=50000,
                donor_name="John Doe",
                donor_email="john@example.com",
                message="Keep up the great work!",
            )

            assert donation.amount == 50000
            assert donation.currency == "KES"
            assert donation.donor_name == "John Doe"
            assert donation.donor_email == "john@example.com"
            assert donation.message == "Keep up the great work!"
            assert donation.organization_id == organization.id
            assert donation.payment_status == "pending"
            assert donation.payment_reference.startswith("donation_")
            assert payment_url == "https://checkout.paystack.com/test123"

            mock_paystack.assert_called_once()
            call_kwargs = mock_paystack.call_args[1]
            assert call_kwargs["email"] == "john@example.com"
            assert call_kwargs["amount"] == 50000
            assert call_kwargs["currency"] == "KES"
            assert call_kwargs["subaccount"] == "ACCT_test123"
            assert "donation_id" in call_kwargs["metadata"]

    @pytest.mark.asyncio
    async def test_donation_initiation_minimum_amount(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation initiation with minimum valid amount (100)."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        with patch(
            "polar.donation.service.paystack_service.initialize_transaction"
        ) as mock_paystack:
            mock_paystack.return_value = {
                "authorization_url": "https://checkout.paystack.com/test456",
                "access_code": "test_access_code_2",
                "reference": "donation_test_ref_2",
            }

            donation, payment_url = await mock_donation_service.initiate_donation(
                session,
                organization.id,
                amount=100,
                donor_name="Jane Smith",
                donor_email="jane@example.com",
            )

            assert donation.amount == 100
            assert donation.payment_status == "pending"
            assert payment_url == "https://checkout.paystack.com/test456"

    @pytest.mark.asyncio
    async def test_donation_initiation_maximum_amount(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation initiation with maximum valid amount (1000000)."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        with patch(
            "polar.donation.service.paystack_service.initialize_transaction"
        ) as mock_paystack:
            mock_paystack.return_value = {
                "authorization_url": "https://checkout.paystack.com/test789",
                "access_code": "test_access_code_3",
                "reference": "donation_test_ref_3",
            }

            donation, payment_url = await mock_donation_service.initiate_donation(
                session,
                organization.id,
                amount=1000000,
                donor_name="Big Donor",
                donor_email="big@example.com",
            )

            assert donation.amount == 1000000
            assert donation.payment_status == "pending"

    @pytest.mark.asyncio
    async def test_donation_initiation_without_message(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation initiation without optional message."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        with patch(
            "polar.donation.service.paystack_service.initialize_transaction"
        ) as mock_paystack:
            mock_paystack.return_value = {
                "authorization_url": "https://checkout.paystack.com/test999",
                "access_code": "test_access_code_4",
                "reference": "donation_test_ref_4",
            }

            donation, payment_url = await mock_donation_service.initiate_donation(
                session,
                organization.id,
                amount=25000,
                donor_name="Anonymous",
                donor_email="anon@example.com",
            )

            assert donation.message is None
            assert donation.amount == 25000

    @pytest.mark.asyncio
    async def test_donation_amount_too_low(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation initiation with amount below minimum (< 100)."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        with pytest.raises(InvalidDonationAmountError) as exc_info:
            await mock_donation_service.initiate_donation(
                session,
                organization.id,
                amount=99,
                donor_name="John Doe",
                donor_email="john@example.com",
            )

        assert exc_info.value.amount == 99
        assert "Must be between 100 and 1000000" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_donation_amount_too_high(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation initiation with amount above maximum (> 1000000)."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        with pytest.raises(InvalidDonationAmountError) as exc_info:
            await mock_donation_service.initiate_donation(
                session,
                organization.id,
                amount=1000001,
                donor_name="John Doe",
                donor_email="john@example.com",
            )

        assert exc_info.value.amount == 1000001
        assert "Must be between 100 and 1000000" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_donation_amount_zero(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation initiation with zero amount."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        with pytest.raises(InvalidDonationAmountError) as exc_info:
            await mock_donation_service.initiate_donation(
                session,
                organization.id,
                amount=0,
                donor_name="John Doe",
                donor_email="john@example.com",
            )

        assert exc_info.value.amount == 0

    @pytest.mark.asyncio
    async def test_donation_amount_negative(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation initiation with negative amount."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        with pytest.raises(InvalidDonationAmountError) as exc_info:
            await mock_donation_service.initiate_donation(
                session,
                organization.id,
                amount=-100,
                donor_name="John Doe",
                donor_email="john@example.com",
            )

        assert exc_info.value.amount == -100


class TestConfirmDonation:
    """Tests for DonationService.confirm_donation method."""

    @pytest.mark.asyncio
    async def test_successful_donation_confirmation(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test successful donation confirmation via webhook."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        donation = Donation(
            amount=50000,
            currency="KES",
            donor_name="John Doe",
            donor_email="john@example.com",
            message="Great work!",
            organization_id=organization.id,
            payment_reference="donation_test_ref_123",
            payment_status="pending",
        )
        await save_fixture(donation)

        with patch(
            "polar.donation.service.paystack_service.verify_transaction"
        ) as mock_verify:
            mock_verify.return_value = {
                "status": "success",
                "reference": "donation_test_ref_123",
                "amount": 50000,
            }

            confirmed_donation = await mock_donation_service.confirm_donation(
                session, "donation_test_ref_123"
            )

            assert confirmed_donation.id == donation.id
            assert confirmed_donation.payment_status == "success"
            mock_verify.assert_called_once_with("donation_test_ref_123")

    @pytest.mark.asyncio
    async def test_failed_donation_confirmation(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation confirmation with failed payment."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
            subaccount_code="ACCT_test123",
        )
        await save_fixture(organization)

        donation = Donation(
            amount=50000,
            currency="KES",
            donor_name="John Doe",
            donor_email="john@example.com",
            organization_id=organization.id,
            payment_reference="donation_test_ref_456",
            payment_status="pending",
        )
        await save_fixture(donation)

        with patch(
            "polar.donation.service.paystack_service.verify_transaction"
        ) as mock_verify:
            mock_verify.return_value = {
                "status": "failed",
                "reference": "donation_test_ref_456",
                "amount": 50000,
            }

            confirmed_donation = await mock_donation_service.confirm_donation(
                session, "donation_test_ref_456"
            )

            assert confirmed_donation.id == donation.id
            assert confirmed_donation.payment_status == "failed"

    @pytest.mark.asyncio
    async def test_donation_not_found(
        self,
        session,
        mock_donation_service: DonationService,
    ) -> None:
        """Test donation confirmation with non-existent payment reference."""
        with pytest.raises(DonationNotFoundError) as exc_info:
            await mock_donation_service.confirm_donation(
                session, "nonexistent_reference"
            )

        assert exc_info.value.payment_reference == "nonexistent_reference"
        assert "not found" in str(exc_info.value)


class TestGetCreatorDonations:
    """Tests for DonationService.get_creator_donations method."""

    @pytest.mark.asyncio
    async def test_get_creator_donations_empty(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test getting donations for creator with no donations."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
        )
        await save_fixture(organization)

        from polar.kit.pagination import PaginationParams

        pagination = PaginationParams(page=1, limit=50)
        donations, total_count = await mock_donation_service.get_creator_donations(
            session, organization.id, pagination
        )

        assert len(donations) == 0
        assert total_count == 0

    @pytest.mark.asyncio
    async def test_get_creator_donations_with_data(
        self,
        session,
        save_fixture: SaveFixture,
        mock_donation_service: DonationService,
    ) -> None:
        """Test getting donations for creator with multiple donations."""
        organization = Organization(
            name="Test Creator",
            slug="test-creator",
            customer_invoice_prefix="TEST",
        )
        await save_fixture(organization)

        donation1 = Donation(
            amount=10000,
            currency="KES",
            donor_name="Donor 1",
            donor_email="donor1@example.com",
            organization_id=organization.id,
            payment_reference="ref_1",
            payment_status="success",
        )
        donation2 = Donation(
            amount=20000,
            currency="KES",
            donor_name="Donor 2",
            donor_email="donor2@example.com",
            organization_id=organization.id,
            payment_reference="ref_2",
            payment_status="success",
        )
        await save_fixture(donation1)
        await save_fixture(donation2)

        from polar.kit.pagination import PaginationParams

        pagination = PaginationParams(page=1, limit=50)
        donations, total_count = await mock_donation_service.get_creator_donations(
            session, organization.id, pagination
        )

        assert len(donations) == 2
        assert total_count == 2
        assert donations[0].amount in [10000, 20000]
        assert donations[1].amount in [10000, 20000]

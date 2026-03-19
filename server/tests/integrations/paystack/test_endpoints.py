"""
Unit tests for Paystack integration endpoints.

Tests the API endpoints for M-Pesa configuration and subaccount retry functionality.
"""

from unittest.mock import patch
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from polar.models.organization import Organization, PayoutMethod, SubaccountStatus
from polar.organization.service import OrganizationError
from tests.fixtures.database import SaveFixture


class TestMPesaConfigurationEndpoint:
    """Tests for M-Pesa configuration endpoint."""

    @pytest.mark.asyncio
    async def test_configure_mpesa_success(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test successful M-Pesa configuration."""
        user, organization = user_organization

        # Mock PaystackService.send_verification_transaction
        with patch(
            "polar.integrations.paystack.endpoints.paystack_service.send_verification_transaction"
        ) as mock_send_verification:
            mock_send_verification.return_value = {
                "reference": "test_ref_123",
                "status": "success",
            }

            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/mpesa",
                json={"mpesa_number": "+254712345678"},
                cookies={f"polar_session_{organization.id}": user.id},
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response contains updated organization
            assert data["id"] == str(organization.id)
            assert data["mpesa_number"] == "+254712345678"
            assert data["mpesa_verified"] is False
            assert data["payout_method"] == "mpesa"

            # Verify PaystackService was called
            mock_send_verification.assert_called_once_with(mpesa_number="+254712345678")

    @pytest.mark.asyncio
    async def test_configure_mpesa_invalid_number(
        self,
        client: AsyncClient,
        user_organization: tuple,
    ):
        """Test M-Pesa configuration with invalid number format."""
        user, organization = user_organization

        response = await client.post(
            f"/v1/integrations/paystack/organizations/{organization.id}/mpesa",
            json={"mpesa_number": "invalid_number"},
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 422
        data = response.json()
        assert "validation error" in data["detail"][0]["msg"].lower()

    @pytest.mark.asyncio
    async def test_configure_mpesa_organization_not_found(
        self,
        client: AsyncClient,
        user_organization: tuple,
    ):
        """Test M-Pesa configuration with non-existent organization."""
        user, _ = user_organization
        fake_org_id = uuid4()

        response = await client.post(
            f"/v1/integrations/paystack/organizations/{fake_org_id}/mpesa",
            json={"mpesa_number": "+254712345678"},
            cookies={f"polar_session_{fake_org_id}": user.id},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_configure_mpesa_paystack_error(
        self,
        client: AsyncClient,
        user_organization: tuple,
    ):
        """Test M-Pesa configuration when Paystack service fails."""
        user, organization = user_organization

        # Mock PaystackService to raise an exception
        with patch(
            "polar.integrations.paystack.endpoints.paystack_service.send_verification_transaction"
        ) as mock_send_verification:
            mock_send_verification.side_effect = Exception("Paystack API error")

            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/mpesa",
                json={"mpesa_number": "+254712345678"},
                cookies={f"polar_session_{organization.id}": user.id},
            )

            assert response.status_code == 422
            data = response.json()
            assert "Failed to configure M-Pesa" in data["detail"]


class TestMPesaVerificationEndpoint:
    """Tests for M-Pesa verification endpoint."""

    @pytest.mark.asyncio
    async def test_verify_mpesa_success(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test successful M-Pesa verification."""
        user, organization = user_organization

        # Set up organization with M-Pesa number and subaccount
        organization.mpesa_number = "+254712345678"
        organization.mpesa_verified = False
        organization.subaccount_code = "ACCT_test123"
        organization = await save_fixture(organization)

        # Mock PaystackService.update_subaccount
        with patch(
            "polar.integrations.paystack.endpoints.paystack_service.update_subaccount"
        ) as mock_update_subaccount:
            mock_update_subaccount.return_value = {"status": "success"}

            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/mpesa/verify",
                cookies={f"polar_session_{organization.id}": user.id},
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response contains updated organization
            assert data["id"] == str(organization.id)
            assert data["mpesa_verified"] is True

            # Verify PaystackService was called to update subaccount
            mock_update_subaccount.assert_called_once_with(
                subaccount_code="ACCT_test123",
                settlement_bank="mpesa",
                account_number="+254712345678",
            )

    @pytest.mark.asyncio
    async def test_verify_mpesa_no_number_configured(
        self,
        client: AsyncClient,
        user_organization: tuple,
    ):
        """Test M-Pesa verification when no number is configured."""
        user, organization = user_organization

        response = await client.post(
            f"/v1/integrations/paystack/organizations/{organization.id}/mpesa/verify",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 422
        data = response.json()
        assert "No M-Pesa number configured" in data["detail"]

    @pytest.mark.asyncio
    async def test_verify_mpesa_already_verified(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test M-Pesa verification when already verified."""
        user, organization = user_organization

        # Set up organization with verified M-Pesa number
        organization.mpesa_number = "+254712345678"
        organization.mpesa_verified = True
        organization = await save_fixture(organization)

        response = await client.post(
            f"/v1/integrations/paystack/organizations/{organization.id}/mpesa/verify",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["mpesa_verified"] is True


class TestSubaccountRetryEndpoint:
    """Tests for subaccount retry endpoint."""

    @pytest.mark.asyncio
    async def test_retry_subaccount_success(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test successful subaccount retry."""
        user, organization = user_organization

        # Set up organization with failed subaccount
        organization.subaccount_status = SubaccountStatus.FAILED
        organization = await save_fixture(organization)

        # Mock OrganizationService.create_organization_subaccount
        with patch(
            "polar.integrations.paystack.endpoints.organization_service.create_organization_subaccount"
        ) as mock_create_subaccount:
            # Create a new organization object with updated status
            updated_org = Organization(
                id=organization.id,
                name=organization.name,
                subaccount_code="ACCT_new123",
                subaccount_status=SubaccountStatus.ACTIVE,
            )
            mock_create_subaccount.return_value = updated_org

            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/subaccount/retry",
                cookies={f"polar_session_{organization.id}": user.id},
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response contains updated organization
            assert data["id"] == str(organization.id)
            assert data["subaccount_code"] == "ACCT_new123"
            assert data["subaccount_status"] == "active"

            # Verify OrganizationService was called
            mock_create_subaccount.assert_called_once()

    @pytest.mark.asyncio
    async def test_retry_subaccount_already_active(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test subaccount retry when already active."""
        user, organization = user_organization

        # Set up organization with active subaccount
        organization.subaccount_status = SubaccountStatus.ACTIVE
        organization.subaccount_code = "ACCT_active123"
        organization = await save_fixture(organization)

        response = await client.post(
            f"/v1/integrations/paystack/organizations/{organization.id}/subaccount/retry",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 200
        data = response.json()

        # Should return current state without calling service
        assert data["subaccount_status"] == "active"
        assert data["subaccount_code"] == "ACCT_active123"

    @pytest.mark.asyncio
    async def test_retry_subaccount_in_progress(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test subaccount retry when creation is in progress."""
        user, organization = user_organization

        # Set up organization with pending subaccount
        organization.subaccount_status = SubaccountStatus.PENDING
        organization.subaccount_code = "ACCT_pending123"
        organization = await save_fixture(organization)

        response = await client.post(
            f"/v1/integrations/paystack/organizations/{organization.id}/subaccount/retry",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 422
        data = response.json()
        assert "already in progress" in data["detail"]

    @pytest.mark.asyncio
    async def test_retry_subaccount_organization_not_found(
        self,
        client: AsyncClient,
        user_organization: tuple,
    ):
        """Test subaccount retry with non-existent organization."""
        user, _ = user_organization
        fake_org_id = uuid4()

        response = await client.post(
            f"/v1/integrations/paystack/organizations/{fake_org_id}/subaccount/retry",
            cookies={f"polar_session_{fake_org_id}": user.id},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_retry_subaccount_service_error(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test subaccount retry when service fails."""
        user, organization = user_organization

        # Set up organization with failed subaccount
        organization.subaccount_status = SubaccountStatus.FAILED
        organization = await save_fixture(organization)

        # Mock OrganizationService to raise an exception
        with patch(
            "polar.integrations.paystack.endpoints.organization_service.create_organization_subaccount"
        ) as mock_create_subaccount:
            mock_create_subaccount.side_effect = OrganizationError(
                "Subaccount creation failed"
            )

            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/subaccount/retry",
                cookies={f"polar_session_{organization.id}": user.id},
            )

            assert response.status_code == 422
            data = response.json()
            assert "Failed to retry subaccount creation" in data["detail"]


class TestSubaccountStatusDisplay:
    """Tests for subaccount status display functionality."""

    @pytest.mark.asyncio
    async def test_status_display_pending(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test status display for pending subaccount."""
        user, organization = user_organization

        # Set up organization with pending subaccount
        organization.subaccount_status = SubaccountStatus.PENDING
        organization = await save_fixture(organization)

        # Get organization via API to verify status is returned
        response = await client.get(
            f"/v1/organizations/{organization.id}",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["subaccount_status"] == "pending"

    @pytest.mark.asyncio
    async def test_status_display_active(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test status display for active subaccount."""
        user, organization = user_organization

        # Set up organization with active subaccount
        organization.subaccount_status = SubaccountStatus.ACTIVE
        organization.subaccount_code = "ACCT_active123"
        organization = await save_fixture(organization)

        # Get organization via API to verify status is returned
        response = await client.get(
            f"/v1/organizations/{organization.id}",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["subaccount_status"] == "active"
        assert data["subaccount_code"] == "ACCT_active123"

    @pytest.mark.asyncio
    async def test_status_display_failed(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test status display for failed subaccount."""
        user, organization = user_organization

        # Set up organization with failed subaccount
        organization.subaccount_status = SubaccountStatus.FAILED
        organization = await save_fixture(organization)

        # Get organization via API to verify status is returned
        response = await client.get(
            f"/v1/organizations/{organization.id}",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["subaccount_status"] == "failed"

    @pytest.mark.asyncio
    async def test_payout_method_display_bank(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test payout method display for bank account."""
        user, organization = user_organization

        # Set up organization with bank payout method
        organization.payout_method = PayoutMethod.BANK
        organization = await save_fixture(organization)

        # Get organization via API to verify payout method is returned
        response = await client.get(
            f"/v1/organizations/{organization.id}",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["payout_method"] == "bank"

    @pytest.mark.asyncio
    async def test_payout_method_display_mpesa(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        user_organization: tuple,
    ):
        """Test payout method display for M-Pesa."""
        user, organization = user_organization

        # Set up organization with M-Pesa payout method
        organization.payout_method = PayoutMethod.MPESA
        organization.mpesa_number = "+254712345678"
        organization.mpesa_verified = True
        organization = await save_fixture(organization)

        # Get organization via API to verify payout method and M-Pesa details are returned
        response = await client.get(
            f"/v1/organizations/{organization.id}",
            cookies={f"polar_session_{organization.id}": user.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["payout_method"] == "mpesa"
        assert data["mpesa_number"] == "+254712345678"
        assert data["mpesa_verified"] is True

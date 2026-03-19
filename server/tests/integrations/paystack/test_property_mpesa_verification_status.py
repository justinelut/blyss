"""Property-based tests for M-Pesa verification status updates.

This module contains property-based tests using hypothesis to verify
that M-Pesa verification status updates work correctly.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.endpoints import verify_mpesa
from polar.models.organization import Organization, PayoutMethod, SubaccountStatus


class TestMPesaVerificationStatusProperties:
    """Property-based tests for M-Pesa verification status updates."""

    @settings(max_examples=100, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        subaccount_code=st.text(min_size=10, max_size=20).filter(lambda x: x.isalnum()),
        organization_name=st.text(min_size=5, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_23_mpesa_verification_updates_status(
        self,
        mpesa_number: str,
        subaccount_code: str,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 23: M-Pesa Verification Updates Status

        For any M-Pesa number with a successful verification transaction, the platform
        should mark mpesa_verified as true and update the Paystack subaccount with
        the M-Pesa number as the settlement account.

        **Validates: Requirements 5.5, 5.6**
        """
        # Create mock organization with unverified M-Pesa number
        organization_id = uuid4()
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = organization_name
        mock_organization.mpesa_number = mpesa_number
        mock_organization.mpesa_verified = False  # Initially unverified
        mock_organization.subaccount_code = subaccount_code
        mock_organization.payout_method = PayoutMethod.MPESA
        mock_organization.subaccount_status = SubaccountStatus.ACTIVE

        # Mock updated organization after verification
        mock_updated_organization = MagicMock(spec=Organization)
        mock_updated_organization.id = organization_id
        mock_updated_organization.name = organization_name
        mock_updated_organization.mpesa_number = mpesa_number
        mock_updated_organization.mpesa_verified = True  # Now verified
        mock_updated_organization.subaccount_code = subaccount_code
        mock_updated_organization.payout_method = PayoutMethod.MPESA
        mock_updated_organization.subaccount_status = SubaccountStatus.ACTIVE

        # Mock repository
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=mock_organization)
        mock_repository.update = AsyncMock(return_value=mock_updated_organization)

        # Mock PaystackService
        mock_paystack_service = MagicMock()
        mock_paystack_service.update_subaccount = AsyncMock(
            return_value={
                "status": True,
                "message": "Subaccount updated successfully",
                "data": {
                    "subaccount_code": subaccount_code,
                    "settlement_bank": "mpesa",
                    "account_number": mpesa_number,
                },
            }
        )

        # Mock auth subject
        mock_auth_subject = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.paystack_service",
                mock_paystack_service,
            ),
            patch(
                "polar.integrations.paystack.endpoints.OrganizationSchema"
            ) as mock_schema,
        ):
            mock_repo_class.from_session.return_value = mock_repository
            mock_schema.model_validate.return_value = mock_updated_organization

            # Call the verification endpoint
            result = await verify_mpesa(
                id=organization_id,
                auth_subject=mock_auth_subject,
                session=MagicMock(),
            )

            # Property assertion: Organization should be updated with verified status
            mock_repository.update.assert_called_once()
            update_call = mock_repository.update.call_args

            # Verify the update parameters
            assert update_call[0][0] == mock_organization, (
                "Update should be called with the original organization"
            )

            update_dict = update_call[1]["update_dict"]
            assert update_dict["mpesa_verified"] is True, (
                "M-Pesa verification status should be set to True"
            )

            # Property assertion: Paystack subaccount should be updated
            mock_paystack_service.update_subaccount.assert_called_once()
            subaccount_call = mock_paystack_service.update_subaccount.call_args

            assert subaccount_call[1]["subaccount_code"] == subaccount_code, (
                "Subaccount update should use the correct subaccount code"
            )
            assert subaccount_call[1]["settlement_bank"] == "mpesa", (
                "Settlement bank should be set to 'mpesa'"
            )
            assert subaccount_call[1]["account_number"] == mpesa_number, (
                "Account number should be set to the M-Pesa number"
            )

            # Property assertion: Result should be the updated organization
            assert result == mock_updated_organization, (
                "Verification should return the updated organization"
            )

    @settings(max_examples=50, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        organization_name=st.text(min_size=5, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_23_already_verified_mpesa(
        self,
        mpesa_number: str,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 23: M-Pesa Verification Updates Status

        For any M-Pesa number that is already verified, the platform should return
        the current state without making unnecessary updates.

        **Validates: Requirements 5.5, 5.6**
        """
        organization_id = uuid4()

        # Create mock organization with already verified M-Pesa number
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = organization_name
        mock_organization.mpesa_number = mpesa_number
        mock_organization.mpesa_verified = True  # Already verified
        mock_organization.subaccount_code = "ACCT_test123"
        mock_organization.payout_method = PayoutMethod.MPESA

        # Mock repository
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=mock_organization)

        # Mock auth subject
        mock_auth_subject = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.paystack_service"
            ) as mock_paystack_service,
            patch(
                "polar.integrations.paystack.endpoints.OrganizationSchema"
            ) as mock_schema,
        ):
            mock_repo_class.from_session.return_value = mock_repository
            mock_schema.model_validate.return_value = mock_organization

            # Call the verification endpoint
            result = await verify_mpesa(
                id=organization_id,
                auth_subject=mock_auth_subject,
                session=MagicMock(),
            )

            # Property assertion: No update should be called for already verified numbers
            mock_repository.update.assert_not_called()

            # Property assertion: No Paystack API call should be made
            mock_paystack_service.update_subaccount.assert_not_called()

            # Property assertion: Result should be the current organization
            assert result == mock_organization, (
                "Already verified M-Pesa should return current organization state"
            )

    @settings(max_examples=50, deadline=None)
    @given(
        organization_name=st.text(min_size=5, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_23_no_mpesa_configured(
        self,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 23: M-Pesa Verification Updates Status

        For any organization without an M-Pesa number configured, the platform
        should return an error when verification is attempted.

        **Validates: Requirements 5.5, 5.6**
        """
        organization_id = uuid4()

        # Create mock organization without M-Pesa number
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = organization_name
        mock_organization.mpesa_number = None  # No M-Pesa configured
        mock_organization.mpesa_verified = False

        # Mock repository
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=mock_organization)

        # Mock auth subject
        mock_auth_subject = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.HTTPException"
            ) as mock_http_exception,
        ):
            mock_repo_class.from_session.return_value = mock_repository

            # Property assertion: Should raise HTTPException for missing M-Pesa number
            with pytest.raises(Exception):  # HTTPException will be raised
                await verify_mpesa(
                    id=organization_id,
                    auth_subject=mock_auth_subject,
                    session=MagicMock(),
                )

    @settings(max_examples=50, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        organization_name=st.text(min_size=5, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_23_subaccount_update_failure_handling(
        self,
        mpesa_number: str,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 23: M-Pesa Verification Updates Status

        For any M-Pesa verification where subaccount update fails, the platform
        should still mark the M-Pesa number as verified but log the subaccount
        update failure.

        **Validates: Requirements 5.5, 5.6**
        """
        organization_id = uuid4()
        subaccount_code = "ACCT_test123"

        # Create mock organization with unverified M-Pesa number
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = organization_name
        mock_organization.mpesa_number = mpesa_number
        mock_organization.mpesa_verified = False
        mock_organization.subaccount_code = subaccount_code

        # Mock updated organization after verification
        mock_updated_organization = MagicMock(spec=Organization)
        mock_updated_organization.id = organization_id
        mock_updated_organization.name = organization_name
        mock_updated_organization.mpesa_number = mpesa_number
        mock_updated_organization.mpesa_verified = True  # Should still be verified
        mock_updated_organization.subaccount_code = subaccount_code

        # Mock repository
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=mock_organization)
        mock_repository.update = AsyncMock(return_value=mock_updated_organization)

        # Mock PaystackService that fails subaccount update
        mock_paystack_service = MagicMock()
        mock_paystack_service.update_subaccount = AsyncMock(
            side_effect=Exception("Subaccount update failed")
        )

        # Mock auth subject
        mock_auth_subject = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.paystack_service",
                mock_paystack_service,
            ),
            patch(
                "polar.integrations.paystack.endpoints.OrganizationSchema"
            ) as mock_schema,
            patch("polar.integrations.paystack.endpoints.log") as mock_log,
        ):
            mock_repo_class.from_session.return_value = mock_repository
            mock_schema.model_validate.return_value = mock_updated_organization

            # Call the verification endpoint
            result = await verify_mpesa(
                id=organization_id,
                auth_subject=mock_auth_subject,
                session=MagicMock(),
            )

            # Property assertion: M-Pesa should still be marked as verified
            mock_repository.update.assert_called_once()
            update_call = mock_repository.update.call_args
            update_dict = update_call[1]["update_dict"]
            assert update_dict["mpesa_verified"] is True, (
                "M-Pesa should be verified even if subaccount update fails"
            )

            # Property assertion: Error should be logged
            mock_log.error.assert_called_once()

            # Property assertion: Result should still be the updated organization
            assert result == mock_updated_organization, (
                "Verification should succeed even if subaccount update fails"
            )

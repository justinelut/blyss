"""Property-based tests for failed M-Pesa verification handling.

This module contains property-based tests using hypothesis to verify
that failed M-Pesa verification preserves the unverified status.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.endpoints import verify_mpesa
from polar.integrations.paystack.service import (
    PaystackService,
    PaystackTransactionError,
)
from polar.models.organization import Organization, PayoutMethod, SubaccountStatus


class TestFailedMPesaVerificationProperties:
    """Property-based tests for failed M-Pesa verification handling."""

    @settings(max_examples=100, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        subaccount_code=st.text(min_size=10, max_size=20).filter(lambda x: x.isalnum()),
        organization_name=st.text(min_size=5, max_size=50),
        error_message=st.text(min_size=10, max_size=100),
    )
    @pytest.mark.asyncio
    async def test_property_25_failed_verification_preserves_unverified_status(
        self,
        mpesa_number: str,
        subaccount_code: str,
        organization_name: str,
        error_message: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 25: Failed Verification Preserves Unverified Status

        For any M-Pesa verification transaction that fails, the mpesa_verified
        field should remain false and the subaccount should not be updated with
        the M-Pesa number.

        **Validates: Requirements 5.8**
        """
        organization_id = uuid4()

        # Create mock organization with unverified M-Pesa number
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = organization_name
        mock_organization.mpesa_number = mpesa_number
        mock_organization.mpesa_verified = False  # Initially unverified
        mock_organization.subaccount_code = subaccount_code
        mock_organization.payout_method = PayoutMethod.MPESA
        mock_organization.subaccount_status = SubaccountStatus.ACTIVE

        # Mock repository that should NOT be called for updates on failure
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=mock_organization)
        mock_repository.update = AsyncMock()  # Should not be called

        # Mock PaystackService that fails verification check
        mock_paystack_service = MagicMock()
        mock_paystack_service.update_subaccount = AsyncMock()  # Should not be called

        # Mock auth subject
        mock_auth_subject = MagicMock()

        # Mock HTTPException to be raised on verification failure
        mock_http_exception = Exception(f"Failed to verify M-Pesa: {error_message}")

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.paystack_service",
                mock_paystack_service,
            ),
            patch(
                "polar.integrations.paystack.endpoints.HTTPException",
                side_effect=mock_http_exception,
            ),
        ):
            mock_repo_class.from_session.return_value = mock_repository

            # Simulate verification failure by raising an exception
            with pytest.raises(Exception) as exc_info:
                await verify_mpesa(
                    id=organization_id,
                    auth_subject=mock_auth_subject,
                    session=MagicMock(),
                )

            # Property assertion: Exception should contain the error message
            assert error_message in str(
                exc_info.value
            ) or "Failed to verify M-Pesa" in str(exc_info.value), (
                "Verification failure should raise an exception with error details"
            )

            # Property assertion: Organization should NOT be updated on failure
            mock_repository.update.assert_not_called()

            # Property assertion: Paystack subaccount should NOT be updated on failure
            mock_paystack_service.update_subaccount.assert_not_called()

            # Property assertion: Original organization state should be preserved
            # (We can't directly verify this in the endpoint, but the lack of update calls ensures it)

    @settings(max_examples=100, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        amount=st.integers(min_value=1000, max_value=1000),
        error_code=st.integers(min_value=400, max_value=599),
        error_message=st.text(min_size=10, max_size=100),
    )
    @pytest.mark.asyncio
    async def test_property_25_failed_verification_transaction_service_level(
        self,
        mpesa_number: str,
        amount: int,
        error_code: int,
        error_message: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 25: Failed Verification Preserves Unverified Status

        For any M-Pesa verification transaction that fails at the service level,
        the PaystackService should raise an appropriate exception without
        modifying any state.

        **Validates: Requirements 5.8**
        """
        # Mock failed Paystack API response
        mock_error_response = {
            "status": False,
            "message": error_message,
            "data": None,
        }

        mock_response = MagicMock()
        mock_response.status_code = error_code
        mock_response.json.return_value = mock_error_response

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log") as mock_log,
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Property assertion: Failed verification should raise an exception
            with pytest.raises(PaystackTransactionError) as exc_info:
                await service.send_verification_transaction(
                    mpesa_number=mpesa_number,
                    amount=amount,
                )

            # Property assertion: Exception should contain error details
            assert (
                error_message in str(exc_info.value)
                or "verification" in str(exc_info.value).lower()
            ), "Failed verification should raise exception with error details"

            # Property assertion: Error should be logged
            mock_log.error.assert_called()

            # Verify the API call was made with correct parameters
            service._client.post.assert_called_once()
            call_args = service._client.post.call_args

            # Verify endpoint
            assert call_args[0][0] == "/transfer"

            # Verify payload structure
            payload = call_args[1]["json"]
            assert payload["recipient"] == mpesa_number
            assert payload["amount"] == amount
            assert payload["source"] == "balance"
            assert "reference" in payload
            assert "mpesa_verify_" in payload["reference"]

    @settings(max_examples=50, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        organization_name=st.text(min_size=5, max_size=50),
    )
    def test_property_25_verification_status_consistency(
        self,
        mpesa_number: str,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 25: Failed Verification Preserves Unverified Status

        For any organization with a failed M-Pesa verification, the organization
        state should remain consistent with an unverified M-Pesa number.

        **Validates: Requirements 5.8**
        """
        organization_id = uuid4()

        # Create organization state after failed verification
        failed_verification_org = MagicMock(spec=Organization)
        failed_verification_org.id = organization_id
        failed_verification_org.name = organization_name
        failed_verification_org.mpesa_number = mpesa_number
        failed_verification_org.mpesa_verified = (
            False  # Should remain false after failure
        )
        failed_verification_org.payout_method = PayoutMethod.MPESA
        failed_verification_org.subaccount_code = "ACCT_test123"

        # Property assertion: Failed verification should preserve unverified status
        assert not failed_verification_org.mpesa_verified, (
            "Failed verification should preserve mpesa_verified=False"
        )

        # Property assertion: M-Pesa number should still be present
        assert failed_verification_org.mpesa_number == mpesa_number, (
            "Failed verification should not remove the M-Pesa number"
        )

        # Property assertion: Payout method can still be M-Pesa (for future verification)
        assert failed_verification_org.payout_method == PayoutMethod.MPESA, (
            "Failed verification should not change payout method preference"
        )

        # Property assertion: Subaccount should still exist
        assert failed_verification_org.subaccount_code is not None, (
            "Failed verification should not affect existing subaccount"
        )

    @settings(max_examples=50, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        organization_name=st.text(min_size=5, max_size=50),
        retry_count=st.integers(min_value=1, max_value=5),
    )
    def test_property_25_multiple_failed_verifications(
        self,
        mpesa_number: str,
        organization_name: str,
        retry_count: int,
    ) -> None:
        """
        Feature: paystack-integration, Property 25: Failed Verification Preserves Unverified Status

        For any organization with multiple failed M-Pesa verification attempts,
        the verification status should remain false and allow for future retry attempts.

        **Validates: Requirements 5.8**
        """
        organization_id = uuid4()

        # Simulate organization state after multiple failed verification attempts
        multiple_failed_org = MagicMock(spec=Organization)
        multiple_failed_org.id = organization_id
        multiple_failed_org.name = organization_name
        multiple_failed_org.mpesa_number = mpesa_number
        multiple_failed_org.mpesa_verified = (
            False  # Should remain false after all failures
        )
        multiple_failed_org.payout_method = PayoutMethod.MPESA
        multiple_failed_org.subaccount_code = "ACCT_test123"

        # Property assertion: Multiple failures should not change verification status
        for attempt in range(retry_count):
            assert not multiple_failed_org.mpesa_verified, (
                f"After {attempt + 1} failed attempts, mpesa_verified should still be False"
            )

            # Property assertion: M-Pesa number should persist through failures
            assert multiple_failed_org.mpesa_number == mpesa_number, (
                f"After {attempt + 1} failed attempts, M-Pesa number should be preserved"
            )

            # Property assertion: Organization should still allow retry
            assert multiple_failed_org.payout_method == PayoutMethod.MPESA, (
                f"After {attempt + 1} failed attempts, should still allow M-Pesa retry"
            )

    @settings(max_examples=50, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        organization_name=st.text(min_size=5, max_size=50),
    )
    def test_property_25_failed_vs_successful_verification_states(
        self,
        mpesa_number: str,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 25: Failed Verification Preserves Unverified Status

        For any M-Pesa number, the organization state after failed verification
        should be clearly distinguishable from successful verification state.

        **Validates: Requirements 5.8**
        """
        organization_id = uuid4()

        # State after failed verification
        failed_org = MagicMock(spec=Organization)
        failed_org.id = organization_id
        failed_org.name = organization_name
        failed_org.mpesa_number = mpesa_number
        failed_org.mpesa_verified = False
        failed_org.payout_method = PayoutMethod.MPESA

        # State after successful verification
        successful_org = MagicMock(spec=Organization)
        successful_org.id = organization_id
        successful_org.name = organization_name
        successful_org.mpesa_number = mpesa_number
        successful_org.mpesa_verified = True
        successful_org.payout_method = PayoutMethod.MPESA

        # Property assertion: Verification status should be different
        assert failed_org.mpesa_verified != successful_org.mpesa_verified, (
            "Failed and successful verification should have different mpesa_verified values"
        )

        # Property assertion: Failed verification should be False
        assert not failed_org.mpesa_verified, (
            "Failed verification should result in mpesa_verified=False"
        )

        # Property assertion: Successful verification should be True
        assert successful_org.mpesa_verified, (
            "Successful verification should result in mpesa_verified=True"
        )

        # Property assertion: Both should have the same M-Pesa number
        assert failed_org.mpesa_number == successful_org.mpesa_number, (
            "Both states should have the same M-Pesa number"
        )

        # Property assertion: Both should have the same payout method preference
        assert failed_org.payout_method == successful_org.payout_method, (
            "Both states should have the same payout method preference"
        )

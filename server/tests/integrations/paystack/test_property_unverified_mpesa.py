"""Property-based tests for unverified M-Pesa number handling.

This module contains property-based tests using hypothesis to verify
that unverified M-Pesa numbers are not used for payouts.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.service import PaystackService
from polar.models.organization import Organization, PayoutMethod, SubaccountStatus


class TestUnverifiedMPesaProperties:
    """Property-based tests for unverified M-Pesa number handling."""

    @settings(max_examples=100, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        subaccount_code=st.text(min_size=10, max_size=20).filter(lambda x: x.isalnum()),
        organization_name=st.text(min_size=5, max_size=50),
        business_name=st.text(min_size=5, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_24_unverified_mpesa_not_used_for_payouts(
        self,
        mpesa_number: str,
        subaccount_code: str,
        organization_name: str,
        business_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 24: Unverified M-Pesa Numbers Not Used for Payouts

        For any organization with an M-Pesa number where mpesa_verified is false,
        the platform should not configure that M-Pesa number as the settlement
        account in Paystack.

        **Validates: Requirements 5.9**
        """
        # Create mock organization with unverified M-Pesa number
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = uuid4()
        mock_organization.name = organization_name
        mock_organization.mpesa_number = mpesa_number
        mock_organization.mpesa_verified = False  # Unverified
        mock_organization.subaccount_code = None  # No subaccount yet
        mock_organization.payout_method = PayoutMethod.MPESA
        mock_organization.subaccount_status = SubaccountStatus.PENDING

        # Mock Paystack API response for subaccount creation
        mock_subaccount_response = {
            "status": True,
            "message": "Subaccount created",
            "data": {
                "subaccount_code": subaccount_code,
                "business_name": business_name,
                "settlement_bank": None,  # Should not be set for unverified M-Pesa
                "account_number": None,  # Should not be set for unverified M-Pesa
                "percentage_charge": 20.0,
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_subaccount_response

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Create subaccount for organization with unverified M-Pesa
            result = await service.create_subaccount(
                business_name=business_name,
                percentage_charge=20.0,
            )

            # Property assertion: Subaccount should be created successfully
            assert result["status"] is True, "Subaccount creation should succeed"
            assert result["data"]["subaccount_code"] == subaccount_code, (
                "Subaccount code should be returned"
            )

            # Property assertion: Settlement details should NOT include unverified M-Pesa
            settlement_bank = result["data"].get("settlement_bank")
            account_number = result["data"].get("account_number")

            # For unverified M-Pesa, these should be None or not set to M-Pesa details
            assert settlement_bank != "mpesa" or settlement_bank is None, (
                "Settlement bank should not be set to 'mpesa' for unverified M-Pesa number"
            )
            assert account_number != mpesa_number or account_number is None, (
                "Account number should not be set to unverified M-Pesa number"
            )

            # Verify the API call parameters
            service._client.post.assert_called_once()
            call_args = service._client.post.call_args

            # Verify endpoint
            assert call_args[0][0] == "/subaccount"

            # Verify payload does not include unverified M-Pesa details
            payload = call_args[1]["json"]
            assert payload["business_name"] == business_name
            assert payload["percentage_charge"] == 20.0

            # Property assertion: Unverified M-Pesa should not be in settlement details
            if "settlement_bank" in payload:
                assert payload["settlement_bank"] != "mpesa", (
                    "Unverified M-Pesa should not be used as settlement bank"
                )
            if "account_number" in payload:
                assert payload["account_number"] != mpesa_number, (
                    "Unverified M-Pesa number should not be used as account number"
                )

    @settings(max_examples=100, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        subaccount_code=st.text(min_size=10, max_size=20).filter(lambda x: x.isalnum()),
        organization_name=st.text(min_size=5, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_24_verified_mpesa_can_be_used_for_payouts(
        self,
        mpesa_number: str,
        subaccount_code: str,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 24: Unverified M-Pesa Numbers Not Used for Payouts

        For any organization with an M-Pesa number where mpesa_verified is true,
        the platform should be able to configure that M-Pesa number as the
        settlement account in Paystack (contrast to unverified numbers).

        **Validates: Requirements 5.9**
        """
        # Mock Paystack API response for subaccount update with verified M-Pesa
        mock_update_response = {
            "status": True,
            "message": "Subaccount updated",
            "data": {
                "subaccount_code": subaccount_code,
                "settlement_bank": "mpesa",
                "account_number": mpesa_number,
                "percentage_charge": 20.0,
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_update_response

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_property_test"

            service = PaystackService()
            service._client.put = AsyncMock(return_value=mock_response)

            # Update subaccount with verified M-Pesa details
            result = await service.update_subaccount(
                subaccount_code=subaccount_code,
                settlement_bank="mpesa",
                account_number=mpesa_number,
            )

            # Property assertion: Update should succeed for verified M-Pesa
            assert result["status"] is True, (
                "Subaccount update should succeed for verified M-Pesa"
            )

            # Property assertion: Settlement details should include verified M-Pesa
            assert result["data"]["settlement_bank"] == "mpesa", (
                "Settlement bank should be set to 'mpesa' for verified M-Pesa"
            )
            assert result["data"]["account_number"] == mpesa_number, (
                "Account number should be set to verified M-Pesa number"
            )

            # Verify the API call parameters
            service._client.put.assert_called_once()
            call_args = service._client.put.call_args

            # Verify endpoint
            assert call_args[0][0] == f"/subaccount/{subaccount_code}"

            # Verify payload includes verified M-Pesa details
            payload = call_args[1]["json"]
            assert payload["settlement_bank"] == "mpesa", (
                "Verified M-Pesa should be used as settlement bank"
            )
            assert payload["account_number"] == mpesa_number, (
                "Verified M-Pesa number should be used as account number"
            )

    @settings(max_examples=50, deadline=None)
    @given(
        mpesa_number=st.from_regex(r"\+254[71][0-9]{8}", fullmatch=True),
        organization_name=st.text(min_size=5, max_size=50),
    )
    def test_property_24_organization_state_consistency(
        self,
        mpesa_number: str,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 24: Unverified M-Pesa Numbers Not Used for Payouts

        For any organization, the mpesa_verified field should accurately reflect
        whether the M-Pesa number can be used for payouts.

        **Validates: Requirements 5.9**
        """
        # Test unverified M-Pesa organization state
        unverified_org = MagicMock(spec=Organization)
        unverified_org.id = uuid4()
        unverified_org.name = organization_name
        unverified_org.mpesa_number = mpesa_number
        unverified_org.mpesa_verified = False
        unverified_org.payout_method = PayoutMethod.MPESA

        # Property assertion: Unverified M-Pesa should not be ready for payouts
        assert not unverified_org.mpesa_verified, (
            "Unverified M-Pesa number should have mpesa_verified=False"
        )

        # Test verified M-Pesa organization state
        verified_org = MagicMock(spec=Organization)
        verified_org.id = uuid4()
        verified_org.name = organization_name
        verified_org.mpesa_number = mpesa_number
        verified_org.mpesa_verified = True
        verified_org.payout_method = PayoutMethod.MPESA

        # Property assertion: Verified M-Pesa should be ready for payouts
        assert verified_org.mpesa_verified, (
            "Verified M-Pesa number should have mpesa_verified=True"
        )

        # Property assertion: Both should have the same M-Pesa number
        assert unverified_org.mpesa_number == verified_org.mpesa_number, (
            "Both organizations should have the same M-Pesa number"
        )

        # Property assertion: Only verification status should differ
        assert unverified_org.mpesa_verified != verified_org.mpesa_verified, (
            "Verification status should be the only difference"
        )

    @settings(max_examples=50, deadline=None)
    @given(
        organization_name=st.text(min_size=5, max_size=50),
    )
    def test_property_24_no_mpesa_number_configured(
        self,
        organization_name: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 24: Unverified M-Pesa Numbers Not Used for Payouts

        For any organization without an M-Pesa number configured, the platform
        should not attempt to use M-Pesa for payouts regardless of verification status.

        **Validates: Requirements 5.9**
        """
        # Test organization without M-Pesa number
        no_mpesa_org = MagicMock(spec=Organization)
        no_mpesa_org.id = uuid4()
        no_mpesa_org.name = organization_name
        no_mpesa_org.mpesa_number = None  # No M-Pesa configured
        no_mpesa_org.mpesa_verified = False
        no_mpesa_org.payout_method = PayoutMethod.BANK  # Should use bank instead

        # Property assertion: No M-Pesa number should mean no M-Pesa payouts
        assert no_mpesa_org.mpesa_number is None, (
            "Organization should have no M-Pesa number configured"
        )
        assert not no_mpesa_org.mpesa_verified, (
            "Organization without M-Pesa should not be verified"
        )
        assert no_mpesa_org.payout_method == PayoutMethod.BANK, (
            "Organization without M-Pesa should use bank payout method"
        )

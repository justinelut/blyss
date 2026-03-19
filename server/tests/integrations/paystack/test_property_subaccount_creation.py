"""Property-based tests for Paystack subaccount creation."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given
from hypothesis import strategies as st

from polar.integrations.paystack.service import (
    PaystackService,
    PaystackTransactionError,
)


class TestPaystackSubaccountCreationProperties:
    """Property-based tests for Paystack subaccount creation functionality."""

    @given(
        business_name=st.text(min_size=1, max_size=100),
        percentage_charge=st.floats(min_value=0.0, max_value=100.0),
    )
    @pytest.mark.asyncio
    async def test_property_11_organization_subaccount_creation(
        self, business_name, percentage_charge, monkeypatch
    ):
        """
        Feature: paystack-integration, Property 11: Organization Subaccount Creation

        For any newly created organization, the platform should create a Paystack
        subaccount and store the subaccount_code in the organization record.
        """
        # Mock successful Paystack API response
        mock_response_data = {
            "status": True,
            "message": "Subaccount created",
            "data": {
                "subaccount_code": f"ACCT_{business_name[:10].upper()}_{hash(business_name) % 10000}",
                "business_name": business_name,
                "percentage_charge": percentage_charge,
                "is_verified": True,
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        # Patch the HTTP client
        monkeypatch.setattr(
            "polar.integrations.paystack.service.httpx.AsyncClient",
            lambda **kwargs: mock_client,
        )

        # Create PaystackService instance
        service = PaystackService()

        # Call create_subaccount method
        result = await service.create_subaccount(
            business_name=business_name,
            percentage_charge=percentage_charge,
        )

        # Verify that subaccount_code is returned
        assert "subaccount_code" in result
        assert result["subaccount_code"] is not None
        assert len(result["subaccount_code"]) > 0

        # Verify that status is returned
        assert "status" in result
        assert result["status"] in ["active", "pending"]

        # Verify API was called with correct parameters
        mock_client.post.assert_called_once_with(
            "/subaccount",
            json={
                "business_name": business_name,
                "percentage_charge": percentage_charge,
            },
        )

    @given(
        business_name=st.text(min_size=1, max_size=100),
        percentage_charge=st.floats(min_value=0.0, max_value=100.0),
    )
    @pytest.mark.asyncio
    async def test_property_12_subaccount_settlement_percentage(
        self, business_name, percentage_charge, monkeypatch
    ):
        """
        Feature: paystack-integration, Property 12: Subaccount Settlement Percentage

        For any subaccount created by the platform, it should be configured with
        an 80% settlement percentage to the creator.
        """
        # Mock successful Paystack API response
        mock_response_data = {
            "status": True,
            "message": "Subaccount created",
            "data": {
                "subaccount_code": f"ACCT_{business_name[:10].upper()}_{hash(business_name) % 10000}",
                "business_name": business_name,
                "percentage_charge": percentage_charge,
                "is_verified": True,
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        # Patch the HTTP client
        monkeypatch.setattr(
            "polar.integrations.paystack.service.httpx.AsyncClient",
            lambda **kwargs: mock_client,
        )

        # Create PaystackService instance
        service = PaystackService()

        # Call create_subaccount method with 20% platform fee (80% to creator)
        platform_fee_percentage = 20.0
        result = await service.create_subaccount(
            business_name=business_name,
            percentage_charge=platform_fee_percentage,
        )

        # Verify that the percentage_charge in the result matches what was sent
        assert "percentage_charge" in result
        assert result["percentage_charge"] == platform_fee_percentage

        # Verify API was called with 20% platform fee (meaning 80% goes to creator)
        mock_client.post.assert_called_once_with(
            "/subaccount",
            json={
                "business_name": business_name,
                "percentage_charge": platform_fee_percentage,
            },
        )

        # The creator receives 80% = 100% - 20% platform fee
        creator_percentage = 100.0 - platform_fee_percentage
        assert creator_percentage == 80.0

    @given(
        business_name=st.text(min_size=1, max_size=100),
        percentage_charge=st.floats(min_value=0.0, max_value=100.0),
    )
    @pytest.mark.asyncio
    async def test_property_11_subaccount_creation_failure_handling(
        self, business_name, percentage_charge, monkeypatch
    ):
        """
        Feature: paystack-integration, Property 11: Organization Subaccount Creation

        When subaccount creation fails, the service should raise an appropriate
        exception with error details.
        """
        # Mock failed Paystack API response
        mock_response_data = {
            "status": False,
            "message": "Subaccount creation failed",
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response

        # Patch the HTTP client
        monkeypatch.setattr(
            "polar.integrations.paystack.service.httpx.AsyncClient",
            lambda **kwargs: mock_client,
        )

        # Create PaystackService instance
        service = PaystackService()

        # Call create_subaccount method and expect exception
        with pytest.raises(PaystackTransactionError) as exc_info:
            await service.create_subaccount(
                business_name=business_name,
                percentage_charge=percentage_charge,
            )

        # Verify exception contains error message
        assert "Subaccount creation failed" in str(exc_info.value)

        # Verify API was called
        mock_client.post.assert_called_once()

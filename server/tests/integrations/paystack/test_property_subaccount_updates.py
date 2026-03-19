"""Property-based tests for Paystack subaccount updates."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given
from hypothesis import strategies as st

from polar.integrations.paystack.service import PaystackService, PaystackValidationError


class TestPaystackSubaccountUpdatesProperties:
    """Property-based tests for Paystack subaccount update functionality."""

    @given(
        subaccount_code=st.text(min_size=10, max_size=50),
        settlement_bank=st.text(min_size=3, max_size=10),
        account_number=st.text(min_size=10, max_size=20),
    )
    @pytest.mark.asyncio
    async def test_property_15_subaccount_updates_propagate(
        self, subaccount_code, settlement_bank, account_number, monkeypatch
    ):
        """
        Feature: paystack-integration, Property 15: Subaccount Updates Propagate

        For any organization with an active subaccount, when the organization's
        settlement details (bank account or M-Pesa number) are updated, the
        Paystack subaccount should be updated accordingly.
        """
        # Mock successful Paystack API response
        mock_response_data = {
            "status": True,
            "message": "Subaccount updated successfully",
            "data": {
                "subaccount_code": subaccount_code,
                "business_name": "Test Business",
                "settlement_bank": settlement_bank,
                "account_number": account_number,
                "percentage_charge": 20.0,
                "is_verified": True,
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        mock_client = AsyncMock()
        mock_client.put.return_value = mock_response

        # Patch the HTTP client
        monkeypatch.setattr(
            "polar.integrations.paystack.service.httpx.AsyncClient",
            lambda **kwargs: mock_client,
        )

        # Create PaystackService instance
        service = PaystackService()

        # Call update_subaccount method
        result = await service.update_subaccount(
            subaccount_code=subaccount_code,
            settlement_bank=settlement_bank,
            account_number=account_number,
        )

        # Verify that updated details are returned
        assert result["subaccount_code"] == subaccount_code
        assert result["settlement_bank"] == settlement_bank
        assert result["account_number"] == account_number

        # Verify API was called with correct parameters
        mock_client.put.assert_called_once_with(
            f"/subaccount/{subaccount_code}",
            json={
                "settlement_bank": settlement_bank,
                "account_number": account_number,
            },
        )

    @given(
        subaccount_code=st.text(min_size=10, max_size=50),
        settlement_bank=st.text(min_size=3, max_size=10),
    )
    @pytest.mark.asyncio
    async def test_property_15_subaccount_partial_updates(
        self, subaccount_code, settlement_bank, monkeypatch
    ):
        """
        Feature: paystack-integration, Property 15: Subaccount Updates Propagate

        For any subaccount update with only some fields provided, only those
        fields should be included in the API request.
        """
        # Mock successful Paystack API response
        mock_response_data = {
            "status": True,
            "message": "Subaccount updated successfully",
            "data": {
                "subaccount_code": subaccount_code,
                "business_name": "Test Business",
                "settlement_bank": settlement_bank,
                "account_number": "existing_account",
                "percentage_charge": 20.0,
                "is_verified": True,
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        mock_client = AsyncMock()
        mock_client.put.return_value = mock_response

        # Patch the HTTP client
        monkeypatch.setattr(
            "polar.integrations.paystack.service.httpx.AsyncClient",
            lambda **kwargs: mock_client,
        )

        # Create PaystackService instance
        service = PaystackService()

        # Call update_subaccount method with only settlement_bank
        result = await service.update_subaccount(
            subaccount_code=subaccount_code,
            settlement_bank=settlement_bank,
        )

        # Verify that updated details are returned
        assert result["subaccount_code"] == subaccount_code
        assert result["settlement_bank"] == settlement_bank

        # Verify API was called with only the provided field
        mock_client.put.assert_called_once_with(
            f"/subaccount/{subaccount_code}",
            json={
                "settlement_bank": settlement_bank,
            },
        )

    @given(
        subaccount_code=st.text(min_size=10, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_15_subaccount_update_not_found(
        self, subaccount_code, monkeypatch
    ):
        """
        Feature: paystack-integration, Property 15: Subaccount Updates Propagate

        When attempting to update a non-existent subaccount, the service should
        raise an appropriate validation error.
        """
        # Mock 404 response from Paystack API
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.json.return_value = {
            "status": False,
            "message": "Subaccount not found",
        }

        mock_client = AsyncMock()
        mock_client.put.return_value = mock_response

        # Patch the HTTP client
        monkeypatch.setattr(
            "polar.integrations.paystack.service.httpx.AsyncClient",
            lambda **kwargs: mock_client,
        )

        # Create PaystackService instance
        service = PaystackService()

        # Call update_subaccount method and expect exception
        with pytest.raises(PaystackValidationError) as exc_info:
            await service.update_subaccount(
                subaccount_code=subaccount_code,
                settlement_bank="test_bank",
            )

        # Verify exception contains subaccount code
        assert subaccount_code in str(exc_info.value)

        # Verify API was called
        mock_client.put.assert_called_once()

    @given(
        subaccount_code=st.text(min_size=10, max_size=50),
        account_number=st.text(min_size=10, max_size=20),
    )
    @pytest.mark.asyncio
    async def test_property_15_subaccount_update_account_only(
        self, subaccount_code, account_number, monkeypatch
    ):
        """
        Feature: paystack-integration, Property 15: Subaccount Updates Propagate

        For any subaccount update with only account number provided, only the
        account number should be included in the API request.
        """
        # Mock successful Paystack API response
        mock_response_data = {
            "status": True,
            "message": "Subaccount updated successfully",
            "data": {
                "subaccount_code": subaccount_code,
                "business_name": "Test Business",
                "settlement_bank": "existing_bank",
                "account_number": account_number,
                "percentage_charge": 20.0,
                "is_verified": True,
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        mock_client = AsyncMock()
        mock_client.put.return_value = mock_response

        # Patch the HTTP client
        monkeypatch.setattr(
            "polar.integrations.paystack.service.httpx.AsyncClient",
            lambda **kwargs: mock_client,
        )

        # Create PaystackService instance
        service = PaystackService()

        # Call update_subaccount method with only account_number
        result = await service.update_subaccount(
            subaccount_code=subaccount_code,
            account_number=account_number,
        )

        # Verify that updated details are returned
        assert result["subaccount_code"] == subaccount_code
        assert result["account_number"] == account_number

        # Verify API was called with only the provided field
        mock_client.put.assert_called_once_with(
            f"/subaccount/{subaccount_code}",
            json={
                "account_number": account_number,
            },
        )

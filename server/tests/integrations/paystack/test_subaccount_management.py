"""Unit tests for Paystack subaccount management."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from polar.integrations.paystack.service import (
    PaystackNetworkError,
    PaystackService,
    PaystackTransactionError,
    PaystackValidationError,
)
from polar.organization.service import OrganizationError, OrganizationService


class TestPaystackSubaccountManagement:
    """Unit tests for Paystack subaccount management functionality."""

    class TestCreateSubaccount:
        """Tests for PaystackService.create_subaccount method."""

        @pytest.mark.asyncio
        async def test_successful_subaccount_creation(self, monkeypatch):
            """Test successful subaccount creation."""
            # Mock successful Paystack API response
            mock_response_data = {
                "status": True,
                "message": "Subaccount created",
                "data": {
                    "subaccount_code": "ACCT_TEST_123456",
                    "business_name": "Test Business",
                    "percentage_charge": 20.0,
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
                business_name="Test Business",
                percentage_charge=20.0,
            )

            # Verify result
            assert result["subaccount_code"] == "ACCT_TEST_123456"
            assert result["status"] == "active"
            assert result["business_name"] == "Test Business"
            assert result["percentage_charge"] == 20.0

            # Verify API was called correctly
            mock_client.post.assert_called_once_with(
                "/subaccount",
                json={
                    "business_name": "Test Business",
                    "percentage_charge": 20.0,
                },
            )

        @pytest.mark.asyncio
        async def test_subaccount_creation_with_settlement_details(self, monkeypatch):
            """Test subaccount creation with settlement bank and account number."""
            # Mock successful Paystack API response
            mock_response_data = {
                "status": True,
                "message": "Subaccount created",
                "data": {
                    "subaccount_code": "ACCT_TEST_789",
                    "business_name": "Test Business",
                    "percentage_charge": 20.0,
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

            # Call create_subaccount method with settlement details
            result = await service.create_subaccount(
                business_name="Test Business",
                settlement_bank="044",
                account_number="1234567890",
                percentage_charge=20.0,
            )

            # Verify result
            assert result["subaccount_code"] == "ACCT_TEST_789"
            assert result["status"] == "active"

            # Verify API was called with settlement details
            mock_client.post.assert_called_once_with(
                "/subaccount",
                json={
                    "business_name": "Test Business",
                    "settlement_bank": "044",
                    "account_number": "1234567890",
                    "percentage_charge": 20.0,
                },
            )

        @pytest.mark.asyncio
        async def test_failed_subaccount_creation(self, monkeypatch):
            """Test failed subaccount creation."""
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
                    business_name="Test Business",
                    percentage_charge=20.0,
                )

            assert "Subaccount creation failed" in str(exc_info.value)

        @pytest.mark.asyncio
        async def test_subaccount_creation_validation_error(self, monkeypatch):
            """Test subaccount creation with validation error."""
            # Mock validation error response
            mock_response_data = {
                "status": False,
                "message": "Business name is required",
            }

            mock_response = MagicMock()
            mock_response.status_code = 422
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

            # Call create_subaccount method and expect validation error
            with pytest.raises(PaystackValidationError) as exc_info:
                await service.create_subaccount(
                    business_name="",
                    percentage_charge=20.0,
                )

            assert "Business name is required" in str(exc_info.value)

    class TestUpdateSubaccount:
        """Tests for PaystackService.update_subaccount method."""

        @pytest.mark.asyncio
        async def test_successful_subaccount_update(self, monkeypatch):
            """Test successful subaccount update."""
            # Mock successful Paystack API response
            mock_response_data = {
                "status": True,
                "message": "Subaccount updated successfully",
                "data": {
                    "subaccount_code": "ACCT_TEST_123456",
                    "business_name": "Test Business",
                    "settlement_bank": "044",
                    "account_number": "1234567890",
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
                subaccount_code="ACCT_TEST_123456",
                settlement_bank="044",
                account_number="1234567890",
            )

            # Verify result
            assert result["subaccount_code"] == "ACCT_TEST_123456"
            assert result["settlement_bank"] == "044"
            assert result["account_number"] == "1234567890"

            # Verify API was called correctly
            mock_client.put.assert_called_once_with(
                "/subaccount/ACCT_TEST_123456",
                json={
                    "settlement_bank": "044",
                    "account_number": "1234567890",
                },
            )

        @pytest.mark.asyncio
        async def test_subaccount_update_not_found(self, monkeypatch):
            """Test subaccount update with non-existent subaccount."""
            # Mock 404 response
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

            # Call update_subaccount method and expect validation error
            with pytest.raises(PaystackValidationError) as exc_info:
                await service.update_subaccount(
                    subaccount_code="ACCT_NONEXISTENT",
                    settlement_bank="044",
                )

            assert "ACCT_NONEXISTENT" in str(exc_info.value)

        @pytest.mark.asyncio
        async def test_subaccount_partial_update(self, monkeypatch):
            """Test subaccount update with only some fields."""
            # Mock successful Paystack API response
            mock_response_data = {
                "status": True,
                "message": "Subaccount updated successfully",
                "data": {
                    "subaccount_code": "ACCT_TEST_123456",
                    "business_name": "Test Business",
                    "settlement_bank": "044",
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
                subaccount_code="ACCT_TEST_123456",
                settlement_bank="044",
            )

            # Verify result
            assert result["subaccount_code"] == "ACCT_TEST_123456"
            assert result["settlement_bank"] == "044"

            # Verify API was called with only the provided field
            mock_client.put.assert_called_once_with(
                "/subaccount/ACCT_TEST_123456",
                json={
                    "settlement_bank": "044",
                },
            )

    class TestOrganizationSubaccountCreation:
        """Tests for OrganizationService.create_organization_subaccount method."""

        @pytest.mark.asyncio
        async def test_successful_organization_subaccount_creation(
            self, session, organization
        ):
            """Test successful organization subaccount creation."""
            # Mock successful Paystack response
            mock_subaccount_data = {
                "subaccount_code": "ACCT_ORG_123456",
                "status": "active",
                "business_name": organization.name,
                "percentage_charge": 20.0,
            }

            with patch("polar.organization.service.paystack") as mock_paystack:
                mock_paystack.create_subaccount.return_value = mock_subaccount_data

                # Create OrganizationService instance
                service = OrganizationService()

                # Call create_organization_subaccount method
                updated_organization = await service.create_organization_subaccount(
                    session, organization
                )

                # Verify organization was updated
                assert updated_organization.subaccount_code == "ACCT_ORG_123456"
                assert updated_organization.subaccount_status == "active"

                # Verify Paystack service was called correctly
                mock_paystack.create_subaccount.assert_called_once_with(
                    business_name=organization.name,
                    percentage_charge=20.0,
                )

        @pytest.mark.asyncio
        async def test_failed_organization_subaccount_creation(
            self, session, organization
        ):
            """Test failed organization subaccount creation with error handling."""
            # Mock Paystack error
            error_message = "Subaccount creation failed"

            with patch("polar.organization.service.paystack") as mock_paystack:
                mock_paystack.create_subaccount.side_effect = PaystackTransactionError(
                    error_message
                )

                # Create OrganizationService instance
                service = OrganizationService()

                # Call create_organization_subaccount method and expect exception
                with pytest.raises(OrganizationError) as exc_info:
                    await service.create_organization_subaccount(session, organization)

                # Verify exception contains organization ID and error details
                assert str(organization.id) in str(exc_info.value)
                assert error_message in str(exc_info.value)

                # Verify organization status was set to failed
                await session.refresh(organization)
                assert organization.subaccount_status == "failed"

        @pytest.mark.asyncio
        async def test_organization_subaccount_creation_network_error(
            self, session, organization
        ):
            """Test organization subaccount creation with network error."""
            # Mock network error
            error_message = "Network error communicating with Paystack"

            with patch("polar.organization.service.paystack") as mock_paystack:
                mock_paystack.create_subaccount.side_effect = PaystackNetworkError(
                    error_message
                )

                # Create OrganizationService instance
                service = OrganizationService()

                # Call create_organization_subaccount method and expect exception
                with pytest.raises(OrganizationError) as exc_info:
                    await service.create_organization_subaccount(session, organization)

                # Verify exception contains error details
                assert error_message in str(exc_info.value)

                # Verify organization status was set to failed
                await session.refresh(organization)
                assert organization.subaccount_status == "failed"

    class TestSubaccountRetryLogic:
        """Tests for subaccount retry logic."""

        @pytest.mark.asyncio
        async def test_subaccount_creation_task_retry_on_failure(self):
            """Test that subaccount creation task retries on failure."""
            from polar.integrations.paystack.tasks import create_organization_subaccount

            organization_id = uuid4()

            # Mock organization service to raise an exception
            with patch(
                "polar.integrations.paystack.tasks.organization_service"
            ) as mock_org_service:
                mock_org_service.get.return_value = MagicMock(
                    id=organization_id, name="Test Org"
                )
                mock_org_service.create_organization_subaccount.side_effect = (
                    PaystackNetworkError("Network error")
                )

                # Mock can_retry to return True
                with patch(
                    "polar.integrations.paystack.tasks.can_retry", return_value=True
                ):
                    # Expect Retry exception to be raised
                    from dramatiq import Retry

                    with pytest.raises(Retry):
                        await create_organization_subaccount(organization_id)

        @pytest.mark.asyncio
        async def test_subaccount_creation_task_skip_if_exists(self):
            """Test that subaccount creation task skips if subaccount already exists."""
            from polar.integrations.paystack.tasks import create_organization_subaccount

            organization_id = uuid4()

            # Mock organization with existing active subaccount
            mock_organization = MagicMock()
            mock_organization.id = organization_id
            mock_organization.name = "Test Org"
            mock_organization.subaccount_code = "ACCT_EXISTING_123"
            mock_organization.subaccount_status = "active"

            with patch(
                "polar.integrations.paystack.tasks.organization_service"
            ) as mock_org_service:
                mock_org_service.get.return_value = mock_organization

                # Call task - should not raise exception and should not create subaccount
                await create_organization_subaccount(organization_id)

                # Verify create_organization_subaccount was not called
                mock_org_service.create_organization_subaccount.assert_not_called()

        @pytest.mark.asyncio
        async def test_subaccount_creation_task_organization_not_found(self):
            """Test subaccount creation task when organization is not found."""
            from polar.integrations.paystack.tasks import create_organization_subaccount

            organization_id = uuid4()

            with patch(
                "polar.integrations.paystack.tasks.organization_service"
            ) as mock_org_service:
                mock_org_service.get.return_value = None

                # Call task - should not raise exception
                await create_organization_subaccount(organization_id)

                # Verify create_organization_subaccount was not called
                mock_org_service.create_organization_subaccount.assert_not_called()

"""Unit tests for M-Pesa configuration endpoints and functionality.

This module contains unit tests for M-Pesa number validation, verification
transaction sending, verification success flow, verification failure flow,
and subaccount update with M-Pesa details.
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from pydantic import ValidationError

from polar.integrations.paystack.endpoints import (
    MPesaConfigurationRequest,
    configure_mpesa,
    verify_mpesa,
)
from polar.integrations.paystack.service import (
    PaystackService,
    PaystackTransactionError,
)
from polar.models.organization import Organization, PayoutMethod


class TestMPesaNumberValidation:
    """Unit tests for M-Pesa number format validation."""

    def test_valid_mpesa_numbers(self) -> None:
        """Test that valid M-Pesa numbers are accepted."""
        valid_numbers = [
            "+254712345678",  # Standard mobile
            "+254722345678",  # Safaricom
            "+254733345678",  # Airtel
            "+254700000000",  # Edge case with zeros
            "+254799999999",  # Edge case with nines
            "+254101234567",  # Special number starting with 1
        ]

        for number in valid_numbers:
            request = MPesaConfigurationRequest(mpesa_number=number)
            assert request.mpesa_number == number

    def test_invalid_mpesa_numbers(self) -> None:
        """Test that invalid M-Pesa numbers are rejected."""
        invalid_numbers = [
            "+254812345678",  # Starts with 8 (invalid)
            "+254012345678",  # Starts with 0 (invalid)
            "+25471234567",  # Too short
            "+2547123456789",  # Too long
            "254712345678",  # Missing +
            "",  # Empty
            "+254",  # Just country code
            "invalid",  # Not a number
            "+255712345678",  # Wrong country code (Tanzania)
            "+256712345678",  # Wrong country code (Uganda)
        ]

        for number in invalid_numbers:
            with pytest.raises(ValidationError):
                MPesaConfigurationRequest(mpesa_number=number)

    def test_mpesa_number_cleaning(self) -> None:
        """Test that M-Pesa numbers with spaces and dashes are cleaned."""
        test_cases = [
            ("+254 712 345 678", "+254712345678"),
            ("+254-712-345-678", "+254712345678"),
            ("+254 712-345 678", "+254712345678"),
            ("+254  712  345  678", "+254712345678"),
        ]

        for input_number, expected in test_cases:
            request = MPesaConfigurationRequest(mpesa_number=input_number)
            assert request.mpesa_number == expected


class TestMPesaVerificationTransaction:
    """Unit tests for M-Pesa verification transaction sending."""

    @pytest.mark.asyncio
    async def test_successful_verification_transaction(self) -> None:
        """Test successful M-Pesa verification transaction sending."""
        mpesa_number = "+254712345678"
        amount = 1000  # KES 10 in kobo

        # Mock successful Paystack API response
        mock_response_data = {
            "status": True,
            "message": "Transfer has been queued",
            "data": {
                "reference": "mpesa_verify_test123",
                "transfer_code": "TRF_test123",
                "status": "pending",
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_unit_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Call send_verification_transaction
            result = await service.send_verification_transaction(
                mpesa_number=mpesa_number,
                amount=amount,
            )

            # Verify result structure. The service returns the *transfer*
            # status from Paystack's data block (queued/pending/failed),
            # NOT the top-level HTTP success boolean — so the assertion
            # is against "pending" (matching the mocked data.status).
            assert result["status"] == "pending"
            assert "reference" in result
            assert "transfer_code" in result
            # Service generates its own reference and ignores the inbound
            # data.reference; verify the brand-prefixed format
            # (blyss_verify_<hex>) so this stays in sync with the real
            # reference returned to the caller.
            assert result["reference"].startswith("blyss_verify_")

            # Verify API call parameters
            service._client.post.assert_called_once()
            call_args = service._client.post.call_args

            # Verify endpoint
            assert call_args[0][0] == "/transfer"

            # Verify payload
            payload = call_args[1]["json"]
            assert payload["recipient"] == mpesa_number
            assert payload["amount"] == amount
            assert payload["source"] == "balance"
            assert "reference" in payload
            assert payload["reference"].startswith("blyss_verify_")

    @pytest.mark.asyncio
    async def test_default_verification_amount(self) -> None:
        """Test that default amount of KES 10 (1000 kobo) is used."""
        mpesa_number = "+254712345678"

        mock_response_data = {
            "status": True,
            "message": "Transfer has been queued",
            "data": {
                "reference": "mpesa_verify_test123",
                "transfer_code": "TRF_test123",
                "status": "pending",
            },
        }

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_unit_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Call without specifying amount (should default to 1000)
            result = await service.send_verification_transaction(
                mpesa_number=mpesa_number,
            )

            # Verify result. Status is the Paystack transfer status from
            # data.status — NOT the top-level HTTP success boolean.
            assert result["status"] == "pending"

            # Verify default amount was used
            call_args = service._client.post.call_args
            payload = call_args[1]["json"]
            assert payload["amount"] == 1000  # Default KES 10 in kobo

    @pytest.mark.asyncio
    async def test_failed_verification_transaction(self) -> None:
        """Test failed M-Pesa verification transaction."""
        mpesa_number = "+254712345678"

        # Mock failed Paystack API response
        mock_error_response = {
            "status": False,
            "message": "Insufficient balance",
            "data": None,
        }

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = mock_error_response

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_unit_test"

            service = PaystackService()
            service._client.post = AsyncMock(return_value=mock_response)

            # Should raise PaystackTransactionError
            with pytest.raises(PaystackTransactionError) as exc_info:
                await service.send_verification_transaction(
                    mpesa_number=mpesa_number,
                )

            # Verify error message
            assert "Insufficient balance" in str(exc_info.value)


class TestMPesaConfigurationEndpoint:
    """Unit tests for M-Pesa configuration endpoint."""

    @pytest.mark.asyncio
    async def test_successful_mpesa_configuration(self) -> None:
        """Test successful M-Pesa configuration."""
        organization_id = uuid4()
        mpesa_number = "+254712345678"

        # Create mock organization
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = "Test Organization"
        mock_organization.mpesa_number = None
        mock_organization.mpesa_verified = False
        mock_organization.subaccount_code = "ACCT_test123"

        # Mock updated organization
        mock_updated_organization = MagicMock(spec=Organization)
        mock_updated_organization.id = organization_id
        mock_updated_organization.name = "Test Organization"
        mock_updated_organization.mpesa_number = mpesa_number
        mock_updated_organization.mpesa_verified = False
        mock_updated_organization.payout_method = PayoutMethod.MPESA

        # Mock repository
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=mock_organization)
        mock_repository.update = AsyncMock(return_value=mock_updated_organization)

        # Mock PaystackService
        mock_paystack_service = MagicMock()
        mock_paystack_service.send_verification_transaction = AsyncMock(
            return_value={
                "reference": "mpesa_verify_test123",
                "status": "pending",
            }
        )

        # Mock request and auth
        mock_request = MPesaConfigurationRequest(mpesa_number=mpesa_number)
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

            # Call the endpoint
            result = await configure_mpesa(
                id=organization_id,
                request=mock_request,
                auth_subject=mock_auth_subject,
                session=MagicMock(),
            )

            # Verify verification transaction was sent
            mock_paystack_service.send_verification_transaction.assert_called_once_with(
                mpesa_number=mpesa_number
            )

            # Verify organization was updated
            mock_repository.update.assert_called_once()
            update_call = mock_repository.update.call_args
            update_dict = update_call[1]["update_dict"]

            assert update_dict["mpesa_number"] == mpesa_number
            assert update_dict["mpesa_verified"] is False
            assert update_dict["payout_method"] == PayoutMethod.MPESA

            # Verify result
            assert result == mock_updated_organization

    @pytest.mark.asyncio
    async def test_mpesa_configuration_organization_not_found(self) -> None:
        """Test M-Pesa configuration with non-existent organization."""
        organization_id = uuid4()
        mpesa_number = "+254712345678"

        # Mock repository that returns None
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=None)

        # Mock request and auth
        mock_request = MPesaConfigurationRequest(mpesa_number=mpesa_number)
        mock_auth_subject = MagicMock()

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.ResourceNotFound"
            ) as mock_not_found,
        ):
            mock_repo_class.from_session.return_value = mock_repository

            # Should raise ResourceNotFound
            with pytest.raises(Exception):  # ResourceNotFound will be raised
                await configure_mpesa(
                    id=organization_id,
                    request=mock_request,
                    auth_subject=mock_auth_subject,
                    session=MagicMock(),
                )

    @pytest.mark.asyncio
    async def test_mpesa_configuration_verification_failure(self) -> None:
        """Test M-Pesa configuration when verification transaction fails."""
        organization_id = uuid4()
        mpesa_number = "+254712345678"

        # Create mock organization
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = "Test Organization"

        # Mock repository
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=mock_organization)

        # Mock PaystackService that fails
        mock_paystack_service = MagicMock()
        mock_paystack_service.send_verification_transaction = AsyncMock(
            side_effect=PaystackTransactionError("Insufficient balance")
        )

        # Mock request and auth
        mock_request = MPesaConfigurationRequest(mpesa_number=mpesa_number)
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
                "polar.integrations.paystack.endpoints.HTTPException"
            ) as mock_http_exception,
        ):
            mock_repo_class.from_session.return_value = mock_repository

            # Should raise HTTPException
            with pytest.raises(Exception):  # HTTPException will be raised
                await configure_mpesa(
                    id=organization_id,
                    request=mock_request,
                    auth_subject=mock_auth_subject,
                    session=MagicMock(),
                )


class TestMPesaVerificationEndpoint:
    """Unit tests for M-Pesa verification endpoint."""

    @pytest.mark.asyncio
    async def test_successful_mpesa_verification(self) -> None:
        """Test successful M-Pesa verification."""
        organization_id = uuid4()
        mpesa_number = "+254712345678"
        subaccount_code = "ACCT_test123"

        # Create mock organization with unverified M-Pesa
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = "Test Organization"
        mock_organization.mpesa_number = mpesa_number
        mock_organization.mpesa_verified = False
        mock_organization.subaccount_code = subaccount_code

        # Mock updated organization after verification
        mock_updated_organization = MagicMock(spec=Organization)
        mock_updated_organization.id = organization_id
        mock_updated_organization.name = "Test Organization"
        mock_updated_organization.mpesa_number = mpesa_number
        mock_updated_organization.mpesa_verified = True
        mock_updated_organization.subaccount_code = subaccount_code

        # Mock repository
        mock_repository = MagicMock()
        mock_repository.get_by_id = AsyncMock(return_value=mock_organization)
        mock_repository.update = AsyncMock(return_value=mock_updated_organization)

        # Mock PaystackService
        mock_paystack_service = MagicMock()
        mock_paystack_service.update_subaccount = AsyncMock(
            return_value={
                "status": True,
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

            # Call the endpoint
            result = await verify_mpesa(
                id=organization_id,
                auth_subject=mock_auth_subject,
                session=MagicMock(),
            )

            # Verify organization was updated with verified status
            mock_repository.update.assert_called_once()
            update_call = mock_repository.update.call_args
            update_dict = update_call[1]["update_dict"]
            assert update_dict["mpesa_verified"] is True

            # Verify subaccount was updated
            mock_paystack_service.update_subaccount.assert_called_once_with(
                subaccount_code=subaccount_code,
                settlement_bank="mpesa",
                account_number=mpesa_number,
            )

            # Verify result
            assert result == mock_updated_organization

    @pytest.mark.asyncio
    async def test_mpesa_verification_no_mpesa_configured(self) -> None:
        """Test M-Pesa verification when no M-Pesa number is configured."""
        organization_id = uuid4()

        # Create mock organization without M-Pesa number
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = "Test Organization"
        mock_organization.mpesa_number = None
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

            # Should raise HTTPException for missing M-Pesa number
            with pytest.raises(Exception):  # HTTPException will be raised
                await verify_mpesa(
                    id=organization_id,
                    auth_subject=mock_auth_subject,
                    session=MagicMock(),
                )

    @pytest.mark.asyncio
    async def test_mpesa_verification_already_verified(self) -> None:
        """Test M-Pesa verification when already verified."""
        organization_id = uuid4()
        mpesa_number = "+254712345678"

        # Create mock organization with already verified M-Pesa
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = "Test Organization"
        mock_organization.mpesa_number = mpesa_number
        mock_organization.mpesa_verified = True

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

            # Call the endpoint
            result = await verify_mpesa(
                id=organization_id,
                auth_subject=mock_auth_subject,
                session=MagicMock(),
            )

            # Verify no update was called for already verified M-Pesa
            mock_repository.update.assert_not_called()

            # Verify no Paystack API call was made
            mock_paystack_service.update_subaccount.assert_not_called()

            # Verify result is the current organization
            assert result == mock_organization

    @pytest.mark.asyncio
    async def test_mpesa_verification_subaccount_update_failure(self) -> None:
        """Test M-Pesa verification when subaccount update fails."""
        organization_id = uuid4()
        mpesa_number = "+254712345678"
        subaccount_code = "ACCT_test123"

        # Create mock organization with unverified M-Pesa
        mock_organization = MagicMock(spec=Organization)
        mock_organization.id = organization_id
        mock_organization.name = "Test Organization"
        mock_organization.mpesa_number = mpesa_number
        mock_organization.mpesa_verified = False
        mock_organization.subaccount_code = subaccount_code

        # Mock updated organization after verification
        mock_updated_organization = MagicMock(spec=Organization)
        mock_updated_organization.id = organization_id
        mock_updated_organization.name = "Test Organization"
        mock_updated_organization.mpesa_number = mpesa_number
        mock_updated_organization.mpesa_verified = True
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

            # Call the endpoint
            result = await verify_mpesa(
                id=organization_id,
                auth_subject=mock_auth_subject,
                session=MagicMock(),
            )

            # Verify M-Pesa was still marked as verified
            mock_repository.update.assert_called_once()
            update_call = mock_repository.update.call_args
            update_dict = update_call[1]["update_dict"]
            assert update_dict["mpesa_verified"] is True

            # Verify error was logged
            mock_log.error.assert_called_once()

            # Verify result is still the updated organization
            assert result == mock_updated_organization


class TestSubaccountUpdateWithMPesa:
    """Unit tests for subaccount update with M-Pesa details."""

    @pytest.mark.asyncio
    async def test_successful_subaccount_update_with_mpesa(self) -> None:
        """Test successful subaccount update with M-Pesa details."""
        subaccount_code = "ACCT_test123"
        mpesa_number = "+254712345678"

        # Mock successful Paystack API response
        mock_response_data = {
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
        mock_response.json.return_value = mock_response_data

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_unit_test"

            service = PaystackService()
            service._client.put = AsyncMock(return_value=mock_response)

            # Call update_subaccount with M-Pesa details
            result = await service.update_subaccount(
                subaccount_code=subaccount_code,
                settlement_bank="mpesa",
                account_number=mpesa_number,
            )

            # Verify result
            assert result["status"] is True
            assert result["data"]["settlement_bank"] == "mpesa"
            assert result["data"]["account_number"] == mpesa_number

            # Verify API call parameters
            service._client.put.assert_called_once()
            call_args = service._client.put.call_args

            # Verify endpoint
            assert call_args[0][0] == f"/subaccount/{subaccount_code}"

            # Verify payload
            payload = call_args[1]["json"]
            assert payload["settlement_bank"] == "mpesa"
            assert payload["account_number"] == mpesa_number

    @pytest.mark.asyncio
    async def test_failed_subaccount_update_with_mpesa(self) -> None:
        """Test failed subaccount update with M-Pesa details."""
        subaccount_code = "ACCT_test123"
        mpesa_number = "+254712345678"

        # Mock failed Paystack API response
        mock_error_response = {
            "status": False,
            "message": "Invalid settlement bank",
            "data": None,
        }

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = mock_error_response

        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.log"),
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            mock_settings.PAYSTACK_SECRET_KEY = "sk_test_unit_test"

            service = PaystackService()
            service._client.put = AsyncMock(return_value=mock_response)

            # Should raise PaystackTransactionError
            with pytest.raises(PaystackTransactionError) as exc_info:
                await service.update_subaccount(
                    subaccount_code=subaccount_code,
                    settlement_bank="mpesa",
                    account_number=mpesa_number,
                )

            # Verify error message
            assert "Invalid settlement bank" in str(exc_info.value)

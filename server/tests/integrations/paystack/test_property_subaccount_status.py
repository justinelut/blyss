"""Property-based tests for Paystack subaccount status tracking."""

from unittest.mock import patch

import pytest
from hypothesis import given
from hypothesis import strategies as st

from polar.integrations.paystack.service import PaystackTransactionError
from polar.organization.service import OrganizationError, OrganizationService


class TestPaystackSubaccountStatusProperties:
    """Property-based tests for Paystack subaccount status tracking functionality."""

    @given(
        organization_name=st.text(min_size=1, max_size=100),
        subaccount_code=st.text(min_size=10, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_13_subaccount_status_tracking_success(
        self, organization_name, subaccount_code, session, organization
    ):
        """
        Feature: paystack-integration, Property 13: Subaccount Status Tracking

        For any organization, the subaccount_status field should always contain
        a valid status value (pending, active, or failed), and successful
        subaccount creation should set status to active or pending.
        """
        # Mock successful Paystack API response
        mock_subaccount_data = {
            "subaccount_code": subaccount_code,
            "status": "active",
            "business_name": organization_name,
            "percentage_charge": 20.0,
        }

        # Mock the paystack service
        with patch("polar.organization.service.paystack") as mock_paystack:
            mock_paystack.create_subaccount.return_value = mock_subaccount_data

            # Create OrganizationService instance
            service = OrganizationService()

            # Set organization name for the test
            organization.name = organization_name

            # Call create_organization_subaccount method
            updated_organization = await service.create_organization_subaccount(
                session, organization
            )

            # Verify that subaccount_status is set to a valid value
            assert updated_organization.subaccount_status in [
                "pending",
                "active",
                "failed",
            ]
            assert updated_organization.subaccount_status == "active"

            # Verify that subaccount_code is set
            assert updated_organization.subaccount_code == subaccount_code

            # Verify Paystack service was called with correct parameters
            mock_paystack.create_subaccount.assert_called_once_with(
                business_name=organization_name,
                percentage_charge=20.0,
            )

    @given(
        organization_name=st.text(min_size=1, max_size=100),
    )
    @pytest.mark.asyncio
    async def test_property_13_subaccount_status_tracking_failure(
        self, organization_name, session, organization
    ):
        """
        Feature: paystack-integration, Property 13: Subaccount Status Tracking

        For any organization, when subaccount creation fails, the status should
        be set to 'failed' and the error should be handled appropriately.
        """
        # Mock failed Paystack API response
        error_message = "Subaccount creation failed"

        # Mock the paystack service to raise an exception
        with patch("polar.organization.service.paystack") as mock_paystack:
            mock_paystack.create_subaccount.side_effect = PaystackTransactionError(
                error_message
            )

            # Create OrganizationService instance
            service = OrganizationService()

            # Set organization name for the test
            organization.name = organization_name

            # Call create_organization_subaccount method and expect exception
            with pytest.raises(OrganizationError) as exc_info:
                await service.create_organization_subaccount(session, organization)

            # Verify exception contains organization ID and error details
            assert str(organization.id) in str(exc_info.value)
            assert error_message in str(exc_info.value)

            # Verify that subaccount_status is set to 'failed'
            await session.refresh(organization)
            assert organization.subaccount_status == "failed"

            # Verify Paystack service was called
            mock_paystack.create_subaccount.assert_called_once()

    @given(
        organization_name=st.text(min_size=1, max_size=100),
        subaccount_code=st.text(min_size=10, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_13_subaccount_status_valid_values_only(
        self, organization_name, subaccount_code, session, organization
    ):
        """
        Feature: paystack-integration, Property 13: Subaccount Status Tracking

        For any organization, the subaccount_status field should only ever
        contain valid enum values: pending, active, or failed.
        """
        # Test with pending status
        mock_subaccount_data_pending = {
            "subaccount_code": subaccount_code,
            "status": "pending",
            "business_name": organization_name,
            "percentage_charge": 20.0,
        }

        with patch("polar.organization.service.paystack") as mock_paystack:
            mock_paystack.create_subaccount.return_value = mock_subaccount_data_pending

            service = OrganizationService()
            organization.name = organization_name

            updated_organization = await service.create_organization_subaccount(
                session, organization
            )

            # Verify status is valid
            assert updated_organization.subaccount_status in [
                "pending",
                "active",
                "failed",
            ]
            assert updated_organization.subaccount_status == "pending"

        # Test with active status
        mock_subaccount_data_active = {
            "subaccount_code": subaccount_code + "_active",
            "status": "active",
            "business_name": organization_name,
            "percentage_charge": 20.0,
        }

        with patch("polar.organization.service.paystack") as mock_paystack:
            mock_paystack.create_subaccount.return_value = mock_subaccount_data_active

            service = OrganizationService()

            updated_organization = await service.create_organization_subaccount(
                session, organization
            )

            # Verify status is valid
            assert updated_organization.subaccount_status in [
                "pending",
                "active",
                "failed",
            ]
            assert updated_organization.subaccount_status == "active"

    @given(
        organization_name=st.text(min_size=1, max_size=100),
    )
    @pytest.mark.asyncio
    async def test_property_13_subaccount_status_network_error_handling(
        self, organization_name, session, organization
    ):
        """
        Feature: paystack-integration, Property 13: Subaccount Status Tracking

        For any organization, when network errors occur during subaccount creation,
        the status should be set to 'failed' and the error should be logged.
        """
        # Mock network error
        from polar.integrations.paystack.service import PaystackNetworkError

        error_message = "Network error communicating with Paystack"

        # Mock the paystack service to raise a network error
        with patch("polar.organization.service.paystack") as mock_paystack:
            mock_paystack.create_subaccount.side_effect = PaystackNetworkError(
                error_message
            )

            # Create OrganizationService instance
            service = OrganizationService()

            # Set organization name for the test
            organization.name = organization_name

            # Call create_organization_subaccount method and expect exception
            with pytest.raises(OrganizationError) as exc_info:
                await service.create_organization_subaccount(session, organization)

            # Verify exception contains organization ID and error details
            assert str(organization.id) in str(exc_info.value)
            assert error_message in str(exc_info.value)

            # Verify that subaccount_status is set to 'failed'
            await session.refresh(organization)
            assert organization.subaccount_status == "failed"

            # Verify Paystack service was called
            mock_paystack.create_subaccount.assert_called_once()

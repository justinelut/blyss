"""Property-based tests for Paystack subaccount business name matching."""

from unittest.mock import patch

import pytest
from hypothesis import given
from hypothesis import strategies as st

from polar.organization.service import OrganizationService


class TestPaystackBusinessNameMatchingProperties:
    """Property-based tests for Paystack subaccount business name matching functionality."""

    @given(
        organization_name=st.text(min_size=1, max_size=100),
        subaccount_code=st.text(min_size=10, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_14_subaccount_business_name_matches_organization(
        self, organization_name, subaccount_code, session, organization
    ):
        """
        Feature: paystack-integration, Property 14: Subaccount Business Name Matches Organization

        For any organization with a subaccount, the subaccount's business name
        should match the organization's name.
        """
        # Mock successful Paystack API response
        mock_subaccount_data = {
            "subaccount_code": subaccount_code,
            "status": "active",
            "business_name": organization_name,  # Should match organization name
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

            # Verify that Paystack service was called with organization name as business_name
            mock_paystack.create_subaccount.assert_called_once_with(
                business_name=organization_name,
                percentage_charge=20.0,
            )

            # Verify that the organization name matches what was sent to Paystack
            call_args = mock_paystack.create_subaccount.call_args
            assert call_args.kwargs["business_name"] == organization.name

            # Verify subaccount was created successfully
            assert updated_organization.subaccount_code == subaccount_code
            assert updated_organization.subaccount_status == "active"

    @given(
        organization_name=st.text(min_size=1, max_size=100),
        different_business_name=st.text(min_size=1, max_size=100),
        subaccount_code=st.text(min_size=10, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_14_business_name_consistency_check(
        self,
        organization_name,
        different_business_name,
        subaccount_code,
        session,
        organization,
    ):
        """
        Feature: paystack-integration, Property 14: Subaccount Business Name Matches Organization

        For any organization, the business name sent to Paystack should always
        be the organization's name, not any other value.
        """
        # Ensure the names are different for this test
        if organization_name == different_business_name:
            different_business_name = organization_name + "_different"

        # Mock successful Paystack API response
        mock_subaccount_data = {
            "subaccount_code": subaccount_code,
            "status": "active",
            "business_name": organization_name,  # Paystack returns the name we sent
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
            await service.create_organization_subaccount(session, organization)

            # Verify that Paystack service was called with the organization name,
            # NOT the different business name
            mock_paystack.create_subaccount.assert_called_once_with(
                business_name=organization_name,  # Should be organization name
                percentage_charge=20.0,
            )

            # Verify the call was NOT made with the different business name
            call_args = mock_paystack.create_subaccount.call_args
            assert call_args.kwargs["business_name"] != different_business_name
            assert call_args.kwargs["business_name"] == organization_name

    @given(
        organization_name=st.text(min_size=1, max_size=100),
    )
    @pytest.mark.asyncio
    async def test_property_14_business_name_exact_match(
        self, organization_name, session, organization
    ):
        """
        Feature: paystack-integration, Property 14: Subaccount Business Name Matches Organization

        For any organization name (including special characters, spaces, etc.),
        the exact organization name should be passed to Paystack as business_name.
        """
        # Mock successful Paystack API response
        mock_subaccount_data = {
            "subaccount_code": "ACCT_TEST_123",
            "status": "active",
            "business_name": organization_name,
            "percentage_charge": 20.0,
        }

        # Mock the paystack service
        with patch("polar.organization.service.paystack") as mock_paystack:
            mock_paystack.create_subaccount.return_value = mock_subaccount_data

            # Create OrganizationService instance
            service = OrganizationService()

            # Set organization name for the test (including any special characters)
            organization.name = organization_name

            # Call create_organization_subaccount method
            await service.create_organization_subaccount(session, organization)

            # Verify that the exact organization name was passed to Paystack
            mock_paystack.create_subaccount.assert_called_once_with(
                business_name=organization_name,  # Exact match required
                percentage_charge=20.0,
            )

            # Verify no transformation or sanitization was applied to the name
            call_args = mock_paystack.create_subaccount.call_args
            assert call_args.kwargs["business_name"] == organization_name

    @given(
        organization_name=st.text(min_size=1, max_size=100),
        subaccount_code=st.text(min_size=10, max_size=50),
    )
    @pytest.mark.asyncio
    async def test_property_14_business_name_parameter_validation(
        self, organization_name, subaccount_code, session, organization
    ):
        """
        Feature: paystack-integration, Property 14: Subaccount Business Name Matches Organization

        For any organization, the business_name parameter should be required
        and should always be the organization's name.
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
            await service.create_organization_subaccount(session, organization)

            # Verify that business_name parameter was provided
            call_args = mock_paystack.create_subaccount.call_args
            assert "business_name" in call_args.kwargs
            assert call_args.kwargs["business_name"] is not None
            assert call_args.kwargs["business_name"] != ""
            assert call_args.kwargs["business_name"] == organization_name

            # Verify other required parameters are also present
            assert "percentage_charge" in call_args.kwargs
            assert call_args.kwargs["percentage_charge"] == 20.0

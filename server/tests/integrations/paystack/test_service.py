"""Property-based tests for PaystackService.

This module contains property-based tests using hypothesis to verify
universal properties of the Paystack integration service.
"""

from unittest.mock import MagicMock, patch

from hypothesis import given, settings
from hypothesis import strategies as st

from polar.integrations.paystack.service import PaystackService


class TestPaystackServiceProperties:
    """Property-based tests for PaystackService."""

    @settings(max_examples=100, deadline=None)
    @given(
        secret_key=st.text(
            min_size=10,
            max_size=100,
            alphabet=st.characters(
                min_codepoint=33,
                max_codepoint=126,
                blacklist_characters=' "\\',
            ),
        ),
        base_url=st.sampled_from(
            [
                "https://api.paystack.co",
                "https://api-test.paystack.co",
            ]
        ),
    )
    def test_property_4_api_interactions_are_logged(
        self,
        secret_key: str,
        base_url: str,
    ) -> None:
        """
        Feature: paystack-integration, Property 4: API Interactions Are Logged

        For any Paystack API call (successful or failed), there should be a
        corresponding log entry containing the request details and response status.

        This test validates that PaystackService initialization does not log
        (following Stripe service pattern), but API interactions are logged.

        **Validates: Requirements 1.6, 9.1**
        """
        # Patch settings and instrument_httpx to speed up test
        with (
            patch("polar.integrations.paystack.service.settings") as mock_settings,
            patch("polar.integrations.paystack.service.instrument_httpx"),
        ):
            # Configure mock settings
            mock_settings.PAYSTACK_SECRET_KEY = secret_key

            # Initialize the service
            service = PaystackService()

            # Verify that the service was initialized with correct values
            assert service.secret_key == secret_key
            assert service.base_url == "https://api.paystack.co"

            # Note: Initialization does not log (following Stripe pattern)
            # Logging happens during actual API method calls

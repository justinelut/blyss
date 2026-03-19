"""
Property tests for Paystack webhook signature verification.

Feature: paystack-integration
Property 5: Webhook Signature Verification
Validates: Requirements 2.2, 2.3
"""

import hashlib
import hmac
import json
from typing import Any

import pytest
from fastapi import HTTPException
from hypothesis import given
from hypothesis import strategies as st

from polar.integrations.paystack.endpoints import PaystackWebhookEventGetter


class MockRequest:
    """Mock request object for testing."""

    def __init__(self, payload: bytes, signature: str):
        self._payload = payload
        self._signature = signature

    async def body(self) -> bytes:
        """Return the request payload."""
        return self._payload

    @property
    def headers(self) -> dict[str, str]:
        """Return request headers."""
        return {"x-paystack-signature": self._signature}


class TestWebhookSignatureVerification:
    """Property tests for webhook signature verification."""

    @given(
        payload_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=10,
        ),
        webhook_secret=st.text(min_size=10, max_size=100),
    )
    async def test_property_5_webhook_signature_verification_valid(
        self, payload_data: dict[str, Any], webhook_secret: str
    ):
        """
        Feature: paystack-integration, Property 5: Webhook Signature Verification

        For any webhook payload with a valid signature, the webhook endpoint should
        accept and process it; for any payload with an invalid signature, the endpoint
        should reject it with HTTP 401.
        """
        # Arrange
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        webhook_getter = PaystackWebhookEventGetter(webhook_secret)
        valid_request = MockRequest(payload_bytes, valid_signature)

        # Act & Assert - Valid signature should not raise exception
        try:
            result = await webhook_getter(valid_request)
            # Should successfully parse if payload has required structure
            if "event" in payload_data and "data" in payload_data:
                assert isinstance(result, dict)
                assert result == payload_data
        except HTTPException as e:
            # Should only fail due to payload structure, not signature
            assert e.status_code != 401, "Valid signature should not result in 401"

    @given(
        payload_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=10,
        ),
        webhook_secret=st.text(min_size=10, max_size=100),
        invalid_signature=st.text(min_size=1, max_size=200),
    )
    async def test_property_5_webhook_signature_verification_invalid(
        self, payload_data: dict[str, Any], webhook_secret: str, invalid_signature: str
    ):
        """
        Feature: paystack-integration, Property 5: Webhook Signature Verification

        For any webhook payload with an invalid signature, the endpoint should
        reject it with HTTP 401.
        """
        # Arrange
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature to ensure invalid_signature is actually invalid
        valid_signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        # Skip test if invalid_signature happens to match valid signature
        if invalid_signature == valid_signature:
            return

        webhook_getter = PaystackWebhookEventGetter(webhook_secret)
        invalid_request = MockRequest(payload_bytes, invalid_signature)

        # Act & Assert - Invalid signature should raise 401
        with pytest.raises(HTTPException) as exc_info:
            await webhook_getter(invalid_request)

        assert exc_info.value.status_code == 401
        assert "Invalid signature" in str(exc_info.value.detail)

    @given(
        payload_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=10,
        ),
        webhook_secret=st.text(min_size=10, max_size=100),
    )
    async def test_property_5_webhook_signature_verification_missing(
        self, payload_data: dict[str, Any], webhook_secret: str
    ):
        """
        Feature: paystack-integration, Property 5: Webhook Signature Verification

        For any webhook payload with no signature, the endpoint should reject it with HTTP 401.
        """
        # Arrange
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        webhook_getter = PaystackWebhookEventGetter(webhook_secret)
        no_signature_request = MockRequest(payload_bytes, "")

        # Act & Assert - Missing signature should raise 401
        with pytest.raises(HTTPException) as exc_info:
            await webhook_getter(no_signature_request)

        assert exc_info.value.status_code == 401
        assert "Invalid signature" in str(exc_info.value.detail)

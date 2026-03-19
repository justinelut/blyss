"""
Property tests for Paystack webhook event parsing.

Feature: paystack-integration
Property 6: Webhook Event Parsing
Validates: Requirements 2.4
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


class TestWebhookEventParsing:
    """Property tests for webhook event parsing."""

    @given(
        event_type=st.text(min_size=1, max_size=50),
        event_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=10,
        ),
        webhook_secret=st.text(min_size=10, max_size=100),
    )
    async def test_property_6_webhook_event_parsing_valid_structure(
        self, event_type: str, event_data: dict[str, Any], webhook_secret: str
    ):
        """
        Feature: paystack-integration, Property 6: Webhook Event Parsing

        For any valid webhook request, the platform should successfully parse
        the event type and payload data without errors.
        """
        # Arrange - Create valid webhook payload structure
        payload_data = {"event": event_type, "data": event_data}
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        webhook_getter = PaystackWebhookEventGetter(webhook_secret)
        request = MockRequest(payload_bytes, valid_signature)

        # Act
        result = await webhook_getter(request)

        # Assert - Should successfully parse event type and data
        assert isinstance(result, dict)
        assert result["event"] == event_type
        assert result["data"] == event_data
        assert result == payload_data

    @given(
        invalid_payload=st.one_of(
            st.text(),  # Plain text instead of JSON
            st.integers(),  # Integer instead of dict
            st.lists(st.text()),  # List instead of dict
        ),
        webhook_secret=st.text(min_size=10, max_size=100),
    )
    async def test_property_6_webhook_event_parsing_invalid_json(
        self, invalid_payload: Any, webhook_secret: str
    ):
        """
        Feature: paystack-integration, Property 6: Webhook Event Parsing

        For any webhook request with invalid JSON, the platform should reject it
        with appropriate error.
        """
        # Arrange - Create invalid JSON payload
        if isinstance(invalid_payload, str):
            # Ensure it's not valid JSON by making it malformed
            payload_bytes = f"invalid_json_{invalid_payload}".encode()
        else:
            payload_bytes = str(invalid_payload).encode("utf-8")

        # Generate valid signature for invalid payload
        valid_signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        webhook_getter = PaystackWebhookEventGetter(webhook_secret)
        request = MockRequest(payload_bytes, valid_signature)

        # Act & Assert - Should raise HTTPException for invalid JSON
        with pytest.raises(HTTPException) as exc_info:
            await webhook_getter(request)

        assert exc_info.value.status_code == 400
        assert "Invalid JSON payload" in str(exc_info.value.detail)

    @given(
        payload_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=0,
            max_size=10,
        ).filter(
            lambda d: "event" not in d or "data" not in d
        ),  # Ensure missing required fields
        webhook_secret=st.text(min_size=10, max_size=100),
    )
    async def test_property_6_webhook_event_parsing_invalid_structure(
        self, payload_data: dict[str, Any], webhook_secret: str
    ):
        """
        Feature: paystack-integration, Property 6: Webhook Event Parsing

        For any webhook request with invalid payload structure (missing 'event' or 'data'),
        the platform should reject it with appropriate error.
        """
        # Arrange - Payload missing required fields
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        webhook_getter = PaystackWebhookEventGetter(webhook_secret)
        request = MockRequest(payload_bytes, valid_signature)

        # Act & Assert - Should raise HTTPException for invalid structure
        with pytest.raises(HTTPException) as exc_info:
            await webhook_getter(request)

        assert exc_info.value.status_code == 400
        assert "Invalid payload structure" in str(exc_info.value.detail)

    @given(webhook_secret=st.text(min_size=10, max_size=100))
    async def test_property_6_webhook_event_parsing_empty_payload(
        self, webhook_secret: str
    ):
        """
        Feature: paystack-integration, Property 6: Webhook Event Parsing

        For any webhook request with empty payload, the platform should reject it
        with appropriate error.
        """
        # Arrange - Empty payload
        payload_bytes = b""

        # Generate valid signature for empty payload
        valid_signature = hmac.new(
            webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        webhook_getter = PaystackWebhookEventGetter(webhook_secret)
        request = MockRequest(payload_bytes, valid_signature)

        # Act & Assert - Should raise HTTPException for empty payload
        with pytest.raises(HTTPException) as exc_info:
            await webhook_getter(request)

        assert exc_info.value.status_code == 400
        assert "Invalid JSON payload" in str(exc_info.value.detail)

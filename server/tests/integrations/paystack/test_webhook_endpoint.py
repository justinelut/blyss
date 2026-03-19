"""
Unit tests for Paystack webhook endpoint.

Tests webhook signature verification, event parsing, storage, and duplicate handling.
Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.9
"""

import hashlib
import hmac
import json

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from sqlalchemy import func, select

from polar.config import settings
from polar.integrations.paystack.endpoints import PaystackWebhookEventGetter
from polar.models.external_event import ExternalEvent, ExternalEventSource
from polar.postgres import AsyncSession


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


class TestPaystackWebhookEventGetter:
    """Unit tests for PaystackWebhookEventGetter class."""

    def test_init(self):
        """Test PaystackWebhookEventGetter initialization."""
        secret = "test_webhook_secret"
        getter = PaystackWebhookEventGetter(secret)
        assert getter.secret == secret

    def test_verify_signature_valid(self):
        """Test signature verification with valid signature."""
        secret = "test_webhook_secret"
        payload = b'{"event": "charge.success", "data": {"id": "test_123"}}'

        # Generate valid signature
        expected_signature = hmac.new(
            secret.encode("utf-8"), payload, hashlib.sha512
        ).hexdigest()

        getter = PaystackWebhookEventGetter(secret)
        assert getter._verify_signature(payload, expected_signature) is True

    def test_verify_signature_invalid(self):
        """Test signature verification with invalid signature."""
        secret = "test_webhook_secret"
        payload = b'{"event": "charge.success", "data": {"id": "test_123"}}'
        invalid_signature = "invalid_signature_123"

        getter = PaystackWebhookEventGetter(secret)
        assert getter._verify_signature(payload, invalid_signature) is False

    def test_verify_signature_empty(self):
        """Test signature verification with empty signature."""
        secret = "test_webhook_secret"
        payload = b'{"event": "charge.success", "data": {"id": "test_123"}}'

        getter = PaystackWebhookEventGetter(secret)
        assert getter._verify_signature(payload, "") is False

    async def test_call_valid_webhook(self):
        """Test webhook processing with valid signature and payload."""
        secret = "test_webhook_secret"
        payload_data = {
            "event": "charge.success",
            "data": {
                "id": "test_123",
                "reference": "ref_123",
                "amount": 10000,
                "currency": "KES",
            },
        }
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        getter = PaystackWebhookEventGetter(secret)
        request = MockRequest(payload_bytes, valid_signature)

        result = await getter(request)

        assert result == payload_data
        assert result["event"] == "charge.success"
        assert result["data"]["id"] == "test_123"

    async def test_call_invalid_signature(self):
        """Test webhook processing with invalid signature."""
        secret = "test_webhook_secret"
        payload_data = {"event": "charge.success", "data": {"id": "test_123"}}
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")
        invalid_signature = "invalid_signature"

        getter = PaystackWebhookEventGetter(secret)
        request = MockRequest(payload_bytes, invalid_signature)

        with pytest.raises(HTTPException) as exc_info:
            await getter(request)

        assert exc_info.value.status_code == 401
        assert "Invalid signature" in str(exc_info.value.detail)

    async def test_call_invalid_json(self):
        """Test webhook processing with invalid JSON payload."""
        secret = "test_webhook_secret"
        payload_bytes = b"invalid_json_payload"

        # Generate valid signature for invalid payload
        valid_signature = hmac.new(
            secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        getter = PaystackWebhookEventGetter(secret)
        request = MockRequest(payload_bytes, valid_signature)

        with pytest.raises(HTTPException) as exc_info:
            await getter(request)

        assert exc_info.value.status_code == 400
        assert "Invalid JSON payload" in str(exc_info.value.detail)

    async def test_call_missing_event_field(self):
        """Test webhook processing with missing 'event' field."""
        secret = "test_webhook_secret"
        payload_data = {
            "data": {"id": "test_123"}  # Missing 'event' field
        }
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        getter = PaystackWebhookEventGetter(secret)
        request = MockRequest(payload_bytes, valid_signature)

        with pytest.raises(HTTPException) as exc_info:
            await getter(request)

        assert exc_info.value.status_code == 400
        assert "Invalid payload structure" in str(exc_info.value.detail)

    async def test_call_missing_data_field(self):
        """Test webhook processing with missing 'data' field."""
        secret = "test_webhook_secret"
        payload_data = {
            "event": "charge.success"  # Missing 'data' field
        }
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            secret.encode("utf-8"), payload_bytes, hashlib.sha512
        ).hexdigest()

        getter = PaystackWebhookEventGetter(secret)
        request = MockRequest(payload_bytes, valid_signature)

        with pytest.raises(HTTPException) as exc_info:
            await getter(request)

        assert exc_info.value.status_code == 400
        assert "Invalid payload structure" in str(exc_info.value.detail)


class TestWebhookEndpoint:
    """Unit tests for webhook endpoint integration."""

    async def test_webhook_endpoint_valid_request(
        self, client: AsyncClient, session: AsyncSession
    ):
        """Test webhook endpoint with valid request."""
        # Arrange
        payload_data = {
            "event": "charge.success",
            "data": {
                "id": "test_123",
                "reference": "ref_123",
                "amount": 10000,
                "currency": "KES",
                "status": "success",
            },
        }
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            settings.PAYSTACK_WEBHOOK_SECRET.encode("utf-8"),
            payload_bytes,
            hashlib.sha512,
        ).hexdigest()

        headers = {
            "x-paystack-signature": valid_signature,
            "content-type": "application/json",
        }

        # Act
        response = await client.post(
            "/api/v1/integrations/paystack/webhook",
            content=payload_json,
            headers=headers,
        )

        # Assert
        assert response.status_code == 202

        # Verify event was stored
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == "test_123",
        )
        result = await session.execute(stmt)
        stored_event = result.scalar_one_or_none()

        assert stored_event is not None
        assert stored_event.type == "paystack.webhook.charge.success"
        assert stored_event.payload == payload_data

    async def test_webhook_endpoint_invalid_signature(self, client: AsyncClient):
        """Test webhook endpoint with invalid signature."""
        # Arrange
        payload_data = {"event": "charge.success", "data": {"id": "test_123"}}
        payload_json = json.dumps(payload_data)

        headers = {
            "x-paystack-signature": "invalid_signature",
            "content-type": "application/json",
        }

        # Act
        response = await client.post(
            "/api/v1/integrations/paystack/webhook",
            content=payload_json,
            headers=headers,
        )

        # Assert
        assert response.status_code == 401

    async def test_webhook_endpoint_missing_signature(self, client: AsyncClient):
        """Test webhook endpoint with missing signature header."""
        # Arrange
        payload_data = {"event": "charge.success", "data": {"id": "test_123"}}
        payload_json = json.dumps(payload_data)

        headers = {
            "content-type": "application/json"
            # Missing x-paystack-signature header
        }

        # Act
        response = await client.post(
            "/api/v1/integrations/paystack/webhook",
            content=payload_json,
            headers=headers,
        )

        # Assert
        assert response.status_code == 401

    async def test_webhook_endpoint_duplicate_events(
        self, client: AsyncClient, session: AsyncSession
    ):
        """Test webhook endpoint handles duplicate events idempotently."""
        # Arrange
        payload_data = {
            "event": "charge.success",
            "data": {
                "id": "duplicate_test_123",
                "reference": "ref_duplicate_123",
                "amount": 10000,
                "currency": "KES",
            },
        }
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            settings.PAYSTACK_WEBHOOK_SECRET.encode("utf-8"),
            payload_bytes,
            hashlib.sha512,
        ).hexdigest()

        headers = {
            "x-paystack-signature": valid_signature,
            "content-type": "application/json",
        }

        # Act - Send same webhook twice
        response1 = await client.post(
            "/api/v1/integrations/paystack/webhook",
            content=payload_json,
            headers=headers,
        )

        response2 = await client.post(
            "/api/v1/integrations/paystack/webhook",
            content=payload_json,
            headers=headers,
        )

        # Assert - Both requests should succeed
        assert response1.status_code == 202
        assert response2.status_code == 202

        # But only one event should be stored
        stmt = select(func.count(ExternalEvent.id)).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == "duplicate_test_123",
        )
        result = await session.execute(stmt)
        event_count = result.scalar()

        assert event_count == 1

    async def test_webhook_endpoint_different_event_types(
        self, client: AsyncClient, session: AsyncSession
    ):
        """Test webhook endpoint handles different event types."""
        # Arrange - Test multiple event types
        event_types = ["charge.success", "charge.failed", "transfer.success"]

        for i, event_type in enumerate(event_types):
            payload_data = {
                "event": event_type,
                "data": {
                    "id": f"test_{event_type}_{i}",
                    "reference": f"ref_{i}",
                    "amount": 10000 + i * 1000,
                    "currency": "KES",
                },
            }
            payload_json = json.dumps(payload_data)
            payload_bytes = payload_json.encode("utf-8")

            # Generate valid signature
            valid_signature = hmac.new(
                settings.PAYSTACK_WEBHOOK_SECRET.encode("utf-8"),
                payload_bytes,
                hashlib.sha512,
            ).hexdigest()

            headers = {
                "x-paystack-signature": valid_signature,
                "content-type": "application/json",
            }

            # Act
            response = await client.post(
                "/api/v1/integrations/paystack/webhook",
                content=payload_json,
                headers=headers,
            )

            # Assert
            assert response.status_code == 202

        # Verify all events were stored with correct types
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.type.like("paystack.webhook.%"),
        )
        result = await session.execute(stmt)
        stored_events = result.scalars().all()

        stored_types = {event.type for event in stored_events}
        expected_types = {
            f"paystack.webhook.{event_type}" for event_type in event_types
        }

        assert len(stored_events) >= len(event_types)
        assert expected_types.issubset(stored_types)

    async def test_webhook_endpoint_event_with_reference_fallback(
        self, client: AsyncClient, session: AsyncSession
    ):
        """Test webhook endpoint uses reference as fallback when id is missing."""
        # Arrange - Event data without 'id' but with 'reference'
        payload_data = {
            "event": "charge.success",
            "data": {
                "reference": "fallback_ref_123",  # No 'id' field
                "amount": 10000,
                "currency": "KES",
                "status": "success",
            },
        }
        payload_json = json.dumps(payload_data)
        payload_bytes = payload_json.encode("utf-8")

        # Generate valid signature
        valid_signature = hmac.new(
            settings.PAYSTACK_WEBHOOK_SECRET.encode("utf-8"),
            payload_bytes,
            hashlib.sha512,
        ).hexdigest()

        headers = {
            "x-paystack-signature": valid_signature,
            "content-type": "application/json",
        }

        # Act
        response = await client.post(
            "/api/v1/integrations/paystack/webhook",
            content=payload_json,
            headers=headers,
        )

        # Assert
        assert response.status_code == 202

        # Verify event was stored with reference as external_id
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == "fallback_ref_123",
        )
        result = await session.execute(stmt)
        stored_event = result.scalar_one_or_none()

        assert stored_event is not None
        assert stored_event.external_id == "fallback_ref_123"
        assert stored_event.type == "paystack.webhook.charge.success"

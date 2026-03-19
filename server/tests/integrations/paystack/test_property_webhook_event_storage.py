"""
Property tests for Paystack webhook event storage.

Feature: paystack-integration
Property 9: Webhook Events Are Stored
Validates: Requirements 2.7
"""

from typing import Any

from hypothesis import given
from hypothesis import strategies as st
from sqlalchemy import select

from polar.external_event.service import external_event as external_event_service
from polar.models.external_event import ExternalEvent, ExternalEventSource
from polar.postgres import AsyncSession


class TestWebhookEventStorage:
    """Property tests for webhook event storage."""

    @given(
        event_type=st.text(min_size=1, max_size=50),
        event_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=10,
        ),
        event_id=st.text(min_size=1, max_size=100),
    )
    async def test_property_9_webhook_events_are_stored(
        self,
        event_type: str,
        event_data: dict[str, Any],
        event_id: str,
        session: AsyncSession,
    ):
        """
        Feature: paystack-integration, Property 9: Webhook Events Are Stored

        For any webhook event received (regardless of type), the platform should
        store it in the database for audit purposes.
        """
        # Arrange - Create webhook event payload
        event_payload = {"event": event_type, "data": {**event_data, "id": event_id}}

        # Act - Store webhook event using external_event_service
        await external_event_service.enqueue(
            session,
            ExternalEventSource.paystack,
            f"paystack.webhook.{event_type}",
            event_id,
            event_payload,
        )

        await session.flush()

        # Assert - Event should be stored in database
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == event_id,
        )
        result = await session.execute(stmt)
        stored_event = result.scalar_one_or_none()

        assert stored_event is not None
        assert stored_event.source == ExternalEventSource.paystack
        assert stored_event.external_id == event_id
        assert stored_event.type == f"paystack.webhook.{event_type}"
        assert stored_event.payload == event_payload

    @given(
        event_types=st.lists(
            st.text(min_size=1, max_size=50), min_size=2, max_size=5, unique=True
        ),
        base_event_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=5,
        ),
        event_id=st.text(min_size=1, max_size=100),
    )
    async def test_property_9_multiple_webhook_events_stored(
        self,
        event_types: list[str],
        base_event_data: dict[str, Any],
        event_id: str,
        session: AsyncSession,
    ):
        """
        Feature: paystack-integration, Property 9: Webhook Events Are Stored

        For any sequence of webhook events received, all events should be stored
        in the database for audit purposes.
        """
        # Arrange & Act - Store multiple webhook events
        stored_event_ids = []
        for i, event_type in enumerate(event_types):
            unique_event_id = f"{event_id}_{i}"
            event_payload = {
                "event": event_type,
                "data": {**base_event_data, "id": unique_event_id},
            }

            await external_event_service.enqueue(
                session,
                ExternalEventSource.paystack,
                f"paystack.webhook.{event_type}",
                unique_event_id,
                event_payload,
            )
            stored_event_ids.append(unique_event_id)

        await session.flush()

        # Assert - All events should be stored
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id.in_(stored_event_ids),
        )
        result = await session.execute(stmt)
        stored_events = result.scalars().all()

        assert len(stored_events) == len(event_types)

        stored_external_ids = {event.external_id for event in stored_events}
        expected_external_ids = set(stored_event_ids)
        assert stored_external_ids == expected_external_ids

        # Verify each event has correct data
        for stored_event in stored_events:
            assert stored_event.source == ExternalEventSource.paystack
            assert stored_event.external_id in stored_event_ids
            assert stored_event.type.startswith("paystack.webhook.")
            assert isinstance(stored_event.payload, dict)
            assert "event" in stored_event.payload
            assert "data" in stored_event.payload

    @given(
        event_type=st.text(min_size=1, max_size=50),
        event_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=10,
        ),
        event_id=st.text(min_size=1, max_size=100),
    )
    async def test_property_9_webhook_event_storage_with_metadata(
        self,
        event_type: str,
        event_data: dict[str, Any],
        event_id: str,
        session: AsyncSession,
    ):
        """
        Feature: paystack-integration, Property 9: Webhook Events Are Stored

        For any webhook event with complex metadata, the platform should store
        the complete event data for audit purposes.
        """
        # Arrange - Create webhook event with nested metadata
        complex_event_data = {
            **event_data,
            "id": event_id,
            "metadata": {
                "order_id": f"order_{event_id}",
                "customer_email": f"customer_{event_id}@example.com",
                "amount": 10000,  # Amount in kobo
                "currency": "KES",
            },
        }

        event_payload = {"event": event_type, "data": complex_event_data}

        # Act - Store webhook event
        await external_event_service.enqueue(
            session,
            ExternalEventSource.paystack,
            f"paystack.webhook.{event_type}",
            event_id,
            event_payload,
        )

        await session.flush()

        # Assert - Event with metadata should be stored completely
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == event_id,
        )
        result = await session.execute(stmt)
        stored_event = result.scalar_one_or_none()

        assert stored_event is not None
        assert stored_event.payload == event_payload

        # Verify nested metadata is preserved
        stored_data = stored_event.payload["data"]
        assert "metadata" in stored_data
        assert stored_data["metadata"]["order_id"] == f"order_{event_id}"
        assert (
            stored_data["metadata"]["customer_email"]
            == f"customer_{event_id}@example.com"
        )
        assert stored_data["metadata"]["amount"] == 10000
        assert stored_data["metadata"]["currency"] == "KES"

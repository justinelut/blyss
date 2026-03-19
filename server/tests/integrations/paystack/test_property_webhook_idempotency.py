"""
Property tests for Paystack webhook idempotency.

Feature: paystack-integration
Property 10: Webhook Idempotency
Validates: Requirements 2.9
"""

from typing import Any

from hypothesis import given
from hypothesis import strategies as st
from sqlalchemy import func, select

from polar.external_event.service import external_event as external_event_service
from polar.models.external_event import ExternalEvent, ExternalEventSource
from polar.postgres import AsyncSession


class TestWebhookIdempotency:
    """Property tests for webhook idempotency."""

    @given(
        event_type=st.text(min_size=1, max_size=50),
        event_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=10,
        ),
        event_id=st.text(min_size=1, max_size=100),
        duplicate_count=st.integers(min_value=2, max_value=5),
    )
    async def test_property_10_webhook_idempotency_duplicate_events(
        self,
        event_type: str,
        event_data: dict[str, Any],
        event_id: str,
        duplicate_count: int,
        session: AsyncSession,
    ):
        """
        Feature: paystack-integration, Property 10: Webhook Idempotency

        For any webhook event received multiple times with the same event ID,
        the platform should process it only once, preventing duplicate orders
        or status updates.
        """
        # Arrange - Create identical webhook event payload
        event_payload = {"event": event_type, "data": {**event_data, "id": event_id}}

        # Act - Send the same webhook event multiple times
        for _ in range(duplicate_count):
            await external_event_service.enqueue(
                session,
                ExternalEventSource.paystack,
                f"paystack.webhook.{event_type}",
                event_id,  # Same event_id for all duplicates
                event_payload,
            )

        await session.flush()

        # Assert - Only one event should be stored despite multiple submissions
        stmt = select(func.count(ExternalEvent.id)).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == event_id,
        )
        result = await session.execute(stmt)
        event_count = result.scalar()

        assert event_count == 1, (
            f"Expected 1 event, but found {event_count} for event_id {event_id}"
        )

        # Verify the stored event has correct data
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == event_id,
        )
        result = await session.execute(stmt)
        stored_event = result.scalar_one()

        assert stored_event.source == ExternalEventSource.paystack
        assert stored_event.external_id == event_id
        assert stored_event.type == f"paystack.webhook.{event_type}"
        assert stored_event.payload == event_payload

    @given(
        event_type=st.text(min_size=1, max_size=50),
        base_event_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=5,
        ),
        event_id=st.text(min_size=1, max_size=100),
        payload_variations=st.lists(
            st.dictionaries(
                st.text(min_size=1, max_size=20),
                st.one_of(st.text(), st.integers()),
                min_size=1,
                max_size=3,
            ),
            min_size=2,
            max_size=4,
        ),
    )
    async def test_property_10_webhook_idempotency_same_id_different_payload(
        self,
        event_type: str,
        base_event_data: dict[str, Any],
        event_id: str,
        payload_variations: list[dict[str, Any]],
        session: AsyncSession,
    ):
        """
        Feature: paystack-integration, Property 10: Webhook Idempotency

        For any webhook event received multiple times with the same event ID but
        different payloads, the platform should store only the first occurrence
        to maintain idempotency.
        """
        # Arrange - Create multiple payloads with same event_id but different data
        event_payloads = []
        for i, variation in enumerate(payload_variations):
            event_payload = {
                "event": event_type,
                "data": {
                    **base_event_data,
                    **variation,
                    "id": event_id,  # Same event_id for all
                    "variation": i,  # Different data
                },
            }
            event_payloads.append(event_payload)

        # Act - Send multiple webhook events with same ID but different payloads
        for payload in event_payloads:
            await external_event_service.enqueue(
                session,
                ExternalEventSource.paystack,
                f"paystack.webhook.{event_type}",
                event_id,  # Same event_id for all
                payload,
            )

        await session.flush()

        # Assert - Only one event should be stored (the first one)
        stmt = select(func.count(ExternalEvent.id)).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == event_id,
        )
        result = await session.execute(stmt)
        event_count = result.scalar()

        assert event_count == 1, (
            f"Expected 1 event, but found {event_count} for event_id {event_id}"
        )

        # Verify the stored event matches the first payload
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == event_id,
        )
        result = await session.execute(stmt)
        stored_event = result.scalar_one()

        assert stored_event.payload == event_payloads[0]  # Should match first payload
        assert stored_event.payload["data"]["variation"] == 0  # First variation

    @given(
        event_type=st.text(min_size=1, max_size=50),
        event_data=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=1,
            max_size=10,
        ),
        event_ids=st.lists(
            st.text(min_size=1, max_size=100), min_size=2, max_size=5, unique=True
        ),
    )
    async def test_property_10_webhook_idempotency_different_ids_stored_separately(
        self,
        event_type: str,
        event_data: dict[str, Any],
        event_ids: list[str],
        session: AsyncSession,
    ):
        """
        Feature: paystack-integration, Property 10: Webhook Idempotency

        For webhook events with different event IDs, each should be stored
        separately, even if they have identical payloads otherwise.
        """
        # Arrange & Act - Send webhook events with different event IDs
        for event_id in event_ids:
            event_payload = {
                "event": event_type,
                "data": {**event_data, "id": event_id},
            }

            await external_event_service.enqueue(
                session,
                ExternalEventSource.paystack,
                f"paystack.webhook.{event_type}",
                event_id,
                event_payload,
            )

        await session.flush()

        # Assert - All events should be stored since they have different IDs
        stmt = select(func.count(ExternalEvent.id)).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id.in_(event_ids),
        )
        result = await session.execute(stmt)
        event_count = result.scalar()

        assert event_count == len(event_ids), (
            f"Expected {len(event_ids)} events, but found {event_count}"
        )

        # Verify each event is stored with correct ID
        stmt = select(ExternalEvent).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id.in_(event_ids),
        )
        result = await session.execute(stmt)
        stored_events = result.scalars().all()

        stored_external_ids = {event.external_id for event in stored_events}
        expected_external_ids = set(event_ids)
        assert stored_external_ids == expected_external_ids

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
    async def test_property_10_webhook_idempotency_across_sessions(
        self,
        event_type: str,
        event_data: dict[str, Any],
        event_id: str,
        session: AsyncSession,
    ):
        """
        Feature: paystack-integration, Property 10: Webhook Idempotency

        For webhook events processed across different database sessions,
        idempotency should still be maintained.
        """
        # Arrange
        event_payload = {"event": event_type, "data": {**event_data, "id": event_id}}

        # Act - First submission
        await external_event_service.enqueue(
            session,
            ExternalEventSource.paystack,
            f"paystack.webhook.{event_type}",
            event_id,
            event_payload,
        )
        await session.flush()
        await session.commit()

        # Second submission in same session (simulating retry)
        await external_event_service.enqueue(
            session,
            ExternalEventSource.paystack,
            f"paystack.webhook.{event_type}",
            event_id,
            event_payload,
        )
        await session.flush()

        # Assert - Still only one event should exist
        stmt = select(func.count(ExternalEvent.id)).where(
            ExternalEvent.source == ExternalEventSource.paystack,
            ExternalEvent.external_id == event_id,
        )
        result = await session.execute(stmt)
        event_count = result.scalar()

        assert event_count == 1, (
            f"Expected 1 event after retry, but found {event_count}"
        )

from typing import Unpack

import structlog

from polar.worker import AsyncSessionMaker, TaskPriority, actor

from .client import Properties
from .client import client as loops_client

log = structlog.get_logger()


@actor(actor_name="loops.update_contact", priority=TaskPriority.LOW)
async def loops_update_contact(
    email: str, id: str, **properties: Unpack[Properties]
) -> None:
    async with AsyncSessionMaker() as session:
        await loops_client.update_contact(email, id, session=session, **properties)


@actor(actor_name="loops.send_event", priority=TaskPriority.LOW)
async def loops_send_event(
    email: str, event_name: str, **properties: Unpack[Properties]
) -> None:
    async with AsyncSessionMaker() as session:
        await loops_client.send_event(email, event_name, session=session, **properties)


def _loops_update_last_order_at_debounce_key(
    email: str, id: str, last_order_at: int
) -> str:
    return f"loops.update_last_order_at:{email}:{id}"


@actor(
    actor_name="loops.update_last_order_at",
    priority=TaskPriority.LOW,
    debounce_key=_loops_update_last_order_at_debounce_key,
)
async def loops_update_last_order_at(email: str, id: str, last_order_at: int) -> None:
    async with AsyncSessionMaker() as session:
        await loops_client.update_contact(email, id, session=session, lastOrderAt=last_order_at)


@actor(actor_name="loops.sync_all_contacts", priority=TaskPriority.LOW)
async def loops_sync_all_contacts() -> None:
    """Backfill every existing user into Loops as a contact.

    Paginates all non-deleted users and enqueues one `loops.update_contact`
    job per user, so each contact upsert is independent + retryable and this
    coordinator task stays fast. Triggered from the backoffice
    (/backoffice/loops "Sync all users to Loops") so the operator can send
    marketing emails to the existing base.
    """
    from sqlalchemy import select

    from polar.models import User
    from polar.worker import enqueue_job

    batch_size = 500
    offset = 0
    total = 0

    async with AsyncSessionMaker() as session:
        while True:
            statement = (
                select(User)
                .where(User.deleted_at.is_(None), User.blocked_at.is_(None))
                .order_by(User.created_at)
                .limit(batch_size)
                .offset(offset)
            )
            result = await session.execute(statement)
            users = result.scalars().all()
            if not users:
                break

            for user in users:
                signup_intent = (user.signup_attribution or {}).get("intent") or ""
                enqueue_job(
                    "loops.update_contact",
                    user.email,
                    str(user.id),
                    userId=str(user.id),
                    userGroup="creator",
                    signupIntent=signup_intent,
                    subscribed=True,
                    createdAt=user.created_at.isoformat(),
                )
                total += 1

            offset += batch_size

    log.info("loops.sync_all_contacts.enqueued", total=total)

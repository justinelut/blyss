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
    (/backoffice/loops "Enqueue full sync") so the operator can send
    marketing emails to the existing base.

    Writes progress to Redis key `loops:last_sync` at start + end so the
    backoffice page can show 'Last sync: queued, N users enqueued, Xs'.
    """
    import json
    import time

    from sqlalchemy import select

    from polar.models import User
    from polar.redis import create_redis
    from polar.worker import enqueue_job

    redis = create_redis("worker")
    started = time.time()
    started_ts = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

    # Mark queue-mode start so the backoffice page reflects 'enqueueing now'.
    try:
        await redis.set(
            "loops:last_sync",
            json.dumps(
                {
                    "mode": "queued (enqueueing)",
                    "at": started_ts,
                    "ok": 0,
                    "failed": 0,
                    "total": 0,
                    "duration_s": 0,
                    "first_error": "",
                }
            ),
            ex=7 * 24 * 3600,
        )
    except Exception:
        # Don't fail the task on Redis hiccup — just log + continue.
        log.warning("loops.sync_all.redis_status_write_failed")

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

            log.info(
                "loops.sync_all.batch",
                batch=offset // batch_size,
                batch_size=len(users),
                total_so_far=total,
            )

            offset += batch_size

    duration = time.time() - started
    log.info("loops.sync_all_contacts.enqueued", total=total, duration_s=duration)

    # Mark coordinator-finished so the backoffice page shows 'enqueued N
    # in Xs — workers are draining'. Per-user job results are independent
    # and tracked via dramatiq's normal retry/error path.
    try:
        await redis.set(
            "loops:last_sync",
            json.dumps(
                {
                    "mode": "queued (enqueued)",
                    "at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                    "ok": 0,
                    "failed": 0,
                    "total": total,
                    "duration_s": duration,
                    "first_error": "",
                }
            ),
            ex=7 * 24 * 3600,
        )
    except Exception:
        log.warning("loops.sync_all.redis_status_finish_failed")

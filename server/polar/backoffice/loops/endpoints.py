import asyncio
import json
import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from tagflow import tag, text

from polar.models import User
from polar.postgres import AsyncSession, get_db_session
from polar.redis import Redis, get_redis
from polar.runtime_settings.service import runtime_settings
from polar.worker import enqueue_job

from ..components import button
from ..dependencies import get_admin
from ..layout import layout
from ..responses import HXRedirectResponse
from ..toast import add_toast

router = APIRouter()


# Redis key holding the last-sync summary so the operator sees what happened.
LAST_SYNC_KEY = "loops:last_sync"
# Synchronous-mode cap. Higher than this and we recommend the queued backfill
# (the request would otherwise block while we hit Loops once per user).
SYNC_NOW_MAX = 500


async def _read_last_sync(redis: Redis) -> dict | None:
    raw = await redis.get(LAST_SYNC_KEY)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


async def _write_last_sync(redis: Redis, data: dict) -> None:
    # 7 days — enough for the operator to look back over a week of attempts.
    await redis.set(LAST_SYNC_KEY, json.dumps(data), ex=7 * 24 * 3600)


async def _queue_depth(redis: Redis) -> int:
    """Best-effort dramatiq Redis queue depth for the default queue.

    Dramatiq's RedisBroker stores pending messages on a stream
    `dramatiq:default.msgs`; older versions used a list `dramatiq:default`.
    Try both and return whichever is larger so we surface real depth.
    """
    candidates = ["dramatiq:default.msgs", "dramatiq:default", "dramatiq:default.DQ.msgs"]
    best = 0
    for key in candidates:
        try:
            t = await redis.type(key)
        except Exception:
            t = "none"
        try:
            if t == "stream":
                n = await redis.xlen(key)
            elif t == "list":
                n = await redis.llen(key)
            else:
                n = 0
        except Exception:
            n = 0
        if n > best:
            best = n
    return best


@router.get("/", name="loops:index")
async def index(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    redis: Redis = Depends(get_redis),
) -> None:
    # Count syncable users.
    count_stmt = select(func.count(User.id)).where(
        User.deleted_at.is_(None), User.blocked_at.is_(None)
    )
    user_count = (await session.execute(count_stmt)).scalar() or 0

    # Is a Loops key configured (DB overlay or env)?
    loops_key = await runtime_settings.get(session, "LOOPS_API_KEY")
    has_key = bool(loops_key)

    # Queue depth + last-sync summary (best-effort).
    depth = await _queue_depth(redis)
    last = await _read_last_sync(redis)

    with layout(
        request,
        [("Loops", str(request.url_for("loops:index")))],
        "loops:index",
    ):
        with tag.div(classes="flex flex-col gap-6"):
            with tag.h1(classes="text-4xl"):
                text("Loops marketing sync")
            with tag.p(classes="text-base-content/70"):
                text(
                    "Push every existing Blyss user into Loops as a contact. "
                    "Polar already auto-syncs new signups via the loops "
                    "integration — this page is for backfilling the existing "
                    "user base (e.g. after a migration)."
                )

            # Stats row — what the operator actually wants to see at a glance.
            with tag.div(classes="stats bg-base-200 w-fit"):
                with tag.div(classes="stat"):
                    with tag.div(classes="stat-title"):
                        text("Syncable users")
                    with tag.div(classes="stat-value"):
                        text(str(user_count))
                with tag.div(classes="stat"):
                    with tag.div(classes="stat-title"):
                        text("Queue depth (default)")
                    with tag.div(classes="stat-value"):
                        text(str(depth))
                if last:
                    with tag.div(classes="stat"):
                        with tag.div(classes="stat-title"):
                            text("Last sync")
                        with tag.div(classes="stat-value text-base"):
                            text(last.get("mode", "unknown"))
                        with tag.div(classes="stat-desc"):
                            ok = last.get("ok", 0)
                            failed = last.get("failed", 0)
                            total = last.get("total", 0)
                            ts = last.get("at", "")
                            duration = last.get("duration_s", 0)
                            text(
                                f"{ok}/{total} ok · {failed} failed · "
                                f"{duration:.1f}s · {ts}"
                            )
                        if last.get("first_error"):
                            with tag.div(classes="stat-desc text-error"):
                                text(f"first error: {last['first_error']}")

            if not has_key:
                with tag.div(classes="alert alert-warning w-fit"):
                    text(
                        "No Loops API key configured. Add LOOPS_API_KEY in "
                        "Runtime settings first."
                    )

            with tag.div(classes="flex flex-wrap gap-2"):
                with button(
                    variant="primary",
                    hx_post=str(request.url_for("loops:sync_now")),
                    disabled=not has_key or user_count == 0,
                ):
                    text(f"Force sync now (synchronous, up to {SYNC_NOW_MAX})")
                with button(
                    variant="secondary",
                    hx_post=str(request.url_for("loops:sync_all")),
                    disabled=not has_key,
                ):
                    text("Enqueue full sync (background)")
                with button(
                    ghost=True,
                    hx_post=str(request.url_for("loops:test")),
                    disabled=not has_key,
                ):
                    text("Test connection (one contact)")


@router.post("/sync", name="loops:sync_all")
async def sync_all(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    redis: Redis = Depends(get_redis),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    loops_key = await runtime_settings.get(session, "LOOPS_API_KEY")
    if not loops_key:
        await add_toast(
            request,
            "No Loops API key configured. Set LOOPS_API_KEY in Runtime "
            "settings first.",
            "error",
        )
        return HXRedirectResponse(request, str(request.url_for("loops:index")))

    enqueue_job("loops.sync_all_contacts")
    await _write_last_sync(
        redis,
        {
            "mode": "queued",
            "at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "ok": 0,
            "failed": 0,
            "total": 0,
            "duration_s": 0,
            "first_error": "",
        },
    )
    await add_toast(
        request,
        "Sync enqueued. The worker will publish each user to Loops in the "
        "background. Reload this page to see queue depth drain.",
        "success",
    )
    return HXRedirectResponse(request, str(request.url_for("loops:index")))


@router.post("/sync_now", name="loops:sync_now")
async def sync_now(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    redis: Redis = Depends(get_redis),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    """Synchronously upsert all users (capped at SYNC_NOW_MAX) directly via
    the Loops client. Bypasses the worker queue entirely so the operator sees
    real per-call results in this request's lifetime.

    For larger backfills the queued path is still recommended — this is a
    'force sync now' for when 'enqueue' isn't visible enough.
    """
    from polar.integrations.loops.client import (
        LoopsClientLogicalError,
        LoopsClientOperationalError,
        client as loops_client,
    )

    loops_key = await runtime_settings.get(session, "LOOPS_API_KEY")
    if not loops_key:
        await add_toast(
            request,
            "No Loops API key configured. Set LOOPS_API_KEY in Runtime "
            "settings first.",
            "error",
        )
        return HXRedirectResponse(request, str(request.url_for("loops:index")))

    started = time.time()
    statement = (
        select(User)
        .where(User.deleted_at.is_(None), User.blocked_at.is_(None))
        .order_by(User.created_at)
        .limit(SYNC_NOW_MAX)
    )
    result = await session.execute(statement)
    users = result.scalars().all()

    ok = 0
    failed = 0
    first_error = ""

    # Sequential to avoid blasting Loops with N concurrent calls; Loops's
    # /contacts/update is fast (~120ms typical), so 200 users ≈ 25s. Front
    # the request with hx-trigger so the toast lands as soon as we redirect.
    for user in users:
        signup_intent = (user.signup_attribution or {}).get("intent") or ""
        try:
            await loops_client.update_contact(
                user.email,
                str(user.id),
                session=session,
                userId=str(user.id),
                userGroup="creator",
                signupIntent=signup_intent,
                subscribed=True,
                createdAt=user.created_at.isoformat(),
            )
            ok += 1
        except LoopsClientLogicalError as e:
            failed += 1
            if not first_error:
                first_error = f"HTTP {e.status_code}: {e.body[:120]}"
        except LoopsClientOperationalError as e:
            failed += 1
            if not first_error:
                first_error = f"network/5xx: {str(e)[:120]}"
        except Exception as e:
            failed += 1
            if not first_error:
                first_error = f"{type(e).__name__}: {str(e)[:120]}"
        # Tiny pause so we don't hammer Loops; cooperative-yield the loop too.
        await asyncio.sleep(0.05)

    duration = time.time() - started
    await _write_last_sync(
        redis,
        {
            "mode": "sync_now",
            "at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "ok": ok,
            "failed": failed,
            "total": ok + failed,
            "duration_s": duration,
            "first_error": first_error,
        },
    )

    if failed == 0 and ok > 0:
        await add_toast(
            request,
            f"Synced {ok} users to Loops in {duration:.1f}s.",
            "success",
        )
    elif ok > 0:
        await add_toast(
            request,
            f"Synced {ok}, failed {failed}, in {duration:.1f}s. "
            f"First error: {first_error}",
            "warning",
        )
    else:
        await add_toast(
            request,
            f"Sync failed for all {failed} users in {duration:.1f}s. "
            f"First error: {first_error}",
            "error",
        )

    return HXRedirectResponse(request, str(request.url_for("loops:index")))


@router.post("/test", name="loops:test")
async def test_connection(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    """Synchronously upsert ONE test contact directly via the Loops client.

    Bypasses the worker queue so the operator gets immediate signal — success
    toast, or the actual error from the Loops API.
    """
    from polar.integrations.loops.client import (
        LoopsClientLogicalError,
        LoopsClientOperationalError,
        client as loops_client,
    )

    loops_key = await runtime_settings.get(session, "LOOPS_API_KEY")
    if not loops_key:
        await add_toast(
            request,
            "No Loops API key configured. Set LOOPS_API_KEY in Runtime "
            "settings first.",
            "error",
        )
        return HXRedirectResponse(request, str(request.url_for("loops:index")))

    test_email = "loops-backoffice-test@blyss.co.ke"
    test_id = "00000000-0000-0000-0000-000000000001"
    try:
        await loops_client.update_contact(
            test_email,
            test_id,
            session=session,
            userGroup="creator",
            signupIntent="diagnostic",
            subscribed=False,
        )
        await add_toast(
            request,
            f"Loops connection OK — upserted {test_email} (subscribed=false). "
            "Check the Contacts list in your Loops dashboard.",
            "success",
        )
    except LoopsClientLogicalError as e:
        await add_toast(
            request,
            f"Loops rejected the request — HTTP {e.status_code}: {e.body[:200]}",
            "error",
        )
    except LoopsClientOperationalError as e:
        await add_toast(
            request,
            f"Loops connection failed (network/5xx): {str(e)[:200]}",
            "error",
        )
    except Exception as e:
        await add_toast(
            request,
            f"Loops test raised an unexpected error: {type(e).__name__}: {str(e)[:200]}",
            "error",
        )

    return HXRedirectResponse(request, str(request.url_for("loops:index")))

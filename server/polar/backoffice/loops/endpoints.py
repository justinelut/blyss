from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from tagflow import tag, text

from polar.models import User
from polar.postgres import AsyncSession, get_db_session
from polar.runtime_settings.service import runtime_settings
from polar.worker import enqueue_job

from ..components import button
from ..dependencies import get_admin
from ..layout import layout
from ..responses import HXRedirectResponse
from ..toast import add_toast

router = APIRouter()


@router.get("/", name="loops:index")
async def index(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    # Count syncable users.
    count_stmt = select(func.count(User.id)).where(
        User.deleted_at.is_(None), User.blocked_at.is_(None)
    )
    user_count = (await session.execute(count_stmt)).scalar() or 0

    # Is a Loops key configured (DB overlay or env)?
    loops_key = await runtime_settings.get(session, "LOOPS_API_KEY")
    has_key = bool(loops_key)

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
                    "Push every existing Blyss user into Loops as a contact so "
                    "you can send them marketing emails. Each user is upserted "
                    "via a background job (safe to re-run; Loops dedupes by "
                    "email)."
                )

            with tag.div(classes="stats bg-base-200 w-fit"):
                with tag.div(classes="stat"):
                    with tag.div(classes="stat-title"):
                        text("Syncable users")
                    with tag.div(classes="stat-value"):
                        text(str(user_count))

            if not has_key:
                with tag.div(classes="alert alert-warning w-fit"):
                    text(
                        "No Loops API key configured. Add LOOPS_API_KEY in "
                        "Runtime settings first."
                    )

            with tag.div(classes="flex gap-2"):
                with button(
                    variant="primary",
                    hx_post=str(request.url_for("loops:sync_all")),
                    disabled=not has_key,
                ):
                    text("Sync all users to Loops")
                with button(
                    ghost=True,
                    hx_post=str(request.url_for("loops:test")),
                    disabled=not has_key,
                ):
                    text("Test connection (upsert one contact)")


@router.post("/sync", name="loops:sync_all")
async def sync_all(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
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
    await add_toast(
        request,
        "Sync started. Users are being pushed to Loops in the background.",
        "success",
    )
    return HXRedirectResponse(request, str(request.url_for("loops:index")))


@router.post("/test", name="loops:test")
async def test_connection(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    """Synchronously upsert ONE test contact directly via the Loops client.

    Bypasses the worker queue so the operator gets immediate signal —
    success toast, or the actual error from the Loops API. Useful when sync
    is silent and we need to know whether the key, network egress, or task
    pickup is the failure point.
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

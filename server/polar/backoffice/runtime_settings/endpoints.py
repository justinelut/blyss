import contextlib
import os
from collections.abc import Generator

from fastapi import APIRouter, Depends, HTTPException, Request
from tagflow import classes, tag, text

from polar.postgres import AsyncSession, get_db_session
from polar.runtime_settings.model import RuntimeSettingStatus
from polar.runtime_settings.registry import REGISTRY, REGISTRY_MAP, RegisteredKey
from polar.runtime_settings.repository import RuntimeSettingsRepository
from polar.runtime_settings.service import RuntimeSettingsDisabled, runtime_settings

from ..components import button, modal
from ..dependencies import get_admin
from ..layout import layout
from ..responses import HXRedirectResponse
from ..toast import add_toast

router = APIRouter()

CATEGORY_ORDER = ["payments", "email", "ai", "auth", "other"]
CATEGORY_DESCRIPTIONS = {
    "payments": "M-Pesa and card payment gateway credentials.",
    "email": "Transactional and marketing email provider keys.",
    "ai": "LLM and inference provider API keys.",
    "auth": "Third-party auth and support tokens.",
    "other": "Miscellaneous integration secrets.",
}


@contextlib.contextmanager
def _source_badge(status: str | None, has_env: bool) -> Generator[None]:
    """Render a DaisyUI badge for the setting source/status."""
    with tag.div(classes="badge badge-sm"):
        if status == RuntimeSettingStatus.active:
            classes("badge-success")
            text("Active")
        elif status == RuntimeSettingStatus.pending:
            classes("badge-warning")
            text("Pending verification")
        elif status == RuntimeSettingStatus.failed:
            classes("badge-error")
            text("Verification failed")
        elif status is None and has_env:
            classes("badge-info")
            text("Env fallback")
        else:
            classes("badge-neutral")
            text("Not configured")
    yield


def _value_preview(reg: RegisteredKey, row: object | None, has_env: bool) -> str:
    if row is not None:
        vh = getattr(row, "value_hash", None)
        if reg.sensitive and vh:
            return f"…{vh[-4:]}"
        elif vh:
            return f"…{vh[-4:]}"
        return "•••• set"
    if has_env:
        return "•••• set"
    return "—"


def _has_env(key: str) -> bool:
    return os.environ.get(key) is not None


@router.get("/", name="runtime_settings:list")
async def list_page(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    repo = RuntimeSettingsRepository(session)
    all_rows = await repo.list_all()
    rows_map = {r.key: r for r in all_rows}

    grouped: dict[str, list[RegisteredKey]] = {c: [] for c in CATEGORY_ORDER}
    for reg in REGISTRY:
        grouped.setdefault(reg.category, []).append(reg)

    with layout(
        request,
        [("Runtime settings", str(request.url_for("runtime_settings:list")))],
        "runtime_settings:list",
    ):
        with tag.div(classes="flex flex-col gap-6"):
            with tag.h1(classes="text-4xl"):
                text("Runtime settings")
            with tag.p(classes="text-base-content/70"):
                text(
                    "Override integration secrets without redeploying. "
                    "DB rows take precedence over environment variables once verified."
                )

            for cat in CATEGORY_ORDER:
                keys = grouped.get(cat, [])
                if not keys:
                    continue
                with tag.div(classes="flex flex-col gap-2"):
                    with tag.h2(classes="text-2xl font-bold capitalize"):
                        text(cat.title())
                    with tag.p(classes="text-sm text-base-content/60 mb-2"):
                        text(CATEGORY_DESCRIPTIONS.get(cat, ""))

                    with tag.div(classes="overflow-x-auto"):
                        with tag.table(classes="table table-sm"):
                            with tag.thead():
                                with tag.tr():
                                    for h in [
                                        "Label",
                                        "Description",
                                        "Status",
                                        "Value",
                                        "Last verified",
                                        "Actions",
                                    ]:
                                        with tag.th():
                                            text(h)
                            with tag.tbody():
                                for reg in keys:
                                    row = rows_map.get(reg.key)
                                    env = _has_env(reg.key)
                                    status = row.status if row else None
                                    with tag.tr(id=f"row-{reg.key}"):
                                        with tag.td(classes="font-medium"):
                                            text(reg.label)
                                        with tag.td(
                                            classes="text-sm text-base-content/70 max-w-xs truncate"
                                        ):
                                            text(reg.description)
                                        with tag.td():
                                            with _source_badge(status, env):
                                                pass
                                            if (
                                                status
                                                == RuntimeSettingStatus.failed
                                                and row
                                                and row.last_error
                                            ):
                                                with tag.div(
                                                    classes="text-xs text-error mt-1"
                                                ):
                                                    text(row.last_error)
                                        with tag.td(classes="font-mono text-xs"):
                                            text(_value_preview(reg, row, env))
                                        with tag.td(classes="text-xs"):
                                            if row and row.last_verified_at:
                                                text(
                                                    row.last_verified_at.strftime(
                                                        "%Y-%m-%d %H:%M"
                                                    )
                                                )
                                            else:
                                                text("—")
                                        with tag.td():
                                            with tag.div(classes="flex gap-1"):
                                                with button(
                                                    size="xs",
                                                    hx_get=str(
                                                        request.url_for(
                                                            "runtime_settings:edit",
                                                            key=reg.key,
                                                        )
                                                    ),
                                                    hx_target="#modal",
                                                ):
                                                    text("Edit")
                                                if (
                                                    reg.requires_verification
                                                    and row is not None
                                                ):
                                                    with button(
                                                        size="xs",
                                                        variant="info",
                                                        hx_post=str(
                                                            request.url_for(
                                                                "runtime_settings:test",
                                                                key=reg.key,
                                                            )
                                                        ),
                                                    ):
                                                        text("Test connection")
                                                if row is not None:
                                                    with button(
                                                        size="xs",
                                                        variant="error",
                                                        outline=True,
                                                        hx_get=str(
                                                            request.url_for(
                                                                "runtime_settings:delete_confirm",
                                                                key=reg.key,
                                                            )
                                                        ),
                                                        hx_target="#modal",
                                                    ):
                                                        text("Delete")


@router.get("/edit/{key}", name="runtime_settings:edit")
async def edit_modal(
    request: Request,
    key: str,
) -> None:
    reg = REGISTRY_MAP.get(key)
    if not reg:
        raise HTTPException(status_code=404, detail="Unknown key")

    with modal(f"Edit: {reg.label}", open=True):
        with tag.form(
            method="POST",
            hx_post=str(request.url_for("runtime_settings:save", key=key)),
            hx_target="body",
            classes="flex flex-col gap-4",
        ):
            with tag.label(classes="form-control w-full"):
                with tag.div(classes="label"):
                    with tag.span(classes="label-text"):
                        text("New value")
                with tag.input(
                    type="password",
                    name="value",
                    autocomplete="new-password",
                    classes="input input-bordered w-full",
                    placeholder=f"Enter new {reg.label}",
                    required=True,
                ):
                    pass
            if reg.requires_verification:
                with tag.p(classes="text-sm text-warning"):
                    text(
                        "Saving will reset the verification status. "
                        "Click Test Connection after saving to activate."
                    )
            with tag.div(classes="modal-action"):
                with tag.form(method="dialog"):
                    with button(ghost=True):
                        text("Cancel")
                with button(variant="primary", type="submit"):
                    text("Save")


@router.post("/{key}", name="runtime_settings:save")
async def save(
    request: Request,
    key: str,
    session: AsyncSession = Depends(get_db_session),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    reg = REGISTRY_MAP.get(key)
    if not reg:
        raise HTTPException(status_code=404, detail="Unknown key")

    form_data = await request.form()
    value = form_data.get("value", "")
    if not value or not str(value).strip():
        await add_toast(request, "Value cannot be empty.", "error")
        return HXRedirectResponse(
            request, str(request.url_for("runtime_settings:list"))
        )

    user_id = admin.user.id  # type: ignore[attr-defined]
    try:
        await runtime_settings.set(session, key, str(value).strip(), user_id)
        await session.commit()
    except RuntimeSettingsDisabled:
        # POLAR_RUNTIME_SETTINGS_KEY is not configured on this deployment, so
        # values can't be encrypted at rest. Surface a clear, actionable toast
        # instead of a raw 500 and leave the page intact.
        await session.rollback()
        await add_toast(
            request,
            "Runtime settings storage is disabled: POLAR_RUNTIME_SETTINGS_KEY "
            "is not set on the server. Add it to the deployment secrets and "
            "redeploy, then try again.",
            "error",
        )
        return HXRedirectResponse(
            request, str(request.url_for("runtime_settings:list"))
        )

    if reg.requires_verification:
        await add_toast(request, "Saved. Click Test Connection to activate.", "success")
    else:
        await add_toast(request, f"{reg.label} saved and activated.", "success")

    return HXRedirectResponse(request, str(request.url_for("runtime_settings:list")))


@router.post("/{key}/test", name="runtime_settings:test")
async def test_connection(
    request: Request,
    key: str,
    session: AsyncSession = Depends(get_db_session),
) -> HXRedirectResponse:
    reg = REGISTRY_MAP.get(key)
    if not reg:
        raise HTTPException(status_code=404, detail="Unknown key")

    try:
        row = await runtime_settings.verify(session, key)
        await session.commit()
    except RuntimeSettingsDisabled:
        await session.rollback()
        await add_toast(
            request,
            "Runtime settings storage is disabled: POLAR_RUNTIME_SETTINGS_KEY "
            "is not set on the server. Add it to the deployment secrets and "
            "redeploy, then try again.",
            "error",
        )
        return HXRedirectResponse(
            request, str(request.url_for("runtime_settings:list"))
        )

    if row.status == RuntimeSettingStatus.active:
        await add_toast(request, f"{reg.label}: verification passed ✓", "success")
    else:
        msg = f"{reg.label}: verification failed"
        if row.last_error:
            msg += f" — {row.last_error}"
        await add_toast(request, msg, "error")

    return HXRedirectResponse(request, str(request.url_for("runtime_settings:list")))


@router.get("/{key}/delete", name="runtime_settings:delete_confirm")
async def delete_confirm(
    request: Request,
    key: str,
) -> None:
    reg = REGISTRY_MAP.get(key)
    if not reg:
        raise HTTPException(status_code=404, detail="Unknown key")

    with modal(f"Delete {reg.label}", open=True):
        with tag.p(classes="mb-4"):
            text(
                "This will remove the DB override and revert to the environment variable fallback."
            )
        with tag.div(classes="modal-action"):
            with tag.form(method="dialog"):
                with button(ghost=True):
                    text("Cancel")
            with button(
                variant="error",
                hx_post=str(request.url_for("runtime_settings:delete", key=key)),
                hx_target="body",
            ):
                text("Delete")


@router.post("/{key}/delete", name="runtime_settings:delete")
async def delete(
    request: Request,
    key: str,
    session: AsyncSession = Depends(get_db_session),
) -> HXRedirectResponse:
    reg = REGISTRY_MAP.get(key)
    if not reg:
        raise HTTPException(status_code=404, detail="Unknown key")

    repo = RuntimeSettingsRepository(session)
    row = await repo.get_by_key(key)
    if row:
        await repo.delete(row)
        await session.commit()
        await add_toast(request, "Reverted to env fallback.", "success")
    else:
        await add_toast(request, "No DB override to delete.", "warning")

    return HXRedirectResponse(request, str(request.url_for("runtime_settings:list")))

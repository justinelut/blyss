"""Exception handlers for the backoffice FastAPI app.

The backoffice is a separate FastAPI app mounted at ``/backoffice``. It does
NOT inherit the main app's exception handlers (those are registered on the
outer app in ``polar.app``). Without these handlers, any ``PolarError`` raised
inside a backoffice route — for example ``RuntimeSettingsDisabled`` when
``POLAR_RUNTIME_SETTINGS_KEY`` is unset — bubbles up to Starlette and is
returned as a bare ``500 Internal Server Error`` with no actionable detail.

These handlers translate domain errors into a friendly htmx-aware toast so the
operator sees *why* the action failed instead of a blank 500. For non-htmx
requests we still return an HTML body carrying the message.
"""

from __future__ import annotations

from html import escape

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse

from polar.exceptions import PolarError

from .responses import toast_response

log = structlog.get_logger()


def _is_htmx(request: Request) -> bool:
    return request.headers.get("HX-Request") == "true"


async def backoffice_polar_exception_handler(
    request: Request, exc: PolarError
) -> HTMLResponse:
    """Render a ``PolarError`` as an inline toast instead of a raw 500."""
    log.warning(
        "backoffice.polar_error",
        error=type(exc).__name__,
        detail=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
    )

    # htmx swaps in the OOB toast fragment; status stays 200 so htmx processes
    # the swap. The error semantics live in the toast body + server log.
    if _is_htmx(request):
        return toast_response(exc.message, "error", status_code=200)

    # Non-htmx (direct navigation / curl): return the real status code with a
    # minimal HTML body so the operator still sees the reason.
    return HTMLResponse(
        content=(
            '<div class="alert alert-error" role="alert">'
            f"{escape(exc.message)}"
            "</div>"
        ),
        status_code=exc.status_code,
    )


def add_backoffice_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(
        PolarError,
        backoffice_polar_exception_handler,  # type: ignore[arg-type]
    )


__all__ = ["add_backoffice_exception_handlers"]

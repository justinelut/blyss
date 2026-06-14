from urllib.parse import urlencode

import structlog
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse, Response

from polar.config import settings
from polar.exceptions import (
    PolarError,
    PolarRedirectionError,
    PolarRequestValidationError,
    ResourceNotModified,
)

log = structlog.get_logger()


async def polar_exception_handler(request: Request, exc: PolarError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": type(exc).__name__, "detail": exc.message},
        headers=exc.headers,
    )


async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError | PolarRequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": type(exc).__name__, "detail": jsonable_encoder(exc.errors())},
    )


async def polar_redirection_exception_handler(
    request: Request, exc: PolarRedirectionError
) -> RedirectResponse:
    error_url_params = urlencode(
        {
            "message": exc.message,
            "return_to": exc.return_to or settings.FRONTEND_DEFAULT_RETURN_PATH,
        }
    )
    error_url = f"{settings.generate_frontend_url('/error')}?{error_url_params}"
    return RedirectResponse(error_url, 303)


async def polar_not_modified_handler(
    request: Request, exc: ResourceNotModified
) -> Response:
    return Response(status_code=exc.status_code)


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all for anything that escaped the typed handlers above.

    Why this exists: FastAPI's default 500 path goes through Starlette's
    `ServerErrorMiddleware`, which wraps the WHOLE app — including the
    CORSMiddleware. So unhandled exceptions return a "Internal Server
    Error" plain-text body with NO CORS headers, and the browser can't
    even read the response. The user sees a misleading
    "blocked by CORS policy" error instead of the real 500.

    Returning a JSONResponse from here keeps the response inside the
    FastAPI exception chain, which IS wrapped by CORSMiddleware, so the
    Access-Control-Allow-Origin header sticks. Sentry still receives the
    full trace via its instrumentation hook — we don't swallow the
    exception, just convert it to a JSON response.
    """
    log.exception(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        exc_type=type(exc).__name__,
        # Body kept short on purpose — never leak full traceback details
        # to the client.
        exc_message=str(exc)[:500],
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "detail": "An unexpected error occurred. Please try again.",
        },
    )


def add_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(
        PolarRedirectionError,
        polar_redirection_exception_handler,  # type: ignore
    )
    app.add_exception_handler(
        ResourceNotModified,
        polar_not_modified_handler,  # type: ignore
    )

    app.add_exception_handler(
        RequestValidationError,
        request_validation_exception_handler,  # type: ignore
    )
    app.add_exception_handler(
        PolarRequestValidationError,
        request_validation_exception_handler,  # type: ignore
    )
    app.add_exception_handler(PolarError, polar_exception_handler)  # type: ignore
    # Catch-all — must be registered LAST so the more specific handlers
    # above take precedence. Ensures unhandled exceptions return JSON
    # inside the CORS layer instead of falling through to Starlette's
    # default plain-text 500 (which strips CORS headers).
    app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore

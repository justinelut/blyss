import contextlib
import functools
import re

import dramatiq
import logfire
import sentry_sdk
import structlog
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from polar.logging import CorrelationID, Logger
from polar.operational_errors import handle_operational_error
from polar.worker import JobQueueManager


class ForwardedHostMiddleware:
    """Apply X-Forwarded-Host (or fall back to settings.BASE_URL) to the request scope.

    Uvicorn's --proxy-headers flag handles X-Forwarded-Proto and X-Forwarded-For,
    but not X-Forwarded-Host. AND in K3s + Traefik defaults the forwarded
    headers from upstream Cloudflare are NOT trusted, so X-Forwarded-Proto
    gets overwritten with the Traefik-side scheme (http on cluster-internal),
    which means request.url_for() builds http:// URLs even though the public
    site is https://. This breaks Google OAuth (redirect_uri_mismatch).

    Resolution order, applied to scope:
    1. If X-Forwarded-Host is set by the public proxy → use it.
    2. Else if X-Forwarded-Proto is set (request came through a proxy) and the
       Host header is loopback-ish, fall back to settings.BASE_URL.
    3. Else if settings.BASE_URL is set AND its host matches the request Host
       (i.e. this IS a request for the public app), force the scope's scheme
       and host to settings.BASE_URL — robust to Traefik stripping headers.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    @staticmethod
    def _is_loopback_host(host_header: bytes | None) -> bool:
        if not host_header:
            return True  # no host = anything goes
        host = host_header.decode("latin-1").split(":", 1)[0].strip().lower()
        return host in {"127.0.0.1", "0.0.0.0", "localhost", "::1"}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        # Lazy import to avoid circular import at module load
        from polar.config import settings

        headers = dict(scope.get("headers", []))
        forwarded_host = headers.get(b"x-forwarded-host")
        forwarded_proto = headers.get(b"x-forwarded-proto")
        host_header = headers.get(b"host")

        public_host: str | None = None
        public_scheme: str | None = None

        if forwarded_host:
            public_host = forwarded_host.decode("latin-1").split(",")[0].strip()
            if forwarded_proto:
                public_scheme = (
                    forwarded_proto.decode("latin-1").split(",")[0].strip()
                )
        elif (
            forwarded_proto
            and self._is_loopback_host(host_header)
            and settings.BASE_URL
        ):
            # Behind a proxy that drops/rewrites Host. Use the configured base URL.
            from urllib.parse import urlparse

            parsed = urlparse(str(settings.BASE_URL))
            if parsed.hostname:
                public_host = parsed.netloc
                public_scheme = parsed.scheme

        # Rule 3: if BASE_URL is configured and the request Host matches its
        # hostname (this IS a request for the public app), force scope's scheme
        # and host to BASE_URL. Robust to Traefik/k3s defaults that overwrite
        # X-Forwarded-Proto with the cluster-internal http scheme — so the
        # OAuth redirect_uri stays https://api.example.com/... not http://.
        if not public_host and settings.BASE_URL and host_header:
            from urllib.parse import urlparse

            parsed_base = urlparse(str(settings.BASE_URL))
            if parsed_base.hostname:
                req_host = (
                    host_header.decode("latin-1").split(":", 1)[0].strip().lower()
                )
                if req_host == parsed_base.hostname.lower():
                    public_host = parsed_base.netloc
                    public_scheme = parsed_base.scheme

        if public_host:
            new_headers = [
                (name, value)
                for name, value in scope["headers"]
                if name != b"host"
            ]
            new_headers.append((b"host", public_host.encode("latin-1")))
            scope = dict(scope)
            scope["headers"] = new_headers

            if public_scheme:
                scope["scheme"] = public_scheme

            if ":" in public_host:
                hostname, _, port = public_host.partition(":")
                try:
                    scope["server"] = (hostname, int(port))
                except ValueError:
                    scope["server"] = (hostname, None)
            else:
                default_port = 443 if public_scheme == "https" else 80
                scope["server"] = (public_host, default_port)

        await self.app(scope, receive, send)


class LogCorrelationIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        correlation_id = CorrelationID.set()
        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id, method=scope["method"], path=scope["path"]
        )
        sentry_sdk.set_tag("correlation_id", correlation_id)

        logfire_stack = contextlib.ExitStack()
        logfire_stack.enter_context(logfire.set_baggage(correlation_id=correlation_id))
        # The root span was already created by the OTel ASGI middleware
        # (which runs before this middleware), so baggage won't be picked up
        # automatically. Set the attribute directly on the root span.
        root_span = scope.get("logfire.span")
        if root_span is not None and root_span.is_recording():
            root_span.set_attribute("correlation_id", correlation_id)

        await self.app(scope, receive, send)

        logfire_stack.close()
        structlog.contextvars.unbind_contextvars("correlation_id", "method", "path")
        CorrelationID.clear()


class FlushEnqueuedWorkerJobsMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        async with JobQueueManager.open(dramatiq.get_broker(), scope["state"]["redis"]):
            await self.app(scope, receive, send)


class PathRewriteMiddleware:
    def __init__(
        self, app: ASGIApp, pattern: str | re.Pattern[str], replacement: str
    ) -> None:
        self.app = app
        self.pattern = pattern
        self.replacement = replacement
        self.logger: Logger = structlog.get_logger()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        scope["path"], replacements = re.subn(
            self.pattern, self.replacement, scope["path"]
        )

        if replacements > 0:
            self.logger.warning(
                "PathRewriteMiddleware",
                pattern=self.pattern,
                replacement=self.replacement,
                path=scope["path"],
            )

        send = functools.partial(self.send, send=send, replacements=replacements)
        await self.app(scope, receive, send)

    async def send(self, message: Message, send: Send, replacements: int) -> None:
        if message["type"] != "http.response.start":
            await send(message)
            return

        message.setdefault("headers", [])
        headers = MutableHeaders(scope=message)
        if replacements > 0:
            headers["X-Polar-Deprecation-Notice"] = (
                "The API root has moved from /api/v1 to /v1. "
                "Please update your integration."
            )

        await send(message)


class SandboxResponseHeaderMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                message.setdefault("headers", [])
                headers = MutableHeaders(scope=message)
                headers["X-Polar-Sandbox"] = "1"
            await send(message)

        await self.app(scope, receive, send_wrapper)


class OperationalErrorMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        try:
            await self.app(scope, receive, send)
        except Exception as exc:
            handle_operational_error(exc)
            raise

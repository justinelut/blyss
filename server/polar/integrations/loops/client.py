from typing import TypedDict, Unpack

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from polar.config import settings
from polar.enums import AccountType
from polar.exceptions import PolarError
from polar.logging import Logger

log: Logger = structlog.get_logger()


class Properties(TypedDict, total=False):
    # Loops default properties
    firstName: str
    lastName: str
    notes: str
    source: str
    userGroup: str
    userId: str
    subscribed: bool
    createdAt: str

    # Polar custom properties
    signupIntent: str
    emailLogin: bool
    githubLogin: bool
    googleLogin: bool

    organizationCreated: bool
    organizationSlug: str
    organizationCount: int

    productCreated: bool
    userPatCreated: bool
    webhooksCreated: bool
    lastOrderAt: int

    accountType: AccountType

    # Issue Funding
    githubOrgInstalled: bool
    githubIssueBadged: bool


class LoopsClientError(PolarError): ...


class LoopsClientOperationalError(LoopsClientError):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class LoopsClientLogicalError(LoopsClientError):
    def __init__(self, response: httpx.Response) -> None:
        self.status_code = response.status_code
        self.body = response.text
        message = (
            f"Loops API returned status code {self.status_code} with body: {self.body}"
        )
        super().__init__(message)


class LoopsClient:
    def __init__(self) -> None:
        self.client = httpx.AsyncClient(
            base_url="https://app.loops.so/api/v1",
        )

    async def _auth_headers(self, session: AsyncSession | None = None) -> dict[str, str]:
        """Fetch Loops API key via runtime_settings overlay."""
        from polar.runtime_settings import runtime_settings

        api_key: str | None = None
        if session is not None:
            try:
                api_key = await runtime_settings.get(session, "LOOPS_API_KEY")
            except Exception as e:
                # runtime_settings disabled (no master key), or DB error.
                # Fall through to env so we still have a chance to send.
                log.warning("loops.runtime_settings.unavailable", error=str(e))
                api_key = None
        if not api_key:
            api_key = settings.LOOPS_API_KEY or None

        if not api_key:
            log.warning("loops.disabled: no api key on file")
            return {}
        return {"Authorization": f"Bearer {api_key}"}

    async def update_contact(
        self, email: str, id: str, session: AsyncSession | None = None, **properties: Unpack[Properties]
    ) -> None:
        log.info("loops.contact.update", email=email, id=id, **properties)

        headers = await self._auth_headers(session)
        if not headers:
            return

        try:
            await self._make_request(
                self.client.build_request(
                    "POST",
                    "/contacts/update",
                    json={"email": email, "userId": id, **properties},
                    headers=headers,
                )
            )
            log.info("loops.contact.update.ok", email=email, id=id)
        except LoopsClientLogicalError as e:
            log.error(
                "loops.contact.update.4xx",
                email=email,
                id=id,
                status=e.status_code,
                body=e.body[:300],
            )
            raise
        except LoopsClientOperationalError as e:
            log.error(
                "loops.contact.update.5xx_or_network",
                email=email,
                id=id,
                error=str(e)[:300],
            )
            raise

    async def send_event(
        self,
        email: str,
        event_name: str,
        event_properties: dict[str, str | int | bool] | None = None,
        session: AsyncSession | None = None,
        **contact_properties: Unpack[Properties],
    ) -> None:
        log.debug(
            "loops.events.send",
            email=email,
            event_name=event_name,
            event_properties=event_properties,
            **contact_properties,
        )

        headers = await self._auth_headers(session)
        if not headers:
            return

        await self._make_request(
            self.client.build_request(
                "POST",
                "/events/send",
                json={
                    "email": email,
                    "eventName": event_name,
                    "eventProperties": event_properties or {},
                    **contact_properties,
                },
                headers=headers,
            )
        )

    async def _make_request(self, request: httpx.Request) -> httpx.Response:
        try:
            response = await self.client.send(request)
        except httpx.RequestError as e:
            raise LoopsClientOperationalError(str(e)) from e

        if response.is_server_error or response.status_code == 429:
            raise LoopsClientOperationalError(response.text)
        elif response.is_client_error:
            raise LoopsClientLogicalError(response)

        return response


client = LoopsClient()

__all__ = ["Properties", "client"]

from uuid import UUID

import structlog

from polar.models import CreatorWaitlistEntry, Organization
from polar.postgres import AsyncSession

from .repository import CreatorWaitlistRepository

log = structlog.get_logger()


class CreatorWaitlistService:
    async def join(
        self,
        session: AsyncSession,
        *,
        email: str,
        organization: Organization,
        user_id: UUID | None,
        source: str = "dashboard_country_denial",
    ) -> CreatorWaitlistEntry:
        """Record a waitlist entry, idempotent per (email, country).

        The country is read from the organization's stored creator_country
        (detected at signup) — never from client input — so the demand
        figures the backoffice sees are trustworthy.
        """
        details = organization.details or {}
        country_code = details.get("creator_country")

        repository = CreatorWaitlistRepository.from_session(session)
        existing = await repository.get_by_email_country(email, country_code)
        if existing is not None:
            return existing

        entry = await repository.create(
            CreatorWaitlistEntry(
                email=email,
                country_code=country_code,
                source=source,
                organization_id=organization.id,
                user_id=user_id,
            ),
            flush=True,
        )
        log.info(
            "creator_waitlist.joined",
            organization_id=str(organization.id),
            country_code=country_code,
            source=source,
        )
        return entry


creator_waitlist_service = CreatorWaitlistService()

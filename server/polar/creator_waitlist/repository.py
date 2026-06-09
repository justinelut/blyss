from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select

from polar.kit.repository.base import RepositoryBase
from polar.models import CreatorWaitlistEntry


class CreatorWaitlistRepository(
    RepositoryBase[CreatorWaitlistEntry],
):
    model = CreatorWaitlistEntry

    async def get_by_email_country(
        self, email: str, country_code: str | None
    ) -> CreatorWaitlistEntry | None:
        stmt = self.get_base_statement().where(
            func.lower(CreatorWaitlistEntry.email) == email.lower(),
            CreatorWaitlistEntry.country_code == country_code,
        )
        return await self.get_one_or_none(stmt)

    async def list_recent(
        self, *, limit: int = 200, offset: int = 0
    ) -> Sequence[CreatorWaitlistEntry]:
        stmt = (
            self.get_base_statement()
            .order_by(CreatorWaitlistEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def counts_by_country(self) -> list[tuple[str | None, int]]:
        """Aggregate entry counts by country, highest demand first."""
        stmt = (
            select(
                CreatorWaitlistEntry.country_code,
                func.count(CreatorWaitlistEntry.id),
            )
            .group_by(CreatorWaitlistEntry.country_code)
            .order_by(func.count(CreatorWaitlistEntry.id).desc())
        )
        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def total_count(self) -> int:
        stmt = select(func.count(CreatorWaitlistEntry.id))
        result = await self.session.execute(stmt)
        return int(result.scalar() or 0)

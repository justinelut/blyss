from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select

from polar.kit.repository import RepositoryBase, RepositoryIDMixin
from polar.models import CreatorCategory


class CreatorCategoryRepository(
    RepositoryBase[CreatorCategory],
    RepositoryIDMixin[CreatorCategory, UUID],
):
    model = CreatorCategory

    async def list_all(
        self, *, active_only: bool = False
    ) -> Sequence[CreatorCategory]:
        statement = select(CreatorCategory).order_by(
            CreatorCategory.display_order, CreatorCategory.name
        )
        if active_only:
            statement = statement.where(CreatorCategory.is_active.is_(True))
        return await self.get_all(statement)

    async def get_by_slug(self, slug: str) -> CreatorCategory | None:
        statement = select(CreatorCategory).where(CreatorCategory.slug == slug)
        return await self.get_one_or_none(statement)

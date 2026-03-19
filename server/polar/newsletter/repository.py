from uuid import UUID

from sqlalchemy import select

from polar.kit.repository import RepositoryBase, RepositoryIDMixin
from polar.models import NewsletterSubscription


class NewsletterRepository(
    RepositoryBase[NewsletterSubscription],
    RepositoryIDMixin[NewsletterSubscription, UUID],
):
    model = NewsletterSubscription

    async def get_by_email_and_org(
        self, email: str, organization_id: UUID
    ) -> NewsletterSubscription | None:
        statement = select(NewsletterSubscription).where(
            NewsletterSubscription.email == email,
            NewsletterSubscription.organization_id == organization_id,
        )
        return await self.get_one_or_none(statement)

    async def get_by_token(self, token: str) -> NewsletterSubscription | None:
        statement = select(NewsletterSubscription).where(
            NewsletterSubscription.unsubscribe_token == token
        )
        return await self.get_one_or_none(statement)

    async def get_active_subscribers(
        self, organization_id: UUID
    ) -> list[NewsletterSubscription]:
        statement = select(NewsletterSubscription).where(
            NewsletterSubscription.organization_id == organization_id,
            NewsletterSubscription.is_active.is_(True),
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

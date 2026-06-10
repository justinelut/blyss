from uuid import UUID

from sqlalchemy import select

from polar.kit.pagination import PaginationParams
from polar.kit.repository import RepositoryBase, RepositoryIDMixin
from polar.models import Donation


class DonationRepository(
    RepositoryBase[Donation],
    RepositoryIDMixin[Donation, UUID],
):
    model = Donation

    async def get_by_payment_reference(self, payment_reference: str) -> Donation | None:
        statement = select(Donation).where(
            Donation.payment_reference == payment_reference
        )
        return await self.get_one_or_none(statement)

    async def get_creator_donations(
        self,
        organization_id: UUID,
        pagination: PaginationParams,
    ) -> tuple[list[Donation], int]:
        statement = (
            select(Donation)
            .where(Donation.organization_id == organization_id)
            .order_by(Donation.created_at.desc())
        )

        return await self.paginate(
            statement, limit=pagination.limit, page=pagination.page
        )

    async def get_summary(self, organization_id: UUID) -> tuple[int, int]:
        """Return (total_amount, count) of tips for an organization."""
        from sqlalchemy import func

        stmt = select(
            func.coalesce(func.sum(Donation.amount), 0),
            func.count(Donation.id),
        ).where(Donation.organization_id == organization_id)
        result = await self.session.execute(stmt)
        total, count = result.one()
        return int(total or 0), int(count or 0)

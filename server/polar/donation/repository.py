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

"""GET /v1/paystack-settlements — list settlement events for an organization.

Read-only public-API endpoint. Settlements are written by webhook
handlers in `polar.integrations.paystack.tasks`. The dashboard's
BlyssPayoutLedger calls this to render the real settlement timeline.

Auth: scopes to organization membership via the standard
OrganizationsRead pattern. Non-members get 403; members get only their
own organization's settlements.
"""

from datetime import datetime
from uuid import UUID

from fastapi import Depends, Query
from pydantic import UUID4
from sqlalchemy import desc, func, select

from polar.kit.pagination import ListResource, PaginationParamsQuery
from polar.models.paystack_settlement import PaystackSettlement
from polar.openapi import APITag
from polar.organization.auth import OrganizationsRead
from polar.organization.service import organization as organization_service
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .schemas import PaystackSettlementResponse

router = APIRouter(
    prefix="/paystack-settlements",
    tags=["paystack-settlements", APITag.private],
)


@router.get(
    "/",
    response_model=ListResource[PaystackSettlementResponse],
    summary="List Paystack Settlements",
    description=(
        "Settlement events recorded from Paystack `transfer.*` webhooks "
        "for the given organization. Sorted by `settled_at` descending; "
        "pending events (not yet settled) appear at the top, then "
        "successful + failed + reversed events most recent first."
    ),
)
async def list_settlements(
    auth_subject: OrganizationsRead,
    pagination: PaginationParamsQuery,
    organization_id: UUID4 = Query(
        ...,
        description="Organization to list settlements for.",
    ),
    session: AsyncSession = Depends(get_db_session),
) -> ListResource[PaystackSettlementResponse]:
    # Reuse the standard org access check — `organization_service.get`
    # raises 404 / 403 for non-members.
    organization = await organization_service.get(
        session, auth_subject, organization_id
    )
    if organization is None:
        # 404 — empty list shape for any caller that's not a member.
        return ListResource.from_paginated_results([], 0, pagination)

    base_query = select(PaystackSettlement).where(
        PaystackSettlement.organization_id == organization.id,
        PaystackSettlement.deleted_at.is_(None),
    )

    # Order: pending (no settled_at) first, then most-recent settled.
    # We want "the next-expected settlement" pinned at the top of the
    # ledger, then the historical timeline below.
    ordered_query = base_query.order_by(
        # Postgres treats NULL as larger than any value by default —
        # explicit NULLS FIRST puts pending rows at the top.
        PaystackSettlement.settled_at.desc().nulls_first(),
        PaystackSettlement.created_at.desc(),
    )

    count_result = await session.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar_one()

    page_query = (
        ordered_query
        .offset((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit)
    )
    rows = (await session.execute(page_query)).scalars().all()

    return ListResource.from_paginated_results(
        [
            PaystackSettlementResponse.model_validate(row, from_attributes=True)
            for row in rows
        ],
        total,
        pagination,
    )

"""GET /v1/marketplace/stats — public aggregate counts.

Powers the homepage hero strip + the /start creator-recruitment page.
Three count() / sum() aggregates against the active public catalogue.
Cache-Control: public, s-maxage=300 so the edge serves it for 5
minutes between database hits.

Auth: anonymous — these are public marketing numbers, no PII.
"""

from fastapi import Depends
from fastapi.responses import JSONResponse
from sqlalchemy import func, select

from polar.models import (
    Organization,
    PaystackSettlement,
    PaystackSettlementStatus,
    Product,
)
from polar.openapi import APITag
from polar.organization.visibility import public_organization_filters
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .schemas import MarketplaceStatsResponse

router = APIRouter(
    prefix="/marketplace",
    tags=["marketplace_stats", APITag.public],
)


@router.get(
    "/stats",
    response_model=MarketplaceStatsResponse,
    summary="Marketplace Aggregate Stats",
    description=(
        "Public-facing aggregate numbers for the homepage hero + "
        "creator-recruitment page. Real DB queries — counts of active "
        "creators, live products, sum of Paystack settlements actually "
        "transferred to creator bank/M-Pesa accounts. Edge-cached for "
        "5 minutes."
    ),
)
async def get_marketplace_stats(
    session: AsyncSession = Depends(get_db_session),
) -> JSONResponse:
    # 1. Active public creators — same gates the directory + storefront use.
    creators_count = (
        await session.execute(
            select(func.count(Organization.id)).where(
                *public_organization_filters()
            )
        )
    ).scalar_one() or 0

    # 2. Live products — owned by an active public creator, not archived,
    # not soft-deleted. Joining on Organization makes "ghost" products
    # owned by a deactivated creator drop out of the count, which is
    # the right marketing number (we don't want to advertise products
    # buyers can't actually purchase).
    products_count = (
        await session.execute(
            select(func.count(Product.id))
            .join(Organization, Organization.id == Product.organization_id)
            .where(
                Product.is_archived.is_(False),
                Product.deleted_at.is_(None),
                *public_organization_filters(),
            )
        )
    ).scalar_one() or 0

    # 3. Total paid out — sum of successful Paystack settlement events.
    # Currency is hard-coded to 'kes' for now (same as Blyss's
    # default_presentment_currency); if multi-currency settlements
    # become a thing we'll need to FX-normalise here.
    paid_total_row = (
        await session.execute(
            select(
                func.coalesce(func.sum(PaystackSettlement.amount), 0),
                func.count(PaystackSettlement.id),
            ).where(
                PaystackSettlement.status == PaystackSettlementStatus.success,
                PaystackSettlement.deleted_at.is_(None),
            )
        )
    ).one()
    total_paid_out = int(paid_total_row[0] or 0)
    settlements_count = int(paid_total_row[1] or 0)

    body = MarketplaceStatsResponse(
        creators=creators_count,
        products=products_count,
        total_paid_out=total_paid_out,
        total_paid_out_currency="kes",
        settlements_count=settlements_count,
    )

    # Edge-cache for 5 minutes so the home page doesn't re-query on
    # every paint. stale-while-revalidate=600 keeps the page fast even
    # while the cache is being filled.
    return JSONResponse(
        content=body.model_dump(),
        headers={
            "Cache-Control": (
                "public, s-maxage=300, stale-while-revalidate=600"
            ),
        },
    )

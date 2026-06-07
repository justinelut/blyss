"""Marketplace-level "me" endpoints.

Polar's customer portal at /{org-slug}/portal/* is per-organization by
design — `Customer` is org-scoped at the DB level (organization_id +
unique (org, email)). A single buyer who's purchased from N creators
has N distinct `customer` rows.

This module gives signed-in Blyss users a unified view across all
their per-org customer rows by joining `users.email == customers.email`
and aggregating the orders behind them. The per-creator portal stays
the canonical home for management actions (cancel sub, download files,
license keys, refund) — the aggregator deep-links into it.
"""

from datetime import datetime
from typing import Annotated
from uuid import UUID

import structlog
from fastapi import Depends, Query
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import contains_eager, joinedload, selectinload

from polar.auth.dependencies import WebUserRead
from polar.kit.pagination import PaginationParamsQuery
from polar.kit.schemas import Schema, TimestampedSchema
from polar.models import Customer, Order, Organization, Product, User
from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

log = structlog.get_logger()

router = APIRouter(prefix="/me", tags=["me", APITag.public])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class MeOrderCreator(Schema):
    """Compact creator card for the orders aggregator.

    Just enough for the row to render the wordmark + a deep-link to
    /{slug}/portal/orders/{id}. Avoids pulling the full Organization
    schema (which carries 30+ fields the aggregator doesn't need).
    """

    id: UUID
    name: str
    slug: str
    avatar_url: str | None = None


class MeOrderProduct(Schema):
    """Compact product card.

    Same lean shape — name + thumbnail. Full product details are
    available on the per-creator portal page the user deep-links into.
    """

    id: UUID
    name: str
    thumbnail_url: str | None = Field(
        default=None,
        description="First product media URL, if any.",
    )


class MeOrderItem(TimestampedSchema):
    """A single buyer-side order row."""

    id: UUID
    status: str
    currency: str
    subtotal_amount: int
    discount_amount: int
    tax_amount: int
    refunded_amount: int
    invoice_number: str
    created_at: datetime
    creator: MeOrderCreator
    product: MeOrderProduct | None = None


class MeOrdersResponse(Schema):
    """Paginated list of orders for the auth'd user across all creators."""

    items: list[MeOrderItem]
    pagination: dict


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.get(
    "/orders",
    response_model=MeOrdersResponse,
    summary="List my purchases across all creators",
    responses={
        200: {"description": "List of buyer's orders, newest first."},
    },
)
async def list_my_orders(
    auth_subject: WebUserRead,
    pagination: PaginationParamsQuery,
    session: AsyncSession = Depends(get_db_session),
) -> MeOrdersResponse:
    """Aggregated buyer-side order history.

    Joins `User.email` (case-insensitive) → `Customer.email` (case-
    insensitive) across every organization, then returns the orders
    behind those customer rows. Newest-first.

    The per-creator portal at /{slug}/portal/orders/{id} stays the
    canonical management surface — clients should deep-link there for
    refund / cancel / download actions. This endpoint is purely a
    discovery / aggregation surface for the marketplace shell.

    Auth: `WebUserRead` (the buyer's Blyss user session). Guest buyers
    who never made a Blyss account are unsupported here — they keep
    using the per-creator email-magic-link portal.
    """
    user: User = auth_subject.subject
    page = pagination.page
    limit = pagination.limit

    # Match Customer.email case-insensitively to User.email. Polar's
    # customer rows are created from order receipts and may carry
    # casing different from the user's signup email — the unique
    # index on customers is itself case-insensitive
    # (ix_customers_organization_id_email_case_insensitive).
    email_lower = func.lower(user.email)

    base_filter = func.lower(Customer.email) == email_lower

    # Count first so the response carries total/has_more cheaply.
    count_stmt = (
        select(func.count(Order.id))
        .join(Customer, Customer.id == Order.customer_id)
        .where(base_filter)
    )
    total = (await session.execute(count_stmt)).scalar_one()

    # Eager-load customer → organization (for creator card) and
    # product → product_medias (for thumbnail). We DON'T pull the
    # full product graph (benefits, prices, custom fields) — the
    # aggregator only needs name + first thumb.
    stmt = (
        select(Order)
        .join(Customer, Customer.id == Order.customer_id)
        .where(base_filter)
        .options(
            contains_eager(Order.customer).options(
                joinedload(Customer.organization),
            ),
            joinedload(Order.product).options(
                selectinload(Product.product_medias),
            ),
        )
        .order_by(Order.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    result = await session.execute(stmt)
    orders = result.scalars().unique().all()

    items: list[MeOrderItem] = []
    for order in orders:
        customer: Customer = order.customer
        org: Organization = customer.organization
        product: Product | None = order.product

        thumbnail_url: str | None = None
        if product is not None and product.product_medias:
            first_media = product.product_medias[0]
            file = getattr(first_media, "file", None)
            if file is not None:
                thumbnail_url = getattr(file, "public_url", None)

        items.append(
            MeOrderItem(
                id=order.id,
                status=str(order.status),
                currency=order.currency,
                subtotal_amount=order.subtotal_amount,
                discount_amount=order.discount_amount,
                tax_amount=order.tax_amount,
                refunded_amount=order.refunded_amount,
                invoice_number=order.invoice_number,
                created_at=order.created_at,
                modified_at=order.modified_at,
                creator=MeOrderCreator(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    avatar_url=org.avatar_url,
                ),
                product=(
                    MeOrderProduct(
                        id=product.id,
                        name=product.name,
                        thumbnail_url=thumbnail_url,
                    )
                    if product is not None
                    else None
                ),
            )
        )

    return MeOrdersResponse(
        items=items,
        pagination={
            "total_count": total,
            "max_page": max(1, (total + limit - 1) // limit) if limit else 1,
        },
    )

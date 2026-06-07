"""Marketplace-level "me" endpoints — WebUser-auth aggregation across creators.

Polar's customer portal at /v1/customer-portal/* is per-org by design:
the buyer authenticates per-creator via a magic-link customer-session-
token, and every endpoint filters resources by `customer_id == that
token's customer.id`.

These /v1/me/* endpoints provide the same response shapes (CustomerOrder,
CustomerSubscription, CustomerWallet, ...) but auth via the buyer's
Blyss WebUser session and filter resources by `customer_id IN (every
customer.id this user has across every creator)`.

The frontend portal pages can swap from /v1/customer-portal/* →
/v1/me/* and render the same component tree without any visual
redesign — that's the design goal.
"""

from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

import structlog
from fastapi import Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import contains_eager, joinedload, selectinload

from polar.auth.dependencies import WebUserRead
from polar.customer_portal.schemas.order import CustomerOrder
from polar.customer_portal.schemas.subscription import CustomerSubscription
from polar.customer_portal.schemas.wallet import CustomerWallet
from polar.exceptions import ResourceNotFound
from polar.kit.pagination import ListResource, PaginationParamsQuery
from polar.models import (
    Customer,
    Order,
    OrderItem,
    Product,
    ProductPrice,
    Subscription,
    Wallet,
)
from polar.openapi import APITag
from polar.order.schemas import OrderID
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter
from polar.subscription.schemas import SubscriptionID

from .customer_resolver import get_user_customer_ids

log = structlog.get_logger()

router = APIRouter(prefix="/me", tags=["me", APITag.public])


# ---------------------------------------------------------------------------
# Order eager-load helper — mirrors customer_portal/repository/order.py
# get_eager_options so the CustomerOrder schema serializes with
# product, organization, items, subscription, etc populated.
# ---------------------------------------------------------------------------


def _order_eager_options() -> Sequence:
    return (
        joinedload(Order.customer).joinedload(Customer.organization),
        joinedload(Order.discount),
        joinedload(Order.subscription).joinedload(Subscription.customer),
        joinedload(Order.product).options(
            selectinload(Product.product_medias),
            joinedload(Product.organization),
        ),
        selectinload(Order.items)
        .joinedload(OrderItem.product_price)
        .joinedload(ProductPrice.product),
    )


def _subscription_eager_options() -> Sequence:
    return (
        joinedload(Subscription.customer).joinedload(Customer.organization),
        joinedload(Subscription.product).options(
            selectinload(Product.product_medias),
            joinedload(Product.organization),
        ),
        joinedload(Subscription.discount),
    )


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


@router.get(
    "/orders",
    summary="List my orders across all creators",
    response_model=ListResource[CustomerOrder],
)
async def list_my_orders(
    auth_subject: WebUserRead,
    pagination: PaginationParamsQuery,
    query: str | None = Query(
        None, description="Search by product or organization name."
    ),
    session: AsyncSession = Depends(get_db_session),
) -> ListResource[CustomerOrder]:
    """List the auth'd user's orders aggregated across every creator."""
    customer_ids = await get_user_customer_ids(session, auth_subject.subject)
    if not customer_ids:
        return ListResource.from_paginated_results([], 0, pagination)

    stmt = (
        select(Order)
        .join(Order.product, isouter=True)
        .where(Order.customer_id.in_(customer_ids), Order.deleted_at.is_(None))
        .options(*_order_eager_options())
    )

    if query is not None:
        stmt = stmt.where(Product.name.icontains(query, autoescape=True))

    stmt = stmt.order_by(desc(Order.created_at))

    # Manual pagination — same shape as kit's RepositoryBase.paginate.
    count_stmt = select(Order.id).where(
        Order.customer_id.in_(customer_ids),
        Order.deleted_at.is_(None),
    )
    total = len((await session.execute(count_stmt)).scalars().all())

    page_stmt = stmt.offset((pagination.page - 1) * pagination.limit).limit(
        pagination.limit
    )
    result = await session.execute(page_stmt)
    orders = result.scalars().unique().all()

    return ListResource.from_paginated_results(
        [CustomerOrder.model_validate(o) for o in orders],
        total,
        pagination,
    )


@router.get(
    "/orders/{id}",
    summary="Get my order",
    response_model=CustomerOrder,
    responses={404: {"description": "Order not found."}},
)
async def get_my_order(
    id: OrderID,
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> Order:
    """Fetch one order the auth'd user is entitled to read."""
    customer_ids = await get_user_customer_ids(session, auth_subject.subject)
    if not customer_ids:
        raise ResourceNotFound()

    stmt = (
        select(Order)
        .where(
            Order.id == id,
            Order.customer_id.in_(customer_ids),
            Order.deleted_at.is_(None),
        )
        .options(*_order_eager_options())
    )
    order = (await session.execute(stmt)).unique().scalar_one_or_none()
    if order is None:
        raise ResourceNotFound()
    return order


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------


@router.get(
    "/subscriptions",
    summary="List my subscriptions across all creators",
    response_model=ListResource[CustomerSubscription],
)
async def list_my_subscriptions(
    auth_subject: WebUserRead,
    pagination: PaginationParamsQuery,
    active: bool | None = Query(
        None,
        description="Filter by active status (status in {active, trialing}).",
    ),
    session: AsyncSession = Depends(get_db_session),
) -> ListResource[CustomerSubscription]:
    """List the auth'd user's subscriptions aggregated across every creator."""
    customer_ids = await get_user_customer_ids(session, auth_subject.subject)
    if not customer_ids:
        return ListResource.from_paginated_results([], 0, pagination)

    stmt = (
        select(Subscription)
        .where(
            Subscription.customer_id.in_(customer_ids),
            Subscription.deleted_at.is_(None),
        )
        .options(*_subscription_eager_options())
    )

    if active is True:
        stmt = stmt.where(Subscription.status.in_(["active", "trialing"]))
    elif active is False:
        stmt = stmt.where(Subscription.status.notin_(["active", "trialing"]))

    stmt = stmt.order_by(desc(Subscription.started_at))

    count_stmt = select(Subscription.id).where(
        Subscription.customer_id.in_(customer_ids),
        Subscription.deleted_at.is_(None),
    )
    total = len((await session.execute(count_stmt)).scalars().all())

    page_stmt = stmt.offset((pagination.page - 1) * pagination.limit).limit(
        pagination.limit
    )
    result = await session.execute(page_stmt)
    subscriptions = result.scalars().unique().all()

    return ListResource.from_paginated_results(
        [CustomerSubscription.model_validate(s) for s in subscriptions],
        total,
        pagination,
    )


@router.get(
    "/subscriptions/{id}",
    summary="Get my subscription",
    response_model=CustomerSubscription,
    responses={404: {"description": "Subscription not found."}},
)
async def get_my_subscription(
    id: SubscriptionID,
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> Subscription:
    """Fetch one subscription the auth'd user is entitled to read."""
    customer_ids = await get_user_customer_ids(session, auth_subject.subject)
    if not customer_ids:
        raise ResourceNotFound()

    stmt = (
        select(Subscription)
        .where(
            Subscription.id == id,
            Subscription.customer_id.in_(customer_ids),
            Subscription.deleted_at.is_(None),
        )
        .options(*_subscription_eager_options())
    )
    subscription = (await session.execute(stmt)).unique().scalar_one_or_none()
    if subscription is None:
        raise ResourceNotFound()
    return subscription


# ---------------------------------------------------------------------------
# Wallets
# ---------------------------------------------------------------------------


@router.get(
    "/wallets",
    summary="List my wallets across all creators",
    response_model=ListResource[CustomerWallet],
)
async def list_my_wallets(
    auth_subject: WebUserRead,
    pagination: PaginationParamsQuery,
    session: AsyncSession = Depends(get_db_session),
) -> ListResource[CustomerWallet]:
    """List the auth'd user's wallet balance per creator."""
    customer_ids = await get_user_customer_ids(session, auth_subject.subject)
    if not customer_ids:
        return ListResource.from_paginated_results([], 0, pagination)

    stmt = (
        select(Wallet)
        .where(
            Wallet.customer_id.in_(customer_ids),
            Wallet.deleted_at.is_(None),
        )
        .options(
            joinedload(Wallet.customer).joinedload(Customer.organization)
        )
        .order_by(desc(Wallet.created_at))
    )

    count_stmt = select(Wallet.id).where(
        Wallet.customer_id.in_(customer_ids),
        Wallet.deleted_at.is_(None),
    )
    total = len((await session.execute(count_stmt)).scalars().all())

    page_stmt = stmt.offset((pagination.page - 1) * pagination.limit).limit(
        pagination.limit
    )
    result = await session.execute(page_stmt)
    wallets = result.scalars().unique().all()

    return ListResource.from_paginated_results(
        [CustomerWallet.model_validate(w) for w in wallets],
        total,
        pagination,
    )

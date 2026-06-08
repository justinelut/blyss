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
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.orm import contains_eager, joinedload, selectinload

from polar.auth.dependencies import WebUserRead
from polar.customer_portal.schemas.order import CustomerOrder
from polar.customer_portal.schemas.subscription import CustomerSubscription
from polar.customer_portal.schemas.wallet import CustomerWallet
from polar.customer_session.service import (
    customer_session as customer_session_service,
)
from polar.exceptions import ResourceNotFound
from polar.kit.pagination import ListResource, PaginationParamsQuery
from polar.locker import Locker, get_locker
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
from polar.organization.schemas import OrganizationID
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter
from polar.subscription.schemas import SubscriptionID
from polar.subscription.service import subscription as subscription_service

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


@router.post(
    "/subscriptions/{id}/cancel",
    summary="Cancel my subscription",
    response_model=CustomerSubscription,
    responses={404: {"description": "Subscription not found."}},
)
async def cancel_my_subscription(
    id: SubscriptionID,
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
    locker: Locker = Depends(get_locker),
) -> Subscription:
    """Cancel a subscription owned by the auth'd user.

    Blyss-as-MoR pattern: the buyer self-cancels from /portal/subscriptions
    rather than going through each creator's per-org portal. We control
    renewal billing (P3c), so cancellation is a local DB state change —
    no Paystack/Stripe API call required at cancel time. The renewal
    worker will see canceled_at and skip the next cycle.
    """
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

    log.info(
        "me.subscription.cancel",
        subscription_id=str(id),
        user_id=str(auth_subject.subject.id),
    )
    async with subscription_service.lock(locker, subscription):
        return await subscription_service.cancel(session, subscription)


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


# ---------------------------------------------------------------------------
# Customer-session token mint
# ---------------------------------------------------------------------------


class MeCustomerSessionRequest(BaseModel):
    organization_id: UUID


class MeCustomerSessionResponse(BaseModel):
    token: str
    customer_id: UUID
    organization_id: UUID


@router.post(
    "/customer-session",
    summary="Mint a customer-session token for me + a creator",
    response_model=MeCustomerSessionResponse,
    responses={
        404: {"description": "No customer row exists for this user + creator."},
    },
)
async def create_my_customer_session(
    body: MeCustomerSessionRequest,
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> MeCustomerSessionResponse:
    """Skip-the-magic-link customer-session-token mint.

    The standard customer-session flow requires the buyer to enter
    their email + click a magic-link emailed by the creator. For the
    marketplace portal we want the EXISTING per-creator portal pages
    (orders detail, sub detail, wallet) to "just work" when the buyer
    drills into a creator's section — but they're already authenticated
    as a Blyss user, so making them re-enter their email + wait for an
    email is hostile.

    This endpoint resolves the buyer's customer row for the requested
    org by case-insensitive email match (same rule as
    customer_resolver.get_user_customer_ids), then mints a session
    token via customer_session_service.create_customer_session WITHOUT
    going through the magic-link service. Auth is WebUserRead — so
    only the auth'd user can mint their own token.

    Returns the raw token + customer/org ids. Frontend stores the
    token in the URL query param (`?customer_session_token=…`) when
    deep-linking into a per-creator portal page so that page's
    existing component tree authenticates against the
    /v1/customer-portal/* surface as before.
    """
    user = auth_subject.subject

    stmt = (
        select(Customer)
        .where(
            Customer.organization_id == body.organization_id,
            Customer.deleted_at.is_(None),
        )
        .options(joinedload(Customer.organization))
    )
    result = await session.execute(stmt)
    rows = result.scalars().unique().all()

    # Case-insensitive email match — mirrors the unique
    # ix_customers_organization_id_email_case_insensitive index.
    user_email_lower = (user.email or "").lower()
    customer = next(
        (c for c in rows if (c.email or "").lower() == user_email_lower),
        None,
    )
    if customer is None:
        raise ResourceNotFound()

    token, _ = await customer_session_service.create_customer_session(
        session, customer
    )

    return MeCustomerSessionResponse(
        token=token,
        customer_id=customer.id,
        organization_id=customer.organization_id,
    )

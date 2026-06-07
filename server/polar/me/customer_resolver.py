"""Resolves the set of customer.id rows that belong to a given Blyss user.

`Customer` is org-scoped at the DB level (organization_id + unique
(org, email) index), so a single Blyss user with purchases from N
creators has N customer rows. The marketplace-level /v1/me/*
endpoints filter resources (orders, subscriptions, wallets) using
`customer_id IN (these N ids)`.

Resolution rule: case-insensitive `customers.email == user.email`,
matching the unique-index Polar already uses for customer lookups.
"""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select

from polar.kit.db.postgres import AsyncSession
from polar.models import Customer, User


async def get_user_customer_ids(
    session: AsyncSession, user: User
) -> Sequence[UUID]:
    """Return all customer.id rows whose email matches the user's email.

    Case-insensitive match — mirrors the
    `ix_customers_organization_id_email_case_insensitive` index.

    Returns an empty sequence if the user has never purchased anything
    on Blyss. Callers must handle the empty case (typically returning
    an empty paginated response without hitting the database again).
    """
    stmt = select(Customer.id).where(
        func.lower(Customer.email) == func.lower(user.email),
        Customer.deleted_at.is_(None),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())

"""Seed an admin user.

Polar uses passwordless auth (magic links via email), so the password isn't
stored — admin login still goes through the magic-link flow. This script
creates the user (or marks an existing user as admin) so they can access
the backoffice and admin features.

Usage (must be run from server/ directory with .env loaded):
    uv run python scripts/seed_admin.py justinequartz@gmail.com
"""

import asyncio
import sys
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select

from polar.kit.db.postgres import create_async_sessionmaker
from polar.postgres import create_async_engine
from polar.models import User


async def seed_admin(email: str) -> None:
    engine = create_async_engine("script")
    Session = create_async_sessionmaker(engine)

    async with Session() as session:
        result = await session.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                id=uuid4(),
                email=email.lower(),
                email_verified=True,
                is_admin=True,
                accepted_terms_of_service=True,
                created_at=datetime.now(UTC),
            )
            session.add(user)
            print(f"✓ Created admin user: {email}")
        else:
            user.is_admin = True
            user.email_verified = True
            print(f"✓ Existing user promoted to admin: {email}")

        await session.commit()
        print(f"  User ID: {user.id}")
        print(f"  is_admin: {user.is_admin}")
        print(f"  email_verified: {user.email_verified}")
        print()
        print("Login: visit /login and request a magic link for this email.")

    await engine.dispose()


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python seed_admin.py <email>")
        sys.exit(1)

    email = sys.argv[1]
    asyncio.run(seed_admin(email))


if __name__ == "__main__":
    main()

"""Reset database to clean state before marketplace migration"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from polar.config import settings


async def reset_state():
    engine = create_async_engine(
        settings.get_postgres_dsn("asyncpg"),
        echo=False,
    )

    async with engine.begin() as conn:
        # Reset alembic version to before marketplace migration
        await conn.execute(
            text("UPDATE alembic_version SET version_num = 'c12477d57224'")
        )
        print("✓ Reset alembic version to c12477d57224")

        # Drop marketplace tables in correct order (respecting foreign keys)
        tables = [
            "product_reviews",
            "wishlist_items",
            "product_views",
            "product_category_assignments",
            "product_cart_events",
            "cart_items",
            "newsletter_subscriptions",
            "donations",
            "product_categories",
        ]

        for table in tables:
            await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
            print(f"✓ Dropped {table}")

        # Remove creator_payout_amount column if exists
        await conn.execute(
            text("ALTER TABLE orders DROP COLUMN IF EXISTS creator_payout_amount")
        )
        print("✓ Removed creator_payout_amount from orders")

    await engine.dispose()
    print("\n✓ Database reset complete. Ready for autogenerate.")


if __name__ == "__main__":
    asyncio.run(reset_state())

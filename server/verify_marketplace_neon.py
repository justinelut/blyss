#!/usr/bin/env python3
"""Verify marketplace tables in Neon database"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from polar.config import settings

async def verify():
    db_url = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PWD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DATABASE}"
    engine = create_async_engine(db_url, echo=False)

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT table_name,
                       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
                FROM information_schema.tables t
                WHERE table_schema = 'public'
                AND table_name IN (
                    'cart_items', 'product_categories', 'product_reviews',
                    'product_views', 'wishlist_items', 'product_cart_events',
                    'product_category_assignments', 'donations', 'newsletter_subscriptions'
                )
                ORDER BY table_name
            """))

            print("\n" + "=" * 80)
            print("MARKETPLACE TABLES IN NEON DATABASE")
            print("=" * 80)

            tables = list(result)
            if tables:
                for row in tables:
                    print(f"✓ {row.table_name:<35} ({row.columns} columns)")
                print(f"\nTotal: {len(tables)} marketplace tables created successfully!")
            else:
                print("✗ No marketplace tables found!")

            print("=" * 80)

    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify())

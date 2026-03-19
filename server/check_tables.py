import asyncio

from sqlalchemy import text

from polar.postgres import create_async_engine


async def check_marketplace_tables():
    engine = create_async_engine("script")
    async with engine.connect() as conn:
        result = await conn.execute(
            text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'product_categories',
                'donations',
                'newsletter_subscriptions',
                'cart_items',
                'product_cart_events',
                'product_category_assignments',
                'product_views',
                'wishlist_items',
                'product_reviews'
            )
            ORDER BY table_name
        """)
        )
        tables = [row[0] for row in result]
        if tables:
            print("Marketplace tables found:")
            for table in tables:
                print(f"  ✓ {table}")
        else:
            print("No marketplace tables found")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(check_marketplace_tables())

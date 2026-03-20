#!/usr/bin/env python3
"""
Script to verify all marketplace tables exist in the database
"""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Database connection from .env.production
DATABASE_URL = "postgresql+asyncpg://blyss:BlyssDB2024Secure!@100.114.146.100:5432/blyss"

MARKETPLACE_TABLES = [
    'products',
    'product_media',
    'product_reviews',
    'product_views',
    'product_categories',
    'cart_items',
    'product_cart_events',
    'wishlists',
    'orders',
    'order_items',
    'checkouts',
    'checkout_products',
    'discounts',
    'discount_redemptions',
    'discount_products',
    'license_keys',
    'license_key_activations',
]

async def verify_tables():
    engine = create_async_engine(DATABASE_URL, echo=False)

    try:
        async with engine.connect() as conn:
            print("=" * 80)
            print("MARKETPLACE TABLES VERIFICATION")
            print("=" * 80)
            print()

            # Check which tables exist
            result = await conn.execute(text("""
                SELECT
                    table_name,
                    (SELECT COUNT(*)
                     FROM information_schema.columns
                     WHERE table_name = t.table_name
                     AND table_schema = 'public') as column_count
                FROM information_schema.tables t
                WHERE table_schema = 'public'
                AND table_name = ANY(:tables)
                ORDER BY table_name;
            """), {"tables": MARKETPLACE_TABLES})

            existing_tables = {}
            for row in result:
                existing_tables[row.table_name] = row.column_count

            print(f"Found {len(existing_tables)}/{len(MARKETPLACE_TABLES)} marketplace tables:")
            print()

            for table in MARKETPLACE_TABLES:
                if table in existing_tables:
                    print(f"✓ {table:<30} ({existing_tables[table]} columns)")
                else:
                    print(f"✗ {table:<30} MISSING")

            print()
            print("=" * 80)

            # Show details for key tables
            key_tables = ['cart_items', 'orders', 'order_items', 'products']

            for table in key_tables:
                if table in existing_tables:
                    print()
                    print(f"Table: {table}")
                    print("-" * 80)

                    result = await conn.execute(text("""
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns
                        WHERE table_name = :table
                        AND table_schema = 'public'
                        ORDER BY ordinal_position;
                    """), {"table": table})

                    for row in result:
                        nullable = "NULL" if row.is_nullable == "YES" else "NOT NULL"
                        print(f"  {row.column_name:<30} {row.data_type:<20} {nullable}")

            print()
            print("=" * 80)
            print("VERIFICATION COMPLETE")
            print("=" * 80)

    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify_tables())

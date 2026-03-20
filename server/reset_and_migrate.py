#!/usr/bin/env python3
"""
Drop all tables and run migrations from scratch
This ensures a clean migration state
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from polar.config import settings

async def reset_database():
    """Drop all tables and recreate from migrations"""

    # Build connection URL
    db_url = f"postgresql+asyncpg://{settings.postgres_user}:{settings.postgres_pwd}@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_database}"

    engine = create_async_engine(db_url, echo=True)

    try:
        print("=" * 80)
        print("DROPPING ALL TABLES")
        print("=" * 80)

        async with engine.begin() as conn:
            # Drop all tables in public schema
            await conn.execute(text("""
                DROP SCHEMA public CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO neondb_owner;
                GRANT ALL ON SCHEMA public TO public;
            """))

            print("\n✓ All tables dropped successfully!")
            print("\nNow run: uv run task db_migrate")

    finally:
        await engine.dispose()

if __name__ == "__main__":
    print("\n⚠️  WARNING: This will DROP ALL TABLES in the database!")
    print("Database:", settings.postgres_host)
    response = input("\nAre you sure? Type 'yes' to continue: ")

    if response.lower() == 'yes':
        asyncio.run(reset_database())
    else:
        print("Aborted.")

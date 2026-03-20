#!/usr/bin/env python3
"""
Fix alembic version to point to the latest migration before generating marketplace migration
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os

# Use development database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://blyss:BlyssDB2024Secure!@100.114.146.100:5432/blyss")

async def fix_alembic_version():
    engine = create_async_engine(DATABASE_URL, echo=True)

    try:
        async with engine.begin() as conn:
            # Check current version
            result = await conn.execute(text("SELECT version_num FROM alembic_version"))
            current = result.scalar()
            print(f"\nCurrent alembic version: {current}")

            # The latest migration is 2026-03-17-0301_add_paystack_fields_to_organization.py
            # which has revision c12477d57224
            latest_revision = "c12477d57224"

            print(f"Setting alembic version to: {latest_revision}")

            # Update to latest
            await conn.execute(
                text("UPDATE alembic_version SET version_num = :version"),
                {"version": latest_revision}
            )

            print("✓ Alembic version updated successfully!")
            print("\nNow you can run: uv run alembic revision --autogenerate -m 'add_marketplace_features'")

    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_alembic_version())

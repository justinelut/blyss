import asyncio

from sqlalchemy import text

from polar.postgres import create_async_engine


async def fix_version():
    engine = create_async_engine("script")
    async with engine.begin() as conn:
        # Check current version
        result = await conn.execute(text("SELECT version_num FROM alembic_version"))
        current = result.scalar()
        print(f"Current version: {current}")

        # Update to c12477d57224 (before marketplace)
        await conn.execute(
            text("UPDATE alembic_version SET version_num = 'c12477d57224'")
        )
        print("Updated to: c12477d57224")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(fix_version())

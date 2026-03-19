import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from polar.config import settings


async def drop_all():
    engine = create_async_engine(settings.get_postgres_dsn("asyncpg"))
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO neondb_owner"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
    await engine.dispose()
    print("Database dropped and recreated successfully")


if __name__ == "__main__":
    asyncio.run(drop_all())

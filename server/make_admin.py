import asyncio

from sqlalchemy import text

from polar.postgres import create_async_engine


async def make_admin():
    engine = create_async_engine("script")
    async with engine.begin() as conn:
        result = await conn.execute(
            text("UPDATE users SET is_admin = true WHERE email = :email"),
            {"email": "justinequartz@gmail.com"},
        )
        print(f"Admin access granted! Rows updated: {result.rowcount}")


if __name__ == "__main__":
    asyncio.run(make_admin())

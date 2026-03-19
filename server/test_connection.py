import asyncio

import asyncpg


async def test_connection():
    try:
        conn = await asyncpg.connect(
            host="ep-solitary-sea-adx0qsi6-pooler.c-2.us-east-1.aws.neon.tech",
            port=5432,
            user="neondb_owner",
            password="npg_hsol3R5TamPZ",
            database="neondb",
            ssl="require",
            timeout=60,
            command_timeout=60,
        )
        print("✓ Connection successful!")

        # Test a simple query
        result = await conn.fetchval("SELECT version()")
        print(f"✓ PostgreSQL version: {result}")

        # Check if tables exist
        tables = await conn.fetch("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        """)
        print(f"✓ Found {len(tables)} tables in database")

        await conn.close()
        print("✓ Connection closed successfully")

    except Exception as e:
        print(f"✗ Connection failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_connection())

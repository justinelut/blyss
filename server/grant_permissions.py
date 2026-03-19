import asyncio

import asyncpg


async def grant_permissions():
    try:
        conn = await asyncpg.connect(
            host="ep-solitary-sea-adx0qsi6-pooler.c-2.us-east-1.aws.neon.tech",
            port=5432,
            user="neondb_owner",
            password="npg_hsol3R5TamPZ",
            database="neondb",
            ssl="require",
            timeout=60,
        )
        print("✓ Connected to database")

        # Grant all privileges
        await conn.execute("GRANT ALL PRIVILEGES ON DATABASE neondb TO neondb_owner")
        print("✓ Granted database privileges")

        await conn.execute("GRANT ALL PRIVILEGES ON SCHEMA public TO neondb_owner")
        print("✓ Granted schema privileges")

        await conn.execute(
            "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO neondb_owner"
        )
        print("✓ Granted table privileges")

        await conn.execute(
            "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO neondb_owner"
        )
        print("✓ Granted sequence privileges")

        # Grant REFERENCES privilege specifically for foreign keys
        await conn.execute(
            "GRANT REFERENCES ON ALL TABLES IN SCHEMA public TO neondb_owner"
        )
        print("✓ Granted REFERENCES privilege on all tables")

        await conn.execute(
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO neondb_owner"
        )
        print("✓ Set default table privileges")

        await conn.execute(
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO neondb_owner"
        )
        print("✓ Set default sequence privileges")

        await conn.close()
        print("✓ Permissions granted successfully!")

    except Exception as e:
        print(f"✗ Failed to grant permissions: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(grant_permissions())

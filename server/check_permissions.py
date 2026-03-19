import asyncio

import asyncpg


async def check_permissions():
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

        # Check current user
        current_user = await conn.fetchval("SELECT current_user")
        print(f"Current user: {current_user}")

        # Check if user is superuser
        is_superuser = await conn.fetchval(
            "SELECT rolsuper FROM pg_roles WHERE rolname = $1", current_user
        )
        print(f"Is superuser: {is_superuser}")

        # Check privileges on organizations table
        privileges = await conn.fetch(
            """
            SELECT privilege_type
            FROM information_schema.table_privileges
            WHERE table_schema = 'public'
            AND table_name = 'organizations'
            AND grantee = $1
        """,
            current_user,
        )
        print(
            f"Privileges on organizations table: {[p['privilege_type'] for p in privileges]}"
        )

        # Check if we can create tables
        can_create = await conn.fetchval(
            """
            SELECT has_schema_privilege($1, 'public', 'CREATE')
        """,
            current_user,
        )
        print(f"Can create tables in public schema: {can_create}")

        # Try to create a test table
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS test_permissions_check (
                    id SERIAL PRIMARY KEY,
                    test_column TEXT
                )
            """)
            print("✓ Successfully created test table")

            # Clean up
            await conn.execute("DROP TABLE IF EXISTS test_permissions_check")
            print("✓ Successfully dropped test table")
        except Exception as e:
            print(f"✗ Cannot create tables: {e}")

        await conn.close()

    except Exception as e:
        print(f"✗ Failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(check_permissions())

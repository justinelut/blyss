# Neon Database Setup Issue

## Problem
The migration is failing with: `permission denied for table organizations`

## Root Cause
The database user `neondb_owner` doesn't have sufficient privileges to:
- CREATE TABLE
- ALTER TABLE
- CREATE INDEX
- GRANT permissions

## Solution Required
You need to grant the database user full privileges on the database. Run these SQL commands in the Neon SQL Editor:

```sql
-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE neondb TO neondb_owner;

-- Grant all privileges on the public schema
GRANT ALL PRIVILEGES ON SCHEMA public TO neondb_owner;

-- Grant all privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO neondb_owner;

-- Grant all privileges on all sequences in public schema
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO neondb_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO neondb_owner;
```

## Alternative: Use Neon Console
1. Go to your Neon project dashboard
2. Navigate to the database settings
3. Ensure the role `neondb_owner` has full privileges
4. Or create a new role with SUPERUSER privileges for migrations

## After Fixing Permissions
Run the migration again:
```bash
cd server
uv run alembic upgrade head
```

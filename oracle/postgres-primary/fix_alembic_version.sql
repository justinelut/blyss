-- Fix alembic version to point to latest migration
-- Run this on PostgreSQL primary instance

-- Check current version
SELECT version_num FROM alembic_version;

-- Update to latest migration (add_paystack_fields_to_organization)
UPDATE alembic_version SET version_num = 'c12477d57224';

-- Verify
SELECT version_num FROM alembic_version;

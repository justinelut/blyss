# Migration Status - March 18, 2026

## Current Status: BLOCKED - Database Permissions Issue

### What's Been Done
1. ✅ All existing Polar migrations (up to 2026-03-17) successfully applied to fresh Neon database
2. ✅ Removed redundant `creator_payout_amount` column from Order model (Polar already has `payout_amount` computed property)
3. ✅ Migration file being regenerated without the redundant column
4. ✅ Identified all new marketplace tables that need migration

### Blocking Issue: Database Permissions
**Error**: `permission denied for table organizations`

**Cause**: The Neon database user `neondb_owner` lacks CREATE TABLE privileges

**Solution**: Grant full privileges to the database user via Neon SQL Editor:

```sql
GRANT ALL PRIVILEGES ON DATABASE neondb TO neondb_owner;
GRANT ALL PRIVILEGES ON SCHEMA public TO neondb_owner;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO neondb_owner;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO neondb_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO neondb_owner;
```

### New Marketplace Tables to Migrate
1. **cart_items** - Shopping cart functionality
2. **donations** - Direct donation support
3. **newsletter_subscriptions** - Newsletter management
4. **product_views** - Product analytics
5. **product_categories** - Product categorization
6. **product_category_assignments** - Many-to-many category relationships
7. **wishlist_items** - User wishlists
8. **product_reviews** - Product review system
9. **product_cart_events** - Cart analytics

### Important Finding: Payout System
- **Polar already has payout logic**: `payout_amount = net_amount - platform_fee_amount - refunded_amount`
- **No changes needed**: The existing `platform_fee_amount` column (added in migration 2025-08-11) works for both Stripe and Paystack
- **Tests are correct**: The Paystack tests use `calculate_platform_fee()` helper which is fine - it's just for testing

### Next Steps (After Fixing Permissions)
1. Wait for migration generation to complete
2. Apply the marketplace migration: `uv run alembic upgrade head`
3. Verify all tables created successfully
4. Run linting: `uv run task lint`
5. Run type checking: `uv run task lint_types`
6. Run tests systematically
7. Clean up temporary files (drop_db.py, test_connection.py, this file)

### Database Connection Details
- Using pooler endpoint for better performance
- SSL mode: require
- Connection timeout: 120 seconds (added to config)
- All existing Polar migrations: ✅ Applied
- Marketplace migration: ⏳ Pending permissions fix

#!/bin/bash
# Debug Migrations: Check and run migrations with verbose output
set -e

source "$(dirname "$0")/common.sh"

check_root

log_info "Checking database migrations..."

# Check current migration
log_info "Current migration version:"
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run alembic current -v"

echo ""
log_info "Available migration heads:"
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run alembic heads"

echo ""
log_info "Migration history:"
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run alembic history | head -n 20"

echo ""
log_info "Running migrations with verbose output..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run alembic upgrade head -v"

echo ""
log_info "Checking tables in database..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run python -c \"
from polar.postgres import create_sync_engine
engine = create_sync_engine()
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f'Found {len(tables)} tables:')
for table in sorted(tables)[:20]:
    print(f'  - {table}')
if len(tables) > 20:
    print(f'  ... and {len(tables) - 20} more')
\""

log_success "Migration check completed!"

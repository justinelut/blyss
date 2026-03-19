#!/bin/bash
# Update Script: Pull latest code and restart services
set -e

source "$(dirname "$0")/common.sh"

check_root

echo "=========================================="
echo "  Blyss Application Update"
echo "=========================================="
echo ""

log_info "Pulling latest code..."
su - $APP_USER -c "cd $APP_DIR/blyss && git pull"

log_info "Installing/updating dependencies..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv sync"

log_info "Running database migrations..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task db_migrate"

log_info "Rebuilding email renderer if needed..."
if [ ! -f "$APP_DIR/blyss/server/emails/bin/react-email-pkg" ]; then
    su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task emails"
fi

log_info "Restarting services..."
systemctl restart blyss-api
systemctl restart blyss-worker

# Wait for services to start
sleep 3

echo ""
log_success "Update completed!"
echo ""
echo "Service status:"
systemctl status blyss-api --no-pager -l | head -n 5
echo ""
systemctl status blyss-worker --no-pager -l | head -n 5
echo ""

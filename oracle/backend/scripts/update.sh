#!/bin/bash
# Update Script: Pull latest code and restart services
set -e

source "$(dirname "$0")/common.sh"

check_root

echo "=========================================="
echo "  Blyss Application Update"
echo "=========================================="
echo ""

log_info "Fixing repository permissions..."
chown -R $APP_USER:$APP_USER "$APP_DIR/blyss"

log_info "Pulling latest code (force overwrite)..."
su - $APP_USER -c "cd $APP_DIR/blyss && git fetch origin && git clean -fd && git reset --hard origin/master"

log_info "Syncing .env.production to .env..."
if [ -f "$APP_DIR/blyss/server/.env.production" ]; then
    # Backup current .env
    if [ -f "$APP_DIR/blyss/server/.env" ]; then
        cp "$APP_DIR/blyss/server/.env" "$APP_DIR/blyss/server/.env.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # Copy .env.production to .env
    cp "$APP_DIR/blyss/server/.env.production" "$APP_DIR/blyss/server/.env"
    chown $APP_USER:$APP_USER "$APP_DIR/blyss/server/.env"
    chmod 600 "$APP_DIR/blyss/server/.env"
    log_info ".env updated from .env.production"
fi

log_info "Installing/updating Python dependencies..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv sync"

log_info "Running database migrations..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task db_migrate"

log_info "Checking if emails need rebuilding..."
EMAIL_CHANGED=false
if [ -d "$APP_DIR/blyss/server/emails/.git" ]; then
    # Check if email files changed in last commit
    cd "$APP_DIR/blyss"
    if git diff HEAD~1 HEAD --name-only | grep -q "server/emails/"; then
        EMAIL_CHANGED=true
    fi
fi

if [ "$EMAIL_CHANGED" = true ] || [ ! -f "$APP_DIR/blyss/server/emails/bin/react-email-pkg" ]; then
    log_info "Rebuilding email renderer..."
    su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task emails"
else
    log_info "Email templates unchanged, skipping rebuild"
fi

log_info "Restarting services..."
systemctl restart blyss-api
systemctl restart blyss-worker

# Wait for services to start
sleep 5

echo ""
log_success "Update completed!"
echo ""
echo "Service status:"
systemctl status blyss-api --no-pager -l | head -n 5
echo ""
systemctl status blyss-worker --no-pager -l | head -n 5
echo ""

log_info "Testing API health..."
sleep 2
if curl -f http://localhost:8000/v1/products/public?limit=1 > /dev/null 2>&1; then
    log_success "API is responding correctly!"
else
    log_error "API health check failed! Check logs with: sudo journalctl -u blyss-api -n 50"
fi

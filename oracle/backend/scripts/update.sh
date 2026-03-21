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
    log_success ".env updated from .env.production"
else
    log_error ".env.production not found!"
    exit 1
fi

# Verify .env exists and is readable
if [ ! -f "$APP_DIR/blyss/server/.env" ]; then
    log_error ".env file missing after sync! Cannot proceed."
    exit 1
fi
log_info ".env file verified: $(ls -lh $APP_DIR/blyss/server/.env | awk '{print $5, $9}')"

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

log_info "Checking if backoffice needs rebuilding..."
BACKOFFICE_CHANGED=false
if [ -d "$APP_DIR/blyss/server/polar/backoffice/.git" ]; then
    # Check if backoffice files changed in last commit
    cd "$APP_DIR/blyss"
    if git diff HEAD~1 HEAD --name-only | grep -q "server/polar/backoffice/"; then
        BACKOFFICE_CHANGED=true
    fi
fi

if [ "$BACKOFFICE_CHANGED" = true ] || [ ! -f "$APP_DIR/blyss/server/polar/backoffice/static/styles.css" ] || [ ! -f "$APP_DIR/blyss/server/polar/backoffice/static/scripts.js" ]; then
    log_info "Rebuilding backoffice static assets..."
    su - $APP_USER -c "cd $APP_DIR/blyss/server/polar/backoffice && pnpm install --frozen-lockfile"
    su - $APP_USER -c "cd $APP_DIR/blyss/server/polar/backoffice && pnpm run build"
    log_success "Backoffice assets rebuilt"
else
    log_info "Backoffice files unchanged, skipping rebuild"
fi

log_info "Verifying service configuration..."
# Ensure service file has correct WorkingDirectory
SERVICE_FILE="/etc/systemd/system/blyss-api.service"
if ! grep -q "WorkingDirectory=$APP_DIR/blyss/server" "$SERVICE_FILE" 2>/dev/null; then
    log_warning "Service file needs update, fixing..."
    bash "$(dirname "$0")/fix-service-config.sh"
else
    log_info "Service configuration is correct"
fi

log_info "Restarting services..."
systemctl daemon-reload
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

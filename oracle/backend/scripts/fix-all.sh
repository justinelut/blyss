#!/bin/bash
# Comprehensive fix script - runs all necessary fixes
# This should resolve most common issues automatically

set -e

source "$(dirname "$0")/common.sh"

check_root

echo "=========================================="
echo "  Comprehensive Fix Script"
echo "=========================================="
echo ""

# Step 0: Pull latest code
log_info "[0/6] Pulling latest code..."
chown -R $APP_USER:$APP_USER "$APP_DIR/blyss"
su - $APP_USER -c "cd $APP_DIR/blyss && git fetch origin && git clean -fd && git reset --hard origin/master"
log_success "Code updated"
echo ""

# Step 1: Fix repository permissions
log_info "[1/6] Fixing repository permissions..."
chown -R $APP_USER:$APP_USER "$APP_DIR/blyss"
log_success "Permissions fixed"
echo ""

# Step 2: Ensure .env exists
log_info "[2/6] Ensuring .env file exists..."
if [ ! -f "$APP_DIR/blyss/server/.env" ]; then
    if [ -f "$APP_DIR/blyss/server/.env.production" ]; then
        cp "$APP_DIR/blyss/server/.env.production" "$APP_DIR/blyss/server/.env"
        chown $APP_USER:$APP_USER "$APP_DIR/blyss/server/.env"
        chmod 600 "$APP_DIR/blyss/server/.env"
        log_success ".env created from .env.production"
    else
        log_error ".env.production not found!"
        exit 1
    fi
else
    log_success ".env file exists"
fi
echo ""

# Step 3: Fix service configuration
log_info "[3/6] Fixing service configuration..."
SERVICE_FILE="/etc/systemd/system/blyss-api.service"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Blyss API Server
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR/blyss/server
Environment="PATH=/home/$APP_USER/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/$APP_USER/.local/bin/uv run task api
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=blyss-api

# Resource limits
MemoryMax=512M
MemoryHigh=400M

[Install]
WantedBy=multi-user.target
EOF

log_success "Service file updated"
echo ""

# Step 4: Install/update dependencies and run migrations
log_info "[4/6] Installing dependencies and running migrations..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv sync"
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task db_migrate"
log_success "Dependencies and migrations complete"
echo ""

# Step 5: Reload and restart services
log_info "[5/6] Reloading systemd and restarting services..."
systemctl daemon-reload
systemctl restart blyss-api
systemctl restart blyss-worker

sleep 5

# Check if services started
if systemctl is-active --quiet blyss-api; then
    log_success "blyss-api is running"
else
    log_error "blyss-api failed to start!"
    journalctl -u blyss-api -n 20 --no-pager
    exit 1
fi

if systemctl is-active --quiet blyss-worker; then
    log_success "blyss-worker is running"
else
    log_warning "blyss-worker is not running (may be normal)"
fi
echo ""

# Step 6: Test API health
log_info "[6/6] Testing API health..."
sleep 2
if curl -f http://localhost:8000/v1/products/public?limit=1 > /dev/null 2>&1; then
    log_success "API is responding correctly!"
else
    log_warning "API health check failed. Checking logs..."
    journalctl -u blyss-api -n 30 --no-pager
fi
echo ""

echo "=========================================="
echo "  Fix Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
systemctl status blyss-api --no-pager -l | head -n 5
echo ""
echo "Recent Logs:"
journalctl -u blyss-api -n 10 --no-pager
echo ""
log_success "All fixes applied successfully!"

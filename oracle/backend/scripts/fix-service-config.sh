#!/bin/bash
# Fix service configuration issues
# This ensures the service file has correct WorkingDirectory and .env exists

set -e

source "$(dirname "$0")/common.sh"

check_root

echo "=========================================="
echo "  Fix Service Configuration"
echo "=========================================="
echo ""

log_info "Step 1: Ensuring .env file exists..."
if [ ! -f "$APP_DIR/blyss/server/.env" ]; then
    log_warning ".env file missing! Syncing from .env.production..."
    if [ -f "$APP_DIR/blyss/server/.env.production" ]; then
        cp "$APP_DIR/blyss/server/.env.production" "$APP_DIR/blyss/server/.env"
        chown $APP_USER:$APP_USER "$APP_DIR/blyss/server/.env"
        chmod 600 "$APP_DIR/blyss/server/.env"
        log_success ".env created from .env.production"
    else
        log_error ".env.production not found! Cannot proceed."
        exit 1
    fi
else
    log_success ".env file exists"
fi

log_info "Step 2: Verifying service file configuration..."
SERVICE_FILE="/etc/systemd/system/blyss-api.service"

if [ ! -f "$SERVICE_FILE" ]; then
    log_error "Service file not found! Creating it..."

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

    log_success "Service file created"
else
    log_info "Service file exists, checking configuration..."

    # Check if WorkingDirectory is set correctly
    if ! grep -q "WorkingDirectory=$APP_DIR/blyss/server" "$SERVICE_FILE"; then
        log_warning "WorkingDirectory not set correctly, fixing..."

        # Backup current service file
        cp "$SERVICE_FILE" "$SERVICE_FILE.backup.$(date +%Y%m%d_%H%M%S)"

        # Recreate service file
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
    else
        log_success "Service file configuration is correct"
    fi
fi

log_info "Step 3: Reloading systemd and restarting service..."
systemctl daemon-reload
systemctl restart blyss-api

sleep 3

log_info "Step 4: Checking service status..."
if systemctl is-active --quiet blyss-api; then
    log_success "Service is running!"
    systemctl status blyss-api --no-pager -l | head -n 10
else
    log_error "Service failed to start! Checking logs..."
    journalctl -u blyss-api -n 30 --no-pager
    exit 1
fi

echo ""
log_info "Step 5: Testing API health..."
sleep 2
if curl -f http://localhost:8000/v1/products/public?limit=1 > /dev/null 2>&1; then
    log_success "API is responding correctly!"
else
    log_warning "API health check failed. Recent logs:"
    journalctl -u blyss-api -n 20 --no-pager
fi

echo ""
log_success "Configuration fix completed!"

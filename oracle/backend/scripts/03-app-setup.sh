#!/bin/bash
# Application Setup: Clone repo, setup .env, install dependencies
set -e

source "$(dirname "$0")/common.sh"

log_info "Starting application setup..."

# Clone or update repository
log_info "Setting up repository..."
if [ ! -d "$APP_DIR/blyss" ]; then
    log_info "Cloning repository..."
    su - $APP_USER -c "cd $APP_DIR && git clone https://justinelut:$GITHUB_TOKEN@github.com/justinelut/blyss.git"
else
    log_info "Repository exists, pulling latest changes..."
    su - $APP_USER -c "cd $APP_DIR/blyss && git remote set-url origin https://justinelut:$GITHUB_TOKEN@github.com/justinelut/blyss.git && git pull"
fi

# Setup .env file
log_info "Setting up .env file..."
if [ ! -f "$APP_DIR/blyss/server/.env" ]; then
    cp $APP_DIR/blyss/server/.env.production $APP_DIR/blyss/server/.env
    chown $APP_USER:$APP_USER $APP_DIR/blyss/server/.env
    chmod 600 $APP_DIR/blyss/server/.env
    log_info ".env file created from .env.production"
else
    log_info ".env file already exists, skipping"
fi

# Install Python dependencies
log_info "Installing Python dependencies (this may take a while)..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv sync"

# Generate JWKS (required for JWT authentication)
log_info "Generating JWKS file..."
if [ ! -f "$APP_DIR/blyss/server/.jwks.json" ]; then
    su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task generate_dev_jwks"
    log_info "JWKS file generated"
else
    log_info "JWKS file already exists"
fi

# Build email renderer binary
log_info "Building email renderer binary..."
if [ ! -f "$APP_DIR/blyss/server/emails/bin/react-email-pkg" ]; then
    su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task emails"
    log_info "Email renderer binary built"
else
    log_info "Email renderer binary already exists"
fi

# Build backoffice static assets (CSS and JS)
log_info "Building backoffice static assets..."
if [ ! -f "$APP_DIR/blyss/server/polar/backoffice/static/styles.css" ] || [ ! -f "$APP_DIR/blyss/server/polar/backoffice/static/scripts.js" ]; then
    log_info "Installing backoffice dependencies with pnpm..."
    su - $APP_USER -c "cd $APP_DIR/blyss/server/polar/backoffice && pnpm install --frozen-lockfile"
    
    log_info "Building backoffice assets (CSS + JS)..."
    su - $APP_USER -c "cd $APP_DIR/blyss/server/polar/backoffice && pnpm run build"
    
    log_success "Backoffice static assets built successfully"
else
    log_info "Backoffice static assets already exist"
fi

# Run database migrations (optional - skip if using pre-migrated database)
if [ "${SKIP_MIGRATIONS:-false}" = "false" ]; then
    log_info "Running database migrations..."
    su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task db_migrate"

    # Verify migrations ran
    log_info "Verifying database migrations..."
    MIGRATION_CHECK=$(su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run alembic current 2>&1" || echo "FAILED")
    if [[ "$MIGRATION_CHECK" == *"FAILED"* ]] || [[ "$MIGRATION_CHECK" == *"error"* ]]; then
        log_error "Database migrations may have failed!"
        log_error "Output: $MIGRATION_CHECK"
        log_warn "Continuing anyway, but check database manually"
    else
        log_info "Current migration: $MIGRATION_CHECK"
    fi
else
    log_info "Skipping database migrations (using pre-migrated database)"
fi

# Create log directory
log_info "Creating log directory..."
mkdir -p /var/log/blyss
chown -R $APP_USER:$APP_USER /var/log/blyss

log_success "Application setup completed!"

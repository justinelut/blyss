#!/bin/bash
# User Setup: Create application user and install uv
set -e

source "$(dirname "$0")/common.sh"

log_info "Starting user setup..."

# Create application user
log_info "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash $APP_USER
    log_info "User $APP_USER created"
else
    log_info "User $APP_USER already exists"
fi

# Install uv for Python dependency management
log_info "Installing uv..."
if ! su - $APP_USER -c "command -v uv" &>/dev/null; then
    su - $APP_USER -c "curl -LsSf https://astral.sh/uv/install.sh | sh"
    log_success "uv installed successfully"
else
    log_info "uv already installed"
fi

# Create app directory
log_info "Setting up application directory..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

log_success "User setup completed!"

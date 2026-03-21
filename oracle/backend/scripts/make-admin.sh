#!/bin/bash
# Make Admin Script: Grant admin access to justinequartz@gmail.com
set -e

source "$(dirname "$0")/common.sh"

check_root

log_info "Granting admin access to justinequartz@gmail.com..."

# Run the make_admin.py script
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run python make_admin.py"

log_success "Admin access granted to justinequartz@gmail.com"
log_info "You can now access the backoffice at: https://server.blyss.co.ke/backoffice"

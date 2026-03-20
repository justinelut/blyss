#!/bin/bash

# Script 08: Tailscale VPN Setup for Backend Instance
# Adds Tailscale to existing backend deployment for connecting to other instances

set -e

# Source common configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

log_info "Starting Tailscale VPN setup for backend instance..."

# Check if Tailscale auth key is set
if [ -z "$TAILSCALE_AUTH_KEY" ]; then
    log_error "TAILSCALE_AUTH_KEY not set in common.sh"
    log_info "Get your auth key from: https://login.tailscale.com/admin/settings/keys"
    exit 1
fi

# Install Tailscale
log_info "Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate with Tailscale
log_info "Authenticating with Tailscale..."
tailscale up --authkey="$TAILSCALE_AUTH_KEY" --accept-routes

# Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4)
log_success "Tailscale installed! IP: $TAILSCALE_IP"

# Save Tailscale IP for reference
echo "$TAILSCALE_IP" > /opt/blyss/tailscale-ip.txt
log_info "Tailscale IP saved to /opt/blyss/tailscale-ip.txt"

# Display connection info
log_info "Tailscale setup complete!"
log_info "Backend Tailscale IP: $TAILSCALE_IP"
log_info ""
log_info "Next steps:"
log_info "1. Deploy other instances (PostgreSQL, Redis, MinIO, Monitoring)"
log_info "2. Note their Tailscale IPs"
log_info "3. Update /opt/blyss/blyss/server/.env with new service IPs"
log_info "4. Restart services: sudo systemctl restart blyss-api blyss-worker"

exit 0

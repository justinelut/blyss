#!/bin/bash

# Tailscale VPN Setup Script
# Installs and configures Tailscale for secure inter-instance communication

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root
check_tailscale_key

log_info "Starting Tailscale setup..."

# Install Tailscale
log_info "Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale
log_info "Connecting to Tailscale network..."
tailscale up --authkey="$TAILSCALE_AUTH_KEY" --hostname="$INSTANCE_NAME" --accept-routes

# Wait for Tailscale to be ready
sleep 5

# Get Tailscale IP
TAILSCALE_IP=$(get_tailscale_ip)

if [ "$TAILSCALE_IP" = "not_connected" ]; then
    log_error "Failed to connect to Tailscale"
    exit 1
fi

log_info "Tailscale connected successfully!"
log_info "Tailscale IP: $TAILSCALE_IP"
log_info "Hostname: $INSTANCE_NAME"

# Save Tailscale IP for other scripts
echo "$TAILSCALE_IP" > "$APP_DIR/tailscale_ip.txt"

# Configure Tailscale to start on boot
systemctl enable tailscaled

# Show Tailscale status
log_info "Tailscale status:"
tailscale status

log_info "Tailscale setup completed successfully!"
log_info "IMPORTANT: Note your Tailscale IP: $TAILSCALE_IP"
log_info "You'll need this IP to configure other instances"

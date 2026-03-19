#!/bin/bash

# Tailscale Setup for Standby

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root
check_tailscale_key

log_info "Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh

log_info "Connecting to Tailscale..."
tailscale up --authkey="$TAILSCALE_AUTH_KEY" --hostname="$INSTANCE_NAME" --accept-routes

sleep 5

TAILSCALE_IP=$(get_tailscale_ip)
if [ "$TAILSCALE_IP" = "not_connected" ]; then
    log_error "Failed to connect to Tailscale"
    exit 1
fi

log_info "Tailscale connected: $TAILSCALE_IP"
echo "$TAILSCALE_IP" > "$APP_DIR/tailscale_ip.txt"

systemctl enable tailscaled

log_info "Tailscale setup completed!"

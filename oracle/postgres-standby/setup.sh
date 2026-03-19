#!/bin/bash

# Main Setup Script for PostgreSQL Standby Instance

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/common.sh"

check_root

log_info "========================================="
log_info "PostgreSQL Standby Deployment"
log_info "========================================="
log_info ""

# Run all setup scripts
bash "$SCRIPT_DIR/scripts/01-system-setup.sh"
bash "$SCRIPT_DIR/scripts/02-tailscale-setup.sh"
bash "$SCRIPT_DIR/scripts/03-postgres-replica-setup.sh"
bash "$SCRIPT_DIR/scripts/04-backup-setup.sh"
bash "$SCRIPT_DIR/scripts/05-pgbouncer-setup.sh"

TAILSCALE_IP=$(get_tailscale_ip)

log_info "========================================="
log_info "Deployment Completed!"
log_info "========================================="
log_info ""
log_info "PostgreSQL Standby is now running!"
log_info "  Tailscale IP: $TAILSCALE_IP"
log_info "  Port: 5432 (PostgreSQL), 6432 (PgBouncer)"
log_info ""
log_info "Connection (Read-only):"
log_info "  postgresql://$POSTGRES_APP_USER:$POSTGRES_APP_PASSWORD@$TAILSCALE_IP:6432/$POSTGRES_APP_DATABASE"
log_info ""
log_info "Backups: Daily at 2 AM, 7-day retention"
log_info "Location: /var/backups/postgresql/"
log_info ""

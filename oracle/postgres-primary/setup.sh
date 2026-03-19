#!/bin/bash

# Main Setup Script for PostgreSQL Primary Instance
# Orchestrates all deployment scripts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/common.sh"

check_root

# Parse command line arguments
SKIP_SYSTEM=false
SKIP_TAILSCALE=false
SKIP_POSTGRES=false
SKIP_PGBOUNCER=false
SKIP_MONITORING=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-system)
            SKIP_SYSTEM=true
            shift
            ;;
        --skip-tailscale)
            SKIP_TAILSCALE=true
            shift
            ;;
        --skip-postgres)
            SKIP_POSTGRES=true
            shift
            ;;
        --skip-pgbouncer)
            SKIP_PGBOUNCER=true
            shift
            ;;
        --skip-monitoring)
            SKIP_MONITORING=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-system       Skip system setup"
            echo "  --skip-tailscale    Skip Tailscale setup"
            echo "  --skip-postgres     Skip PostgreSQL setup"
            echo "  --skip-pgbouncer    Skip PgBouncer setup"
            echo "  --skip-monitoring   Skip monitoring setup"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

log_info "========================================="
log_info "PostgreSQL Primary Deployment"
log_info "========================================="
log_info ""

# Step 1: System Setup
if [ "$SKIP_SYSTEM" = false ]; then
    log_info "Step 1/5: System Setup"
    bash "$SCRIPT_DIR/scripts/01-system-setup.sh"
    log_info ""
else
    log_warn "Skipping system setup"
fi

# Step 2: Tailscale Setup
if [ "$SKIP_TAILSCALE" = false ]; then
    log_info "Step 2/5: Tailscale VPN Setup"
    bash "$SCRIPT_DIR/scripts/02-tailscale-setup.sh"
    log_info ""
else
    log_warn "Skipping Tailscale setup"
fi

# Step 3: PostgreSQL Setup
if [ "$SKIP_POSTGRES" = false ]; then
    log_info "Step 3/5: PostgreSQL Setup"
    bash "$SCRIPT_DIR/scripts/03-postgres-setup.sh"
    log_info ""
else
    log_warn "Skipping PostgreSQL setup"
fi

# Step 4: PgBouncer Setup
if [ "$SKIP_PGBOUNCER" = false ]; then
    log_info "Step 4/5: PgBouncer Setup"
    bash "$SCRIPT_DIR/scripts/04-pgbouncer-setup.sh"
    log_info ""
else
    log_warn "Skipping PgBouncer setup"
fi

# Step 5: Monitoring Setup
if [ "$SKIP_MONITORING" = false ]; then
    log_info "Step 5/5: Monitoring Setup"
    bash "$SCRIPT_DIR/scripts/05-monitoring-setup.sh"
    log_info ""
else
    log_warn "Skipping monitoring setup"
fi

# Get Tailscale IP
TAILSCALE_IP=$(get_tailscale_ip)

log_info "========================================="
log_info "Deployment Completed Successfully!"
log_info "========================================="
log_info ""
log_info "PostgreSQL Primary is now running!"
log_info ""
log_info "Connection Details:"
log_info "  Tailscale IP: $TAILSCALE_IP"
log_info "  PostgreSQL Port: 5432"
log_info "  PgBouncer Port: 6432 (recommended)"
log_info "  Database: $POSTGRES_APP_DATABASE"
log_info "  User: $POSTGRES_APP_USER"
log_info ""
log_info "Connection Strings:"
log_info "  Direct: postgresql://$POSTGRES_APP_USER:$POSTGRES_APP_PASSWORD@$TAILSCALE_IP:5432/$POSTGRES_APP_DATABASE"
log_info "  PgBouncer: postgresql://$POSTGRES_APP_USER:$POSTGRES_APP_PASSWORD@$TAILSCALE_IP:6432/$POSTGRES_APP_DATABASE"
log_info ""
log_info "Next Steps:"
log_info "  1. Note your Tailscale IP: $TAILSCALE_IP"
log_info "  2. Update backend .env with this IP"
log_info "  3. Deploy Instance 3 (PostgreSQL Standby)"
log_info "  4. Test connection from backend"
log_info ""
log_info "Service Management:"
log_info "  sudo systemctl status postgresql"
log_info "  sudo systemctl status pgbouncer"
log_info "  sudo systemctl status node_exporter"
log_info ""
log_info "Logs:"
log_info "  sudo tail -f /var/log/postgresql/postgresql-16-main.log"
log_info "  sudo journalctl -u pgbouncer -f"
log_info ""

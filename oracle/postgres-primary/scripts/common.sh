#!/bin/bash

# Common configuration for PostgreSQL Primary deployment
# This file is sourced by all other scripts

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
export INSTANCE_NAME="postgres-primary"
export POSTGRES_VERSION="16"
export PGBOUNCER_VERSION="1.21.0"

# Tailscale Configuration
# Auth key expires: 90 days from creation
# Get new key from: https://login.tailscale.com/admin/settings/keys
export TAILSCALE_AUTH_KEY="${TAILSCALE_AUTH_KEY:-tskey-auth-kD3Ykw1dpn11CNTRL-iT4yBCuaiycedwCuPWBYycXdzybzVeFN6}"

# Database Configuration
export POSTGRES_SUPERUSER="postgres"
export POSTGRES_SUPERUSER_PASSWORD="ChangeMeInProduction123!"
export POSTGRES_APP_USER="blyss"
export POSTGRES_APP_PASSWORD="BlyssDB2024Secure!"
export POSTGRES_APP_DATABASE="blyss"
export POSTGRES_REPLICATION_USER="replicator"
export POSTGRES_REPLICATION_PASSWORD="ReplicateSecure2024!"

# PgBouncer Configuration
export PGBOUNCER_POOL_MODE="transaction"
export PGBOUNCER_MAX_CLIENT_CONN="100"
export PGBOUNCER_DEFAULT_POOL_SIZE="25"

# System Configuration
export SWAP_SIZE="2G"
export SWAP_SWAPPINESS="10"

# Directories
export APP_DIR="/opt/blyss"
export LOG_DIR="/var/log/blyss"
export BACKUP_DIR="/var/backups/postgresql"

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$BACKUP_DIR"
    chmod 755 "$LOG_DIR"
    chmod 700 "$BACKUP_DIR"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Check if Tailscale auth key is set
check_tailscale_key() {
    if [ "$TAILSCALE_AUTH_KEY" = "YOUR_TAILSCALE_AUTH_KEY_HERE" ]; then
        log_error "Please set your Tailscale auth key in scripts/common.sh"
        log_info "Get your auth key from: https://login.tailscale.com/admin/settings/keys"
        exit 1
    fi
}

# Get Tailscale IP
get_tailscale_ip() {
    tailscale ip -4 2>/dev/null || echo "not_connected"
}

# Wait for service to be ready
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    log_info "Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if systemctl is-active --quiet "$service"; then
            log_info "$service is ready"
            return 0
        fi
        log_warn "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "$service failed to start"
    return 1
}

# Export functions for use in other scripts
export -f log_info
export -f log_warn
export -f log_error
export -f create_directories
export -f check_root
export -f check_tailscale_key
export -f get_tailscale_ip
export -f wait_for_service

#!/bin/bash

# Common configuration for PostgreSQL Standby deployment

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
export INSTANCE_NAME="postgres-standby"
export POSTGRES_VERSION="16"

# Tailscale Configuration
# Auth key expires: 90 days from creation
export TAILSCALE_AUTH_KEY="${TAILSCALE_AUTH_KEY:-tskey-auth-kD3Ykw1dpn11CNTRL-iT4yBCuaiycedwCuPWBYycXdzybzVeFN6}"

# Primary Database Configuration
# IMPORTANT: Set this to the Tailscale IP of Instance 2 (PostgreSQL Primary)
export PRIMARY_HOST="${PRIMARY_HOST:-100.64.0.2}"
export PRIMARY_PORT="5432"

# Database Configuration (must match primary)
export POSTGRES_APP_USER="blyss"
export POSTGRES_APP_PASSWORD="BlyssDB2024Secure!"
export POSTGRES_APP_DATABASE="blyss"
export POSTGRES_REPLICATION_USER="replicator"
export POSTGRES_REPLICATION_PASSWORD="ReplicateSecure2024!"

# PgBouncer Configuration
export PGBOUNCER_POOL_MODE="transaction"
export PGBOUNCER_MAX_CLIENT_CONN="100"
export PGBOUNCER_DEFAULT_POOL_SIZE="25"

# Backup Configuration
export BACKUP_RETENTION_DAYS="7"
export BACKUP_TIME="02:00"  # 2 AM daily

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
        exit 1
    fi
}

# Check if primary host is set
check_primary_host() {
    if [ "$PRIMARY_HOST" = "100.64.0.2" ]; then
        log_warn "Using default primary host IP. Make sure this is correct!"
        log_info "Primary host: $PRIMARY_HOST"
        read -p "Is this correct? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Please set PRIMARY_HOST in scripts/common.sh"
            exit 1
        fi
    fi
}

# Get Tailscale IP
get_tailscale_ip() {
    tailscale ip -4 2>/dev/null || echo "not_connected"
}

# Wait for service
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

# Export functions
export -f log_info
export -f log_warn
export -f log_error
export -f create_directories
export -f check_root
export -f check_tailscale_key
export -f check_primary_host
export -f get_tailscale_ip
export -f wait_for_service

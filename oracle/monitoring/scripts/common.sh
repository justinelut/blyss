#!/bin/bash

set -e
set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

export INSTANCE_NAME="monitoring"
# Tailscale auth key expires: 90 days from creation
export TAILSCALE_AUTH_KEY="${TAILSCALE_AUTH_KEY:-tskey-auth-kD3Ykw1dpn11CNTRL-iT4yBCuaiycedwCuPWBYycXdzybzVeFN6}"

# Instance Tailscale IPs (set these after deploying other instances)
export BACKEND_IP="${BACKEND_IP:-100.64.0.1}"
export POSTGRES_PRIMARY_IP="${POSTGRES_PRIMARY_IP:-100.64.0.2}"
export POSTGRES_STANDBY_IP="${POSTGRES_STANDBY_IP:-100.64.0.3}"
export REDIS_MINIO_IP="${REDIS_MINIO_IP:-100.64.0.4}"

# Grafana Configuration
export GRAFANA_ADMIN_PASSWORD="admin"  # Change after first login
export DOMAIN="${DOMAIN:-monitor.blyss.co.ke}"

export SWAP_SIZE="2G"
export APP_DIR="/opt/blyss"
export LOG_DIR="/var/log/blyss"

create_directories() {
    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Must run as root"
        exit 1
    fi
}

check_tailscale_key() {
    if [ "$TAILSCALE_AUTH_KEY" = "YOUR_TAILSCALE_AUTH_KEY_HERE" ]; then
        log_error "Set Tailscale auth key"
        exit 1
    fi
}

get_tailscale_ip() {
    tailscale ip -4 2>/dev/null || echo "not_connected"
}

wait_for_service() {
    local service=$1
    for i in {1..30}; do
        if systemctl is-active --quiet "$service"; then
            log_info "$service is ready"
            return 0
        fi
        sleep 2
    done
    log_error "$service failed"
    return 1
}

export -f log_info log_warn log_error create_directories check_root check_tailscale_key get_tailscale_ip wait_for_service

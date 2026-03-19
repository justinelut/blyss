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

export INSTANCE_NAME="redis-minio"
# Tailscale auth key expires: 90 days from creation
export TAILSCALE_AUTH_KEY="${TAILSCALE_AUTH_KEY:-tskey-auth-kD3Ykw1dpn11CNTRL-iT4yBCuaiycedwCuPWBYycXdzybzVeFN6}"

# Redis Configuration
export REDIS_PASSWORD="RedisSecure2024!"
export REDIS_MAX_MEMORY="512mb"
export REDIS_MAX_MEMORY_POLICY="allkeys-lru"

# MinIO Configuration
export MINIO_ROOT_USER="minioadmin"
export MINIO_ROOT_PASSWORD="minioadmin123"
export MINIO_DATA_DIR="/mnt/minio/data"
export MINIO_BUCKETS="blyss-files blyss-public"

# Domain (optional)
export DOMAIN="${DOMAIN:-storage.blyss.co.ke}"

export SWAP_SIZE="2G"
export SWAP_SWAPPINESS="10"
export APP_DIR="/opt/blyss"
export LOG_DIR="/var/log/blyss"

create_directories() {
    mkdir -p "$LOG_DIR" "$MINIO_DATA_DIR"
    chmod 755 "$LOG_DIR"
    chmod 755 "$MINIO_DATA_DIR"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Must run as root"
        exit 1
    fi
}

check_tailscale_key() {
    if [ "$TAILSCALE_AUTH_KEY" = "YOUR_TAILSCALE_AUTH_KEY_HERE" ]; then
        log_error "Set Tailscale auth key in scripts/common.sh"
        exit 1
    fi
}

get_tailscale_ip() {
    tailscale ip -4 2>/dev/null || echo "not_connected"
}

wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if systemctl is-active --quiet "$service"; then
            log_info "$service is ready"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    log_error "$service failed to start"
    return 1
}

export -f log_info log_warn log_error create_directories check_root check_tailscale_key get_tailscale_ip wait_for_service

#!/bin/bash
# Common configuration and functions

# Configuration
export REPO_URL="https://github.com/justinelut/blyss.git"
export DOMAIN="server.blyss.co.ke"
export APP_DIR="/opt/blyss"
export APP_USER="blyss"
export GITHUB_TOKEN="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"
export SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-false}"  # Set to true to skip migrations

# Tailscale Configuration (for backend instance)
# Auth key expires: 90 days from creation
export TAILSCALE_AUTH_KEY="${TAILSCALE_AUTH_KEY:-tskey-auth-kD3Ykw1dpn11CNTRL-iT4yBCuaiycedwCuPWBYycXdzybzVeFN6}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${BLUE}[SUCCESS]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root (use sudo)"
        exit 1
    fi
}

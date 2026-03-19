#!/bin/bash
# System Setup: Updates, packages, swap, firewall
set -e

source "$(dirname "$0")/common.sh"

log_info "Starting system setup..."

# System Update
log_info "Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt install -y \
    python3.12 \
    python3.12-venv \
    python3-pip \
    nginx \
    git \
    curl \
    wget \
    build-essential \
    libpq-dev \
    certbot \
    python3-certbot-nginx \
    htop \
    ufw

# Create swap (critical for 1GB RAM)
log_info "Setting up 2GB swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    log_info "Swap created and enabled"
else
    log_info "Swap file already exists, skipping creation"
    if ! swapon --show | grep -q '/swapfile'; then
        swapon /swapfile
        log_info "Swap enabled"
    fi
fi

# Configure swappiness
if ! grep -q 'vm.swappiness=10' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi
sysctl vm.swappiness=10

# Configure firewall
log_info "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

log_success "System setup completed!"

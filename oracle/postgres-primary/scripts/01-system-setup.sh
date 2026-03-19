#!/bin/bash

# System Setup Script for PostgreSQL Primary
# Installs system packages, configures swap, and sets up firewall

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

log_info "Starting system setup for PostgreSQL Primary..."

# Update system packages
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    software-properties-common \
    ufw \
    htop \
    vim \
    net-tools \
    postgresql-common

# Configure swap
log_info "Configuring swap memory..."
if [ ! -f /swapfile ]; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_info "Swap file created: $SWAP_SIZE"
else
    log_warn "Swap file already exists, skipping..."
fi

# Configure swappiness
sysctl vm.swappiness="$SWAP_SWAPPINESS"
echo "vm.swappiness=$SWAP_SWAPPINESS" >> /etc/sysctl.conf

# Configure firewall
log_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp comment 'SSH'

# Allow Tailscale
ufw allow 41641/udp comment 'Tailscale'

# PostgreSQL and PgBouncer will only be accessible via Tailscale
# No public access needed

ufw --force enable
log_info "Firewall configured"

# Optimize system for PostgreSQL
log_info "Optimizing system for PostgreSQL..."

# Increase shared memory
sysctl -w kernel.shmmax=268435456
sysctl -w kernel.shmall=268435456
echo "kernel.shmmax=268435456" >> /etc/sysctl.conf
echo "kernel.shmall=268435456" >> /etc/sysctl.conf

# Increase file descriptors
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Disable transparent huge pages (recommended for databases)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Make it persistent
cat > /etc/systemd/system/disable-thp.service <<EOF
[Unit]
Description=Disable Transparent Huge Pages (THP)
DefaultDependencies=no
After=sysinit.target local-fs.target
Before=postgresql.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled'
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/defrag'

[Install]
WantedBy=basic.target
EOF

systemctl daemon-reload
systemctl enable disable-thp.service
systemctl start disable-thp.service

create_directories

log_info "System setup completed successfully!"

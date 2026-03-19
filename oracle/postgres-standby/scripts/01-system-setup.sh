#!/bin/bash

# System Setup Script for PostgreSQL Standby
# Same as primary but for standby instance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

log_info "Starting system setup for PostgreSQL Standby..."

# Update and install packages
apt-get update
apt-get upgrade -y
apt-get install -y curl wget gnupg lsb-release ca-certificates apt-transport-https \
    software-properties-common ufw htop vim net-tools postgresql-common

# Configure swap
if [ ! -f /swapfile ]; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_info "Swap file created: $SWAP_SIZE"
fi

sysctl vm.swappiness="$SWAP_SWAPPINESS"
echo "vm.swappiness=$SWAP_SWAPPINESS" >> /etc/sysctl.conf

# Configure firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 41641/udp comment 'Tailscale'
ufw --force enable

# Optimize for PostgreSQL
sysctl -w kernel.shmmax=268435456
sysctl -w kernel.shmall=268435456
echo "kernel.shmmax=268435456" >> /etc/sysctl.conf
echo "kernel.shmall=268435456" >> /etc/sysctl.conf

echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Disable transparent huge pages
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

cat > /etc/systemd/system/disable-thp.service <<EOF
[Unit]
Description=Disable Transparent Huge Pages
After=sysinit.target local-fs.target

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

log_info "System setup completed!"

#!/bin/bash

# Monitoring Setup Script
# Installs Node Exporter for Prometheus metrics

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

log_info "Starting monitoring setup..."

# Install Node Exporter
log_info "Installing Node Exporter..."
NODE_EXPORTER_VERSION="1.7.0"
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
tar xvfz node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
cp node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64*

# Create node_exporter user
useradd --no-create-home --shell /bin/false node_exporter || true

# Create systemd service
cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

# Enable and start Node Exporter
systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

wait_for_service node_exporter

# Get Tailscale IP
TAILSCALE_IP=$(get_tailscale_ip)

log_info "Node Exporter is running"
log_info "Metrics available at: http://$TAILSCALE_IP:9100/metrics"

log_info "Monitoring setup completed successfully!"

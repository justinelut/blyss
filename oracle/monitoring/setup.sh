#!/bin/bash

# Complete Monitoring Stack Setup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/common.sh"

check_root
check_tailscale_key

log_info "========================================="
log_info "Monitoring Stack Deployment"
log_info "========================================="

# System Setup
log_info "Step 1/5: System Setup..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget ufw nginx certbot python3-certbot-nginx

# Swap
if [ ! -f /swapfile ]; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 41641/udp
ufw --force enable

create_directories

# Tailscale
log_info "Step 2/5: Tailscale Setup..."
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --authkey="$TAILSCALE_AUTH_KEY" --hostname="$INSTANCE_NAME" --accept-routes
sleep 5
TAILSCALE_IP=$(get_tailscale_ip)
log_info "Tailscale IP: $TAILSCALE_IP"

# Prometheus
log_info "Step 3/5: Prometheus Setup..."
useradd --no-create-home --shell /bin/false prometheus || true
mkdir -p /etc/prometheus /var/lib/prometheus
chown prometheus:prometheus /var/lib/prometheus

PROM_VERSION="2.48.0"
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz
tar xvf prometheus-${PROM_VERSION}.linux-amd64.tar.gz
cp prometheus-${PROM_VERSION}.linux-amd64/prometheus /usr/local/bin/
cp prometheus-${PROM_VERSION}.linux-amd64/promtool /usr/local/bin/
cp -r prometheus-${PROM_VERSION}.linux-amd64/consoles /etc/prometheus
cp -r prometheus-${PROM_VERSION}.linux-amd64/console_libraries /etc/prometheus
chown -R prometheus:prometheus /etc/prometheus
rm -rf prometheus-${PROM_VERSION}.linux-amd64*

# Prometheus config
cat > /etc/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    static_configs:
      - targets: ['$BACKEND_IP:9100']

  - job_name: 'postgres-primary'
    static_configs:
      - targets: ['$POSTGRES_PRIMARY_IP:9100']

  - job_name: 'postgres-standby'
    static_configs:
      - targets: ['$POSTGRES_STANDBY_IP:9100']

  - job_name: 'redis-minio'
    static_configs:
      - targets: ['$REDIS_MINIO_IP:9100']

  - job_name: 'monitoring'
    static_configs:
      - targets: ['$TAILSCALE_IP:9100']
EOF

chown prometheus:prometheus /etc/prometheus/prometheus.yml

# Prometheus systemd
cat > /etc/systemd/system/prometheus.service <<EOF
[Unit]
Description=Prometheus
After=network.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \\
  --config.file=/etc/prometheus/prometheus.yml \\
  --storage.tsdb.path=/var/lib/prometheus/ \\
  --web.console.templates=/etc/prometheus/consoles \\
  --web.console.libraries=/etc/prometheus/console_libraries \\
  --web.listen-address=$TAILSCALE_IP:9090

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable prometheus
systemctl start prometheus
wait_for_service prometheus

# Grafana
log_info "Step 4/5: Grafana Setup..."
apt-get install -y software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" > /etc/apt/sources.list.d/grafana.list
apt-get update
apt-get install -y grafana

# Configure Grafana
cat > /etc/grafana/grafana.ini <<EOF
[server]
http_addr = $TAILSCALE_IP
http_port = 3000

[security]
admin_password = $GRAFANA_ADMIN_PASSWORD

[auth.anonymous]
enabled = false
EOF

systemctl enable grafana-server
systemctl start grafana-server
wait_for_service grafana-server

# Node Exporter
log_info "Step 5/5: Node Exporter Setup..."
NODE_EXP_VERSION="1.7.0"
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VERSION}/node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz
tar xvf node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz
cp node_exporter-${NODE_EXP_VERSION}.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-${NODE_EXP_VERSION}.linux-amd64*

useradd --no-create-home --shell /bin/false node_exporter || true

cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

# Nginx for Grafana
cat > /etc/nginx/sites-available/grafana <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://$TAILSCALE_IP:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/grafana /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

log_info "========================================="
log_info "Deployment Completed!"
log_info "========================================="
log_info ""
log_info "Tailscale IP: $TAILSCALE_IP"
log_info ""
log_info "Grafana: http://$DOMAIN"
log_info "  User: admin"
log_info "  Password: $GRAFANA_ADMIN_PASSWORD"
log_info ""
log_info "Prometheus: http://$TAILSCALE_IP:9090"
log_info ""
log_info "Setup SSL: sudo certbot --nginx -d $DOMAIN"
log_info ""

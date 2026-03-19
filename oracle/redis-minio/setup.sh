#!/bin/bash

# Complete Setup Script for Redis + MinIO Instance

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/common.sh"

check_root
check_tailscale_key

log_info "========================================="
log_info "Redis + MinIO Deployment"
log_info "========================================="

# System Setup
log_info "Step 1/6: System Setup..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget gnupg ufw htop vim net-tools

# Swap
if [ ! -f /swapfile ]; then
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl vm.swappiness="$SWAP_SWAPPINESS"

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

# Tailscale Setup
log_info "Step 2/6: Tailscale Setup..."
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --authkey="$TAILSCALE_AUTH_KEY" --hostname="$INSTANCE_NAME" --accept-routes
sleep 5
TAILSCALE_IP=$(get_tailscale_ip)
echo "$TAILSCALE_IP" > "$APP_DIR/tailscale_ip.txt"
log_info "Tailscale IP: $TAILSCALE_IP"

# Redis Setup
log_info "Step 3/6: Redis Setup..."
apt-get install -y redis-server

# Configure Redis
cat >> /etc/redis/redis.conf <<EOF

# Blyss Configuration
bind 127.0.0.1 $TAILSCALE_IP
requirepass $REDIS_PASSWORD
maxmemory $REDIS_MAX_MEMORY
maxmemory-policy $REDIS_MAX_MEMORY_POLICY
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
EOF

systemctl restart redis-server
systemctl enable redis-server
wait_for_service redis-server

log_info "Redis configured: redis://:$REDIS_PASSWORD@$TAILSCALE_IP:6379"

# MinIO Setup
log_info "Step 4/6: MinIO Setup..."
wget https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
chmod +x /usr/local/bin/minio

# Create MinIO user
useradd -r minio-user -s /sbin/nologin || true
chown -R minio-user:minio-user "$MINIO_DATA_DIR"

# MinIO config
cat > /etc/default/minio <<EOF
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_VOLUMES="$MINIO_DATA_DIR"
MINIO_OPTS="--address $TAILSCALE_IP:9000 --console-address $TAILSCALE_IP:9001"
EOF

# MinIO systemd service
cat > /etc/systemd/system/minio.service <<EOF
[Unit]
Description=MinIO
After=network.target

[Service]
Type=notify
User=minio-user
Group=minio-user
EnvironmentFile=/etc/default/minio
ExecStart=/usr/local/bin/minio server \$MINIO_OPTS \$MINIO_VOLUMES
Restart=always
LimitNOFILE=65536
TasksMax=infinity
TimeoutStopSec=infinity
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable minio
systemctl start minio
wait_for_service minio

log_info "MinIO configured: http://$TAILSCALE_IP:9000"

# Create buckets
log_info "Step 5/6: Creating MinIO buckets..."
wget https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
chmod +x /usr/local/bin/mc

mc alias set local http://$TAILSCALE_IP:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

for bucket in $MINIO_BUCKETS; do
    mc mb local/$bucket || log_warn "Bucket $bucket may already exist"
    log_info "Created bucket: $bucket"
done

# Nginx Setup (if domain configured)
log_info "Step 6/6: Nginx Setup..."
apt-get install -y nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/minio <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://$TAILSCALE_IP:9001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sf /etc/nginx/sites-available/minio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

log_info "========================================="
log_info "Deployment Completed!"
log_info "========================================="
log_info ""
log_info "Tailscale IP: $TAILSCALE_IP"
log_info ""
log_info "Redis:"
log_info "  Host: $TAILSCALE_IP"
log_info "  Port: 6379"
log_info "  Password: $REDIS_PASSWORD"
log_info ""
log_info "MinIO:"
log_info "  API: http://$TAILSCALE_IP:9000"
log_info "  Console: http://$TAILSCALE_IP:9001"
log_info "  User: $MINIO_ROOT_USER"
log_info "  Password: $MINIO_ROOT_PASSWORD"
log_info "  Buckets: $MINIO_BUCKETS"
log_info ""
log_info "Web Console: http://$DOMAIN (setup SSL with: sudo certbot --nginx)"
log_info ""

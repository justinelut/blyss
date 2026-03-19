#!/bin/bash
set -e

echo "=========================================="
echo "  Blyss Backend Automated Deployment"
echo "  Oracle Cloud - 1GB RAM / 1 OCPU"
echo "=========================================="

# Configuration
REPO_URL="https://github.com/justinelut/blyss.git"
DOMAIN="server.blyss.co.ke"
APP_DIR="/opt/blyss"
APP_USER="blyss"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: System Update
log_info "Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install essential packages
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

# Step 3: Create swap (critical for 1GB RAM)
log_info "Setting up 2GB swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    # Add to fstab only if not already present
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    log_info "Swap created and enabled"
else
    log_info "Swap file already exists, skipping creation"
    # Ensure swap is enabled
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

# Step 4: Configure firewall
log_info "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw status

# Step 5: Create application user
log_info "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash $APP_USER
    log_info "User $APP_USER created"
else
    log_warn "User $APP_USER already exists"
fi

# Step 6: Install uv
log_info "Installing uv..."
su - $APP_USER -c "curl -LsSf https://astral.sh/uv/install.sh | sh"

# Step 7: Create app directory
log_info "Setting up application directory..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# Step 8: Clone repository
log_info "Cloning repository..."
if [ ! -d "$APP_DIR/blyss" ]; then
    su - $APP_USER -c "cd $APP_DIR && git clone https://justinelut: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@github.com/justinelut/blyss.git"
else
    log_info "Repository already exists, pulling latest changes..."
    su - $APP_USER -c "cd $APP_DIR/blyss && git pull"
fi

# Step 9: Copy production .env file
log_info "Setting up .env file from .env.production..."
cp $APP_DIR/blyss/server/.env.production $APP_DIR/blyss/server/.env
chown $APP_USER:$APP_USER $APP_DIR/blyss/server/.env
chmod 600 $APP_DIR/blyss/server/.env
log_info ".env file created successfully"

# Step 10: Install dependencies
log_info "Installing Python dependencies..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv sync"

# Step 11: Run migrations
log_info "Running database migrations..."
su - $APP_USER -c "cd $APP_DIR/blyss/server && /home/$APP_USER/.local/bin/uv run task db_migrate"

# Step 12: Create log directory
mkdir -p /var/log/blyss
chown -R $APP_USER:$APP_USER /var/log/blyss

# Step 13: Create systemd services
log_info "Creating systemd services..."

cat > /etc/systemd/system/blyss-api.service << 'EOF'
[Unit]
Description=Blyss API Server
After=network.target

[Service]
Type=simple
User=blyss
Group=blyss
WorkingDirectory=/opt/blyss/blyss/server
Environment="PATH=/home/blyss/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/blyss/.local/bin/uv run task api
Restart=always
RestartSec=10
StandardOutput=append:/var/log/blyss/api.log
StandardError=append:/var/log/blyss/api-error.log
MemoryMax=512M
CPUQuota=80%

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/blyss-worker.service << 'EOF'
[Unit]
Description=Blyss Background Worker
After=network.target blyss-api.service

[Service]
Type=simple
User=blyss
Group=blyss
WorkingDirectory=/opt/blyss/blyss/server
Environment="PATH=/home/blyss/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/blyss/.local/bin/uv run task worker
Restart=always
RestartSec=10
StandardOutput=append:/var/log/blyss/worker.log
StandardError=append:/var/log/blyss/worker-error.log
MemoryMax=256M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable blyss-api
systemctl enable blyss-worker

# Step 14: Configure Nginx
log_info "Configuring Nginx..."

cat > /etc/nginx/sites-available/blyss << 'EOF'
server {
    listen 80;
    server_name server.blyss.co.ke;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /healthz {
        proxy_pass http://127.0.0.1:8000/healthz;
        access_log off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/blyss /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
systemctl enable nginx

# Step 15: Start services
log_info "Starting services..."
systemctl start blyss-api
systemctl start blyss-worker

# Step 16: Setup SSL
log_info "Setting up SSL..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@blyss.co.ke || log_warn "SSL setup skipped"

# Display status
echo ""
echo "=========================================="
log_info "Deployment Complete!"
echo "=========================================="
echo ""
systemctl status blyss-api --no-pager | head -5
echo ""
echo "API: http://$DOMAIN"
echo "Logs: sudo journalctl -u blyss-api -f"
echo "=========================================="

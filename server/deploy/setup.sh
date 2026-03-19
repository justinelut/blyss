#!/bin/bash
set -e

echo "=========================================="
echo "  Blyss Backend Automated Deployment"
echo "  Oracle Cloud - 1GB RAM / 1 OCPU"
echo "=========================================="

# Configuration
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"  # Update this
DOMAIN="server.blyss.co.ke"
APP_DIR="/opt/blyss"
APP_USER="blyss"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_info "Swap created and enabled"
else
    log_warn "Swap file already exists"
fi

# Configure swappiness for better performance
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Step 4: Configure firewall
log_info "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw status

# Step 5: Create application user
log_info "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash $APP_USER
    log_info "User $APP_USER created"
else
    log_warn "User $APP_USER already exists"
fi

# Step 6: Install uv for the app user
log_info "Installing uv (Python package manager)..."
su - $APP_USER -c "curl -LsSf https://astral.sh/uv/install.sh | sh"

# Step 7: Create application directory
log_info "Setting up application directory..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# Step 8: Clone repository
log_info "Cloning repository..."
if [ -d "$APP_DIR/server" ]; then
    log_warn "Repository already exists, pulling latest changes..."
    su - $APP_USER -c "cd $APP_DIR && git pull"
else
    log_info "Enter your GitHub repository URL:"
    read -p "Repository URL: " REPO_URL
    su - $APP_USER -c "git clone $REPO_URL $APP_DIR"
fi

# Step 9: Create production .env file
log_info "Creating production environment file..."
cat > $APP_DIR/server/.env.production << 'EOF'
POLAR_ENV=production
POLAR_LOG_LEVEL=INFO
POLAR_TESTING=0
POLAR_SQLALCHEMY_DEBUG=0
POLAR_POSTHOG_DEBUG=0
POLAR_SKIP_EMAIL_RENDERER_CHECK=1

# CORS - Update with your frontend domain
POLAR_CORS_ORIGINS='["https://blyss.co.ke", "https://www.blyss.co.ke"]'
POLAR_ALLOWED_HOSTS='["server.blyss.co.ke", "blyss.co.ke"]'
POLAR_FRONTEND_BASE_URL="https://blyss.co.ke"
POLAR_CHECKOUT_BASE_URL="https://server.blyss.co.ke/v1/checkout-links/{client_secret}/redirect"

POLAR_USER_SESSION_COOKIE_DOMAIN="blyss.co.ke"

# Neon PostgreSQL (from your existing .env)
POLAR_POSTGRES_USER=neondb_owner
POLAR_POSTGRES_PWD=npg_hsol3R5TamPZ
POLAR_POSTGRES_HOST=ep-solitary-sea-adx0qsi6-pooler.c-2.us-east-1.aws.neon.tech
POLAR_POSTGRES_PORT=5432
POLAR_POSTGRES_DATABASE=neondb
POLAR_POSTGRES_SSL_MODE=require

POLAR_POSTGRES_READ_USER=neondb_owner
POLAR_POSTGRES_READ_PWD=npg_hsol3R5TamPZ
POLAR_POSTGRES_READ_HOST=ep-solitary-sea-adx0qsi6-pooler.c-2.us-east-1.aws.neon.tech
POLAR_POSTGRES_READ_PORT=5432
POLAR_POSTGRES_READ_DATABASE=neondb
POLAR_POSTGRES_READ_SSL_MODE=require

# Upstash Redis
POLAR_REDIS_HOST=good-salmon-6840.upstash.io
POLAR_REDIS_PORT=6379
POLAR_REDIS_DB=0
POLAR_REDIS_PASSWORD=ARq4AAImcDIxNjQ0OWQ5MGY0NzU0N2YyOTZhZDFhOGRiMmEyOTAwY3AyNjg0MA

# GitHub - Not needed
POLAR_GITHUB_CLIENT_ID="__UNSET__"
POLAR_GITHUB_CLIENT_SECRET="__UNSET__"

# Stripe - Dummy keys
POLAR_STRIPE_SECRET_KEY="sk_test_51DummyKeyForLocalDevOnly123456789"
POLAR_STRIPE_PUBLISHABLE_KEY="pk_test_51DummyKeyForLocalDevOnly123456789"
POLAR_STRIPE_WEBHOOK_SECRET="whsec_DummyWebhookSecretForLocalDevOnly123"
POLAR_STRIPE_CONNECT_WEBHOOK_SECRET="whsec_DummyConnectWebhookSecretForLocalDev"

# Paystack - Production keys (UPDATE THESE!)
POLAR_PAYSTACK_SECRET_KEY="sk_test_93099bfa358a6754554dcdfb1c1da1f8f01a8210"
POLAR_PAYSTACK_PUBLIC_KEY="pk_test_1e298a9b7cf0509d128be4c8dc7aaacecac54f80"
POLAR_PAYSTACK_WEBHOOK_SECRET="paystack_webhook_secret_placeholder"

# Cloudflare R2
POLAR_AWS_ACCESS_KEY_ID=16f5c03beef33ec3dd9be9cbef6b85ad
POLAR_AWS_SECRET_ACCESS_KEY=444862c047614b43c7971baaed16e0c0cb6e5a5ecd6bad015e3c2327d3fd22f6
POLAR_S3_FILES_BUCKET_NAME="blyss-platform"
POLAR_S3_FILES_PUBLIC_BUCKET_NAME="blyss-platform"
POLAR_S3_CUSTOMER_INVOICES_BUCKET_NAME="blyss-platform"
POLAR_S3_PAYOUT_INVOICES_BUCKET_NAME="blyss-platform"
POLAR_S3_ENDPOINT_URL="https://c1eaaa292b9dddcb67f9592bb5bc1948.r2.cloudflarestorage.com"
POLAR_AWS_REGION="auto"

# Loops
POLAR_LOOPS_API_KEY="ea35cb0243c0e62ecb4eacfa96dee99c"

# Optional
POLAR_GITHUB_REPOSITORY_BENEFITS_APP_NAMESPACE="__UNSET__"
POLAR_GITHUB_REPOSITORY_BENEFITS_APP_IDENTIFIER="__UNSET__"
POLAR_GITHUB_REPOSITORY_BENEFITS_APP_PRIVATE_KEY="__UNSET__"
POLAR_GITHUB_REPOSITORY_BENEFITS_CLIENT_ID="__UNSET__"
POLAR_GITHUB_REPOSITORY_BENEFITS_CLIENT_SECRET="__UNSET__"
POLAR_DISCORD_CLIENT_ID="__UNSET__"
POLAR_DISCORD_CLIENT_SECRET="__UNSET__"
POLAR_DISCORD_BOT_TOKEN="__UNSET__"
POLAR_GOOGLE_CLIENT_ID="546804944768-sc9g9u2ufbg4jgfmettkc646vfdu6q21.apps.googleusercontent.com"
POLAR_GOOGLE_CLIENT_SECRET="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"
POLAR_OPENAI_API_KEY="__UNSET__"
POLAR_NUMERAL_API_KEY="__UNSET__"
POLAR_CHARGEBACK_STOP_WEBHOOK_SECRET=""
EOF

chown $APP_USER:$APP_USER $APP_DIR/server/.env.production
chmod 600 $APP_DIR/server/.env.production

# Link production env
su - $APP_USER -c "ln -sf $APP_DIR/server/.env.production $APP_DIR/server/.env"

# Step 10: Install Python dependencies
log_info "Installing Python dependencies..."
su - $APP_USER -c "cd $APP_DIR/server && /home/$APP_USER/.local/bin/uv sync"

# Step 11: Run database migrations
log_info "Running database migrations..."
su - $APP_USER -c "cd $APP_DIR/server && /home/$APP_USER/.local/bin/uv run task db_migrate"

# Step 12: Create log directory
log_info "Creating log directory..."
mkdir -p /var/log/blyss
chown -R $APP_USER:$APP_USER /var/log/blyss

# Step 13: Install systemd services
log_info "Installing systemd services..."
cp $APP_DIR/server/deploy/blyss-api.service /etc/systemd/system/
cp $APP_DIR/server/deploy/blyss-worker.service /etc/systemd/system/

systemctl daemon-reload
systemctl enable blyss-api
systemctl enable blyss-worker

# Step 14: Configure Nginx
log_info "Configuring Nginx..."
cp $APP_DIR/server/deploy/nginx.conf /etc/nginx/sites-available/blyss
ln -sf /etc/nginx/sites-available/blyss /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
systemctl enable nginx

# Step 15: Start services
log_info "Starting Blyss services..."
systemctl start blyss-api
systemctl start blyss-worker

# Step 16: Setup SSL with Let's Encrypt
log_info "Setting up SSL certificate..."
log_warn "Make sure DNS is pointing to this server before continuing!"
read -p "Press Enter to continue with SSL setup (or Ctrl+C to skip)..."

certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@blyss.co.ke || log_warn "SSL setup failed or skipped"

# Step 17: Display status
echo ""
echo "=========================================="
log_info "Deployment Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
systemctl status blyss-api --no-pager | head -5
systemctl status blyss-worker --no-pager | head -5
echo ""
echo "Useful Commands:"
echo "  - View API logs:    sudo journalctl -u blyss-api -f"
echo "  - View worker logs: sudo journalctl -u blyss-worker -f"
echo "  - Restart API:      sudo systemctl restart blyss-api"
echo "  - Restart worker:   sudo systemctl restart blyss-worker"
echo "  - Check status:     sudo systemctl status blyss-api"
echo ""
echo "Your API should be accessible at:"
echo "  http://$DOMAIN"
echo "  https://$DOMAIN (if SSL was configured)"
echo ""
log_warn "Remember to update Paystack production keys in /opt/blyss/server/.env.production"
echo "=========================================="

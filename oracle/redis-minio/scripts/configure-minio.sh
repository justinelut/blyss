#!/bin/bash
# Complete MinIO Configuration: SSL + CORS + Console UI
# This script sets up everything needed for MinIO to work properly

set -e

echo "=========================================="
echo "  Complete MinIO Configuration"
echo "=========================================="
echo ""

DOMAIN="storage.blyss.co.ke"
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "100.117.231.42")
EMAIL="admin@blyss.co.ke"

echo "[INFO] Server Information:"
echo "  Domain: $DOMAIN"
echo "  Tailscale IP: $TAILSCALE_IP"
echo ""

# Step 1: Install required packages
echo "[STEP 1/6] Installing required packages..."
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx wget curl

# Step 2: Install MinIO Client if not present
echo "[STEP 2/6] Installing MinIO Client..."
if ! command -v mc &> /dev/null; then
    wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
    chmod +x /usr/local/bin/mc
    echo "✅ MinIO Client installed"
else
    echo "✅ MinIO Client already installed"
fi

# Step 3: Configure MinIO alias and buckets
echo "[STEP 3/6] Configuring MinIO buckets..."
mc alias set myminio http://localhost:9000 minioadmin minioadmin123 2>/dev/null || true

# Create buckets if they don't exist
for BUCKET in blyss-files blyss-public; do
    if ! mc ls myminio/$BUCKET &> /dev/null; then
        echo "  Creating bucket: $BUCKET"
        mc mb myminio/$BUCKET
    else
        echo "  Bucket $BUCKET already exists"
    fi
done

# Set public download policy for blyss-public
echo "  Setting public policy for blyss-public..."
mc anonymous set download myminio/blyss-public

# Step 4: Create Nginx configuration with SSL + CORS
echo "[STEP 4/6] Creating Nginx configuration..."

cat > /etc/nginx/sites-available/minio <<EOF
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN;

    # Allow certbot challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect everything else to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS - MinIO Console with CORS
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Increase client body size for large file uploads
    client_max_body_size 100M;

    # Proxy to MinIO Console (Web UI on port 9001)
    location / {
        # CORS Headers for API requests
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, PUT, POST, DELETE, HEAD, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' '*' always;
        add_header 'Access-Control-Expose-Headers' 'ETag, x-amz-request-id, x-amz-id-2' always;
        add_header 'Access-Control-Max-Age' '3600' always;

        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, PUT, POST, DELETE, HEAD, OPTIONS';
            add_header 'Access-Control-Allow-Headers' '*';
            add_header 'Access-Control-Max-Age' '3600';
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' '0';
            return 204;
        }

        # Proxy to MinIO Console
        proxy_pass http://$TAILSCALE_IP:9001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Disable buffering for better performance
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

echo "✅ Nginx configuration created"

# Step 5: Enable site and obtain SSL certificate
echo "[STEP 5/6] Setting up SSL certificate..."

# Enable the site
ln -sf /etc/nginx/sites-available/minio /etc/nginx/sites-enabled/

# Check if SSL certificate exists
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "  Obtaining new SSL certificate..."

    # First, test nginx config without SSL
    sed -i 's/listen 443 ssl http2;/listen 443;/' /etc/nginx/sites-available/minio
    sed -i '/ssl_certificate/d' /etc/nginx/sites-available/minio
    sed -i '/ssl_protocols/d' /etc/nginx/sites-available/minio
    sed -i '/ssl_ciphers/d' /etc/nginx/sites-available/minio
    sed -i '/ssl_prefer_server_ciphers/d' /etc/nginx/sites-available/minio
    sed -i '/ssl_session/d' /etc/nginx/sites-available/minio

    nginx -t && systemctl reload nginx

    # Obtain certificate
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

    echo "✅ SSL certificate obtained"
else
    echo "✅ SSL certificate already exists"
fi

# Step 6: Final configuration and reload
echo "[STEP 6/6] Finalizing configuration..."

# Ensure the final config is correct (certbot may have modified it)
cat > /etc/nginx/sites-available/minio <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 100M;

    location / {
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, PUT, POST, DELETE, HEAD, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' '*' always;
        add_header 'Access-Control-Expose-Headers' 'ETag, x-amz-request-id, x-amz-id-2' always;
        add_header 'Access-Control-Max-Age' '3600' always;

        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, PUT, POST, DELETE, HEAD, OPTIONS';
            add_header 'Access-Control-Allow-Headers' '*';
            add_header 'Access-Control-Max-Age' '3600';
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' '0';
            return 204;
        }

        proxy_pass http://$TAILSCALE_IP:9001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

# Test and reload
if nginx -t; then
    systemctl daemon-reload
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Verify services are running
echo ""
echo "[VERIFICATION] Checking services..."
systemctl is-active --quiet minio && echo "✅ MinIO service is running" || echo "❌ MinIO service is not running"
systemctl is-active --quiet nginx && echo "✅ Nginx service is running" || echo "❌ Nginx service is not running"

echo ""
echo "=========================================="
echo "  ✅ Configuration Complete!"
echo "=========================================="
echo ""
echo "MinIO Console: https://$DOMAIN"
echo "Login: minioadmin / minioadmin123"
echo ""
echo "Features enabled:"
echo "  ✅ HTTPS with SSL certificate"
echo "  ✅ HTTP to HTTPS redirect"
echo "  ✅ CORS headers for file uploads"
echo "  ✅ MinIO Console UI access"
echo "  ✅ Public bucket: blyss-public"
echo "  ✅ Private bucket: blyss-files"
echo ""

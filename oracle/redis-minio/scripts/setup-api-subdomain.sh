#!/bin/bash
# Setup a separate subdomain for MinIO API
# This keeps storage.blyss.co.ke for Console UI and creates s3.blyss.co.ke for API

set -e

echo "=========================================="
echo "  Setup MinIO API Subdomain"
echo "=========================================="
echo ""

API_DOMAIN="s3.blyss.co.ke"
CONSOLE_DOMAIN="storage.blyss.co.ke"
TAILSCALE_IP="100.117.231.42"
EMAIL="admin@blyss.co.ke"

echo "Configuration:"
echo "  API Domain: $API_DOMAIN (port 9000)"
echo "  Console Domain: $CONSOLE_DOMAIN (port 9001)"
echo ""

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update -qq
    apt-get install -y certbot python3-certbot-nginx
fi

# Step 1: Create HTTP-only configuration first (for certbot)
echo "Creating temporary HTTP configuration for $API_DOMAIN..."

cat > /etc/nginx/sites-available/minio-api <<EOF
server {
    listen 80;
    server_name $API_DOMAIN;

    # Increase limits and timeouts for file uploads
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;

    # Increase proxy timeouts
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        # Temporary: allow HTTP for now
        # Remove any CORS headers from MinIO to avoid duplicates
        proxy_hide_header 'Access-Control-Allow-Origin';
        proxy_hide_header 'Access-Control-Allow-Methods';
        proxy_hide_header 'Access-Control-Allow-Headers';
        proxy_hide_header 'Access-Control-Expose-Headers';
        proxy_hide_header 'Access-Control-Max-Age';

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

        proxy_pass http://$TAILSCALE_IP:9000;

        # Minimal headers - don't modify the request
        proxy_pass_request_headers on;
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Disable buffering for large uploads
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

echo "✅ Temporary configuration created"
echo ""

# Enable the site
echo "Enabling site..."
ln -sf /etc/nginx/sites-available/minio-api /etc/nginx/sites-enabled/

# Test and reload Nginx
echo "Testing Nginx configuration..."
if ! nginx -t; then
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

echo "✅ Configuration is valid"
echo ""

echo "Reloading Nginx..."
systemctl reload nginx
echo ""

# Step 2: Obtain SSL certificate
echo "Obtaining SSL certificate for $API_DOMAIN..."
if [ ! -f "/etc/letsencrypt/live/$API_DOMAIN/fullchain.pem" ]; then
    certbot certonly --nginx -d $API_DOMAIN --non-interactive --agree-tos --email $EMAIL
    echo "✅ SSL certificate obtained"
else
    echo "✅ SSL certificate already exists"
fi

echo ""

# Step 3: Update configuration with HTTPS
echo "Updating configuration with HTTPS..."

cat > /etc/nginx/sites-available/minio-api <<EOF
server {
    listen 80;
    server_name $API_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$API_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$API_DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    # Increase limits and timeouts for file uploads
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;

    # Increase proxy timeouts
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    location / {
        # Remove any CORS headers from MinIO to avoid duplicates
        proxy_hide_header 'Access-Control-Allow-Origin';
        proxy_hide_header 'Access-Control-Allow-Methods';
        proxy_hide_header 'Access-Control-Allow-Headers';
        proxy_hide_header 'Access-Control-Expose-Headers';
        proxy_hide_header 'Access-Control-Max-Age';

        # CORS headers for API requests
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

        # Proxy to MinIO API (port 9000)
        proxy_pass http://$TAILSCALE_IP:9000;

        # Minimal headers - don't modify the request
        proxy_pass_request_headers on;
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Disable buffering for large uploads
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

echo "✅ HTTPS configuration created"
echo ""

# Final test and reload
echo "Testing final configuration..."
if ! nginx -t; then
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

echo "✅ Configuration is valid"
echo ""

echo "Final Nginx reload..."
systemctl reload nginx

echo ""
echo "=========================================="
echo "  ✅ Setup Complete!"
echo "=========================================="
echo ""
echo "MinIO API: https://$API_DOMAIN"
echo "MinIO Console: https://$CONSOLE_DOMAIN"
echo ""
echo "You can now use https://$API_DOMAIN in your backend configuration"
echo ""

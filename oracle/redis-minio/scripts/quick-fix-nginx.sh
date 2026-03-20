#!/bin/bash
# Quick fix for MinIO Nginx configuration
# Run this directly on the MinIO server to fix upload issues

set -e

echo "=========================================="
echo "  Quick Fix MinIO Nginx Configuration"
echo "=========================================="
echo ""

API_DOMAIN="s3.blyss.co.ke"
TAILSCALE_IP="100.117.231.42"

echo "Updating Nginx configuration for $API_DOMAIN..."

cat > /etc/nginx/sites-available/minio-api <<'EOF'
server {
    listen 80;
    server_name s3.blyss.co.ke;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name s3.blyss.co.ke;

    ssl_certificate /etc/letsencrypt/live/s3.blyss.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/s3.blyss.co.ke/privkey.pem;

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
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, PUT, POST, DELETE, HEAD, OPTIONS';
            add_header 'Access-Control-Allow-Headers' '*';
            add_header 'Access-Control-Max-Age' '3600';
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' '0';
            return 204;
        }

        # Proxy to MinIO API (port 9000)
        proxy_pass http://100.117.231.42:9000;
        
        # Pass through the Host header for signature validation
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Disable buffering for large uploads
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

echo "✅ Configuration updated"
echo ""

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
echo "=========================================="
echo "  ✅ Fix Applied!"
echo "=========================================="
echo ""
echo "MinIO API: https://s3.blyss.co.ke"
echo "Try uploading a file now"
echo ""

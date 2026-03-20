#!/bin/bash
# Restore MinIO Console UI access on storage.blyss.co.ke with CORS

set -e

echo "=========================================="
echo "  Restore MinIO Console UI with CORS"
echo "=========================================="
echo ""

DOMAIN="storage.blyss.co.ke"
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "100.117.231.42")

echo "[INFO] Creating Nginx configuration with Console UI + CORS..."

# Create Nginx config that proxies to MinIO Console (9001) with CORS
cat > /etc/nginx/sites-available/minio <<EOF
server {
    listen 80;
    server_name $DOMAIN;

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

echo "[INFO] Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/minio /etc/nginx/sites-enabled/

echo "[INFO] Testing Nginx configuration..."
if nginx -t; then
    echo "[INFO] Reloading Nginx..."
    systemctl daemon-reload
    systemctl reload nginx
    echo "✅ Nginx configuration applied successfully!"
else
    echo "[ERROR] Nginx configuration test failed!"
    exit 1
fi

echo ""
echo "✅ MinIO Console UI restored!"
echo ""
echo "Access MinIO Console at:"
echo "  http://$DOMAIN"
echo ""
echo "Login credentials:"
echo "  Username: minioadmin"
echo "  Password: minioadmin123"
echo ""
echo "CORS is enabled for API requests from your frontend."

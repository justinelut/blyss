#!/bin/bash
# Configure Nginx CORS for MinIO (bucket-level CORS requires paid AIStor version)

set -e

echo "=========================================="
echo "  Configure Nginx CORS for MinIO"
echo "=========================================="
echo ""

DOMAIN="storage.blyss.co.ke"
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "100.117.231.42")

echo "[INFO] Creating Nginx configuration with CORS..."

# Create Nginx config for MinIO with CORS headers
cat > /etc/nginx/sites-available/minio <<'EOF'
server {
    listen 80;
    server_name storage.blyss.co.ke;

    # Increase client body size for large file uploads
    client_max_body_size 100M;

    # MinIO API (port 9000)
    location / {
        # CORS Headers
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

        proxy_pass http://TAILSCALE_IP:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

# Replace TAILSCALE_IP placeholder with actual IP
sed -i "s/TAILSCALE_IP/$TAILSCALE_IP/g" /etc/nginx/sites-available/minio

echo "[INFO] Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/minio /etc/nginx/sites-enabled/

echo "[INFO] Testing Nginx configuration..."
if nginx -t; then
    echo "[INFO] Reloading Nginx..."
    systemctl daemon-reload
    systemctl reload nginx
    echo "✅ Nginx CORS configuration applied successfully!"
else
    echo "[ERROR] Nginx configuration test failed!"
    exit 1
fi

echo ""
echo "✅ MinIO CORS configuration complete!"
echo ""
echo "CORS is now configured at the Nginx level for:"
echo "  - Domain: $DOMAIN"
echo "  - MinIO API: http://$TAILSCALE_IP:9000"
echo ""
echo "Allowed origins: * (all)"
echo "Allowed methods: GET, PUT, POST, DELETE, HEAD, OPTIONS"

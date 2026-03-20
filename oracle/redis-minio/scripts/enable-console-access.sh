#!/bin/bash
# Enable MinIO Console browser access via Nginx

set -e

echo "=========================================="
echo "  Enable MinIO Console Access"
echo "=========================================="
echo ""

DOMAIN="storage.blyss.co.ke"
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "100.117.231.42")

echo "[INFO] Adding MinIO Console configuration to Nginx..."

# Add console server block to the existing config
cat >> /etc/nginx/sites-available/minio <<EOF

# MinIO Console (port 9001) - Web UI for browsing files
server {
    listen 9001;
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

echo "[INFO] Opening port 9001 in firewall..."
ufw allow 9001/tcp

echo "[INFO] Testing Nginx configuration..."
if nginx -t; then
    echo "[INFO] Reloading Nginx..."
    systemctl daemon-reload
    systemctl reload nginx
    echo "✅ MinIO Console access enabled!"
else
    echo "[ERROR] Nginx configuration test failed!"
    exit 1
fi

echo ""
echo "✅ Configuration complete!"
echo ""
echo "MinIO Console is now accessible at:"
echo "  http://$DOMAIN:9001"
echo ""
echo "Login credentials:"
echo "  Username: minioadmin"
echo "  Password: minioadmin123"

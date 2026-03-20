#!/bin/bash
# Diagnostic script for upload issues
# Run this on the backend server to check logs and configuration

set -e

echo "=========================================="
echo "  Upload Issue Diagnostics"
echo "=========================================="
echo ""

echo "[1/8] Checking API service status..."
systemctl status blyss-api --no-pager -l | head -n 20
echo ""

echo "[2/8] Checking recent API logs (last 50 lines)..."
journalctl -u blyss-api -n 50 --no-pager
echo ""

echo "[3/8] Checking if .env file exists and is readable..."
if [ -f /opt/blyss/blyss/server/.env ]; then
    echo "✅ .env file exists"
    ls -la /opt/blyss/blyss/server/.env
    echo ""
    echo "Checking S3 configuration in .env:"
    grep -E "POLAR_S3|POLAR_AWS" /opt/blyss/blyss/server/.env || echo "No S3 config found"
else
    echo "❌ .env file NOT found!"
fi
echo ""

echo "[4/8] Checking MinIO connectivity from backend..."
echo "Testing MinIO via Tailscale IP..."
curl -I http://100.117.231.42:9000/blyss-public/ 2>&1 | head -n 10
echo ""

echo "[5/8] Checking public storage endpoint..."
echo "Testing storage.blyss.co.ke..."
curl -I https://storage.blyss.co.ke/blyss-public/ 2>&1 | head -n 10
echo ""

echo "[6/8] Checking API health endpoint..."
curl -f http://localhost:8000/v1/products/public?limit=1 2>&1 | head -n 5
echo ""

echo "[7/8] Checking for recent errors in logs..."
echo "Searching for S3/upload related errors:"
journalctl -u blyss-api --since "10 minutes ago" --no-pager | grep -i -E "s3|upload|minio|storage|error" | tail -n 20
echo ""

echo "[8/8] Checking service file configuration..."
cat /etc/systemd/system/blyss-api.service
echo ""

echo "=========================================="
echo "  Diagnostics Complete"
echo "=========================================="
echo ""
echo "If you see errors above, common fixes:"
echo "1. Missing .env: Run update.sh to sync from .env.production"
echo "2. MinIO connection issues: Check Tailscale connectivity"
echo "3. Service crashes: Check WorkingDirectory in service file"
echo ""

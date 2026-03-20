#!/bin/bash
# Check server logs for upload-related errors
# This script specifically looks for file upload issues

echo "=========================================="
echo "  Server Logs Analysis"
echo "=========================================="
echo ""

echo "[1/5] Checking if API service is running..."
if systemctl is-active --quiet blyss-api; then
    echo "✅ blyss-api service is running"
    systemctl status blyss-api --no-pager -l | head -n 8
else
    echo "❌ blyss-api service is NOT running!"
    echo ""
    echo "Service status:"
    systemctl status blyss-api --no-pager -l
    echo ""
    echo "This is why uploads are failing!"
    exit 1
fi
echo ""

echo "[2/5] Checking recent API logs (last 50 lines)..."
journalctl -u blyss-api -n 50 --no-pager
echo ""

echo "[3/5] Searching for upload/file-related errors..."
echo "Looking for: upload, file, s3, minio, storage errors in last 30 minutes..."
journalctl -u blyss-api --since "30 minutes ago" --no-pager | grep -i -E "upload|file|s3|minio|storage|error|exception|traceback" | tail -n 50
echo ""

echo "[4/5] Checking for configuration errors..."
echo "Looking for: .env, config, working directory errors..."
journalctl -u blyss-api --since "30 minutes ago" --no-pager | grep -i -E "\.env|config|directory|path|not found" | tail -n 30
echo ""

echo "[5/5] Checking for S3/MinIO connection errors..."
echo "Looking for: connection, timeout, refused errors..."
journalctl -u blyss-api --since "30 minutes ago" --no-pager | grep -i -E "connection|timeout|refused|unreachable|failed to connect" | tail -n 30
echo ""

echo "=========================================="
echo "  Log Analysis Complete"
echo "=========================================="
echo ""
echo "If you see errors above:"
echo "- Configuration errors → Run fix-service-config.sh"
echo "- S3/MinIO errors → Check MinIO connectivity"
echo "- Connection errors → Check Tailscale"
echo "- Service not running → Run fix-all.sh"
echo ""

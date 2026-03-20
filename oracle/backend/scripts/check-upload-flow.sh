#!/bin/bash
# Check the complete upload flow from frontend to MinIO
# This tests each component in the upload chain

set -e

echo "=========================================="
echo "  Upload Flow Check"
echo "=========================================="
echo ""

echo "[1/6] Testing MinIO directly (Tailscale IP)..."
echo "Checking if MinIO is accessible from backend server..."
if curl -f -s http://100.117.231.42:9000/minio/health/live > /dev/null 2>&1; then
    echo "✅ MinIO is accessible via Tailscale"
else
    echo "❌ MinIO is NOT accessible via Tailscale"
    echo "   This will cause upload failures!"
fi
echo ""

echo "[2/6] Testing MinIO buckets..."
echo "Checking blyss-public bucket:"
curl -I http://100.117.231.42:9000/blyss-public/ 2>&1 | head -n 5
echo ""
echo "Checking blyss-files bucket:"
curl -I http://100.117.231.42:9000/blyss-files/ 2>&1 | head -n 5
echo ""

echo "[3/6] Testing public storage endpoint (storage.blyss.co.ke)..."
echo "This is what presigned URLs use:"
if curl -f -s -I https://storage.blyss.co.ke/blyss-public/ > /dev/null 2>&1; then
    echo "✅ Public storage endpoint is accessible"
    curl -I https://storage.blyss.co.ke/blyss-public/ 2>&1 | grep -E "HTTP|Access-Control"
else
    echo "❌ Public storage endpoint is NOT accessible"
    echo "   Presigned URLs will fail!"
fi
echo ""

echo "[4/6] Testing API file upload endpoint..."
echo "Checking if API is running and can handle file requests:"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/v1/files/)
if [ "$API_RESPONSE" = "401" ] || [ "$API_RESPONSE" = "403" ]; then
    echo "✅ API file endpoint is responding (auth required: $API_RESPONSE)"
elif [ "$API_RESPONSE" = "200" ]; then
    echo "✅ API file endpoint is responding: $API_RESPONSE"
else
    echo "❌ API file endpoint returned: $API_RESPONSE"
fi
echo ""

echo "[5/6] Checking S3 configuration in .env..."
if [ -f /opt/blyss/blyss/server/.env ]; then
    echo "S3 Endpoint (internal): $(grep POLAR_S3_ENDPOINT_URL /opt/blyss/blyss/server/.env | cut -d'=' -f2)"
    echo "S3 Public Endpoint: $(grep POLAR_S3_PUBLIC_ENDPOINT_URL /opt/blyss/blyss/server/.env | cut -d'=' -f2)"
    echo "S3 Access Key: $(grep POLAR_AWS_ACCESS_KEY_ID /opt/blyss/blyss/server/.env | cut -d'=' -f2)"
    echo "Public Bucket: $(grep POLAR_S3_FILES_PUBLIC_BUCKET_NAME /opt/blyss/blyss/server/.env | cut -d'=' -f2)"
else
    echo "❌ .env file not found!"
fi
echo ""

echo "[6/6] Checking recent upload errors in logs..."
echo "Searching for S3/upload errors in last 10 minutes:"
journalctl -u blyss-api --since "10 minutes ago" --no-pager | grep -i -E "s3|upload|minio|storage|error|exception" | tail -n 30 || echo "No recent errors found"
echo ""

echo "=========================================="
echo "  Upload Flow Check Complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "- MinIO should be accessible via Tailscale (100.117.231.42:9000)"
echo "- Public endpoint should be accessible via HTTPS (storage.blyss.co.ke)"
echo "- API should be able to generate presigned URLs"
echo "- Frontend uploads to presigned URLs on storage.blyss.co.ke"
echo ""

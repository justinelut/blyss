#!/bin/bash
# Configure MinIO CORS for file uploads
# Run this on the MinIO server (Instance 4)

set -e

echo "=========================================="
echo "  Configure MinIO CORS"
echo "=========================================="
echo ""

# MinIO credentials
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin123"

# Buckets to configure
BUCKETS=("blyss-files" "blyss-public")

echo "[INFO] Installing mc (MinIO Client) if not present..."
if ! command -v mc &> /dev/null; then
    echo "[INFO] Downloading MinIO Client..."
    wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
    chmod +x /tmp/mc
    sudo mv /tmp/mc /usr/local/bin/
    echo "✅ MinIO Client installed"
fi

echo "[INFO] Configuring MinIO alias..."
mc alias set myminio $MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# Create buckets if they don't exist
for BUCKET in "${BUCKETS[@]}"; do
    if ! mc ls myminio/$BUCKET &> /dev/null; then
        echo "[INFO] Creating bucket: $BUCKET"
        mc mb myminio/$BUCKET
    fi
done

# Set bucket policies to public for blyss-public
echo "[INFO] Setting public policy for blyss-public..."
mc anonymous set download myminio/blyss-public

for BUCKET in "${BUCKETS[@]}"; do
    echo "[INFO] Setting CORS for bucket: $BUCKET"

    # Create CORS configuration
    cat > /tmp/cors-config-${BUCKET}.json <<'EOFCORS'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://blyss.co.ke",
        "https://www.blyss.co.ke",
        "https://*.vercel.app"
      ],
      "AllowedMethods": [
        "GET",
        "PUT",
        "POST",
        "DELETE",
        "HEAD"
      ],
      "AllowedHeaders": [
        "*"
      ],
      "ExposeHeaders": [
        "ETag",
        "x-amz-request-id",
        "x-amz-id-2",
        "x-amz-checksum-sha256",
        "x-amz-sdk-checksum-algorithm"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOFCORS

    # Apply CORS configuration using mc command
    mc cors set /tmp/cors-config-${BUCKET}.json myminio/$BUCKET

    echo "✅ CORS configured for $BUCKET"
done

echo ""
echo "✅ MinIO CORS configuration complete!"
echo ""
echo "Configured buckets:"
for BUCKET in "${BUCKETS[@]}"; do
    echo "  - $BUCKET"
    mc cors get myminio/$BUCKET
done

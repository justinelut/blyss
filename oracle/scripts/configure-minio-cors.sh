#!/bin/bash
# Configure MinIO CORS for file uploads

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
    else
        echo "[INFO] Bucket $BUCKET already exists"
    fi
done

# Set bucket policies to public for blyss-public
echo "[INFO] Setting public policy for blyss-public..."
mc anonymous set download myminio/blyss-public

# Create CORS configuration file
cat > /tmp/minio-cors.json <<'EOFCORS'
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

# Apply CORS to each bucket
for BUCKET in "${BUCKETS[@]}"; do
    echo "[INFO] Setting CORS for bucket: $BUCKET"
    
    # Verify bucket exists
    if ! mc ls myminio/$BUCKET &> /dev/null; then
        echo "[ERROR] Bucket $BUCKET does not exist!"
        continue
    fi
    
    # Apply CORS configuration
    if mc cors set /tmp/minio-cors.json myminio/${BUCKET}; then
        echo "✅ CORS configured for $BUCKET"
        # Verify CORS was set
        echo "[INFO] Current CORS configuration for $BUCKET:"
        mc cors get myminio/${BUCKET} || echo "[WARN] Could not retrieve CORS config"
    else
        echo "[ERROR] Failed to set CORS for $BUCKET"
    fi
done

echo ""
echo "✅ MinIO CORS configuration complete!"

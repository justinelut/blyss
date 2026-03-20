#!/bin/bash
# Fix MinIO presigned URL issue by setting MINIO_SERVER_URL
# This tells MinIO to generate presigned URLs with the public domain

set -e

echo "=========================================="
echo "  Fix MinIO Server URL Configuration"
echo "=========================================="
echo ""

PUBLIC_URL="https://s3.blyss.co.ke"

echo "Setting MINIO_SERVER_URL to: $PUBLIC_URL"
echo ""

# Check if MinIO is running as systemd service or docker
if systemctl list-units --type=service | grep -q minio; then
    echo "Found MinIO systemd service"
    
    # Update systemd service file
    SERVICE_FILE="/etc/systemd/system/minio.service"
    
    if [ ! -f "$SERVICE_FILE" ]; then
        echo "❌ MinIO service file not found at $SERVICE_FILE"
        exit 1
    fi
    
    # Backup original file
    cp "$SERVICE_FILE" "${SERVICE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Check if MINIO_SERVER_URL already exists
    if grep -q "MINIO_SERVER_URL" "$SERVICE_FILE"; then
        echo "Updating existing MINIO_SERVER_URL..."
        sed -i "s|Environment=\"MINIO_SERVER_URL=.*\"|Environment=\"MINIO_SERVER_URL=$PUBLIC_URL\"|g" "$SERVICE_FILE"
    else
        echo "Adding MINIO_SERVER_URL to service file..."
        # Add after the [Service] section
        sed -i "/\[Service\]/a Environment=\"MINIO_SERVER_URL=$PUBLIC_URL\"" "$SERVICE_FILE"
    fi
    
    echo "✅ Service file updated"
    echo ""
    
    echo "Reloading systemd daemon..."
    systemctl daemon-reload
    
    echo "Restarting MinIO service..."
    systemctl restart minio
    
    echo "✅ MinIO service restarted"
    
elif docker ps | grep -q minio; then
    echo "Found MinIO docker container"
    echo "⚠️  Please add MINIO_SERVER_URL=$PUBLIC_URL to your docker-compose.yml"
    echo "   Then run: docker-compose restart minio"
    exit 1
else
    echo "❌ MinIO service not found"
    echo "   Please ensure MinIO is running"
    exit 1
fi

echo ""
echo "=========================================="
echo "  ✅ Configuration Complete!"
echo "=========================================="
echo ""
echo "MinIO will now generate presigned URLs with:"
echo "  $PUBLIC_URL"
echo ""
echo "Test by uploading a file through the web interface"
echo ""

#!/bin/bash
# Quick deployment script - Run this from your LOCAL machine

set -e

# Configuration
SERVER_IP="92.4.130.9"
SERVER_USER="ubuntu"
SSH_KEY="oracle cloud server/ssh-key-2026-03-17.key"

echo "=========================================="
echo "  Blyss Quick Deployment"
echo "=========================================="

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "ERROR: SSH key not found at: $SSH_KEY"
    exit 1
fi

# Fix key permissions
chmod 400 "$SSH_KEY"

# Test SSH connection
echo "Testing SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "echo 'Connection successful'"; then
    echo "✓ SSH connection successful"
else
    echo "✗ SSH connection failed"
    echo "Trying with 'opc' user instead..."
    SERVER_USER="opc"
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "echo 'Connection successful'"; then
        echo "✓ SSH connection successful with opc user"
    else
        echo "✗ SSH connection failed with both ubuntu and opc users"
        exit 1
    fi
fi

# Ask for GitHub repo URL
echo ""
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/blyss.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "ERROR: Repository URL is required"
    exit 1
fi

# Upload deployment files
echo ""
echo "Uploading deployment files..."
scp -i "$SSH_KEY" setup.sh $SERVER_USER@$SERVER_IP:/tmp/
scp -i "$SSH_KEY" blyss-api.service $SERVER_USER@$SERVER_IP:/tmp/
scp -i "$SSH_KEY" blyss-worker.service $SERVER_USER@$SERVER_IP:/tmp/
scp -i "$SSH_KEY" nginx.conf $SERVER_USER@$SERVER_IP:/tmp/

# Create deployment directory on server
echo "Creating deployment directory..."
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_IP "sudo mkdir -p /opt/blyss/server/deploy && sudo chown -R $SERVER_USER:$SERVER_USER /opt/blyss"

# Move files to deployment directory
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_IP "mv /tmp/setup.sh /opt/blyss/server/deploy/ && \
    mv /tmp/blyss-api.service /opt/blyss/server/deploy/ && \
    mv /tmp/blyss-worker.service /opt/blyss/server/deploy/ && \
    mv /tmp/nginx.conf /opt/blyss/server/deploy/ && \
    chmod +x /opt/blyss/server/deploy/setup.sh"

# Update setup script with repo URL
echo "Configuring repository URL..."
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_IP "sudo sed -i 's|REPO_URL=\".*\"|REPO_URL=\"$REPO_URL\"|' /opt/blyss/server/deploy/setup.sh"

echo ""
echo "=========================================="
echo "Files uploaded successfully!"
echo "=========================================="
echo ""
echo "Now SSH into the server and run the setup:"
echo ""
echo "  ssh -i \"$SSH_KEY\" $SERVER_USER@$SERVER_IP"
echo "  sudo /opt/blyss/server/deploy/setup.sh"
echo ""
echo "Or run it directly:"
echo ""
echo "  ssh -i \"$SSH_KEY\" $SERVER_USER@$SERVER_IP \"sudo /opt/blyss/server/deploy/setup.sh\""
echo ""
echo "=========================================="

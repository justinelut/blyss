#!/bin/bash
# One-time script to force reset the repository
# Run this directly on the server: sudo bash force-reset.sh

set -e

APP_USER="ubuntu"
APP_DIR="/opt/blyss"

echo "=========================================="
echo "  Force Reset Repository"
echo "=========================================="
echo ""

echo "[INFO] Fixing repository permissions..."
chown -R $APP_USER:$APP_USER "$APP_DIR/blyss"

echo "[INFO] Force resetting to GitHub master..."
su - $APP_USER -c "cd $APP_DIR/blyss && git fetch origin && git clean -fd && git reset --hard origin/master"

echo ""
echo "✅ Repository reset complete!"
echo ""
echo "Now run the normal update script:"
echo "  cd /opt/blyss/blyss/oracle/scripts"
echo "  sudo bash update.sh"

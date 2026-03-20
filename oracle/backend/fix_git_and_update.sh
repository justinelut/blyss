#!/bin/bash
# Fix git ownership and pull latest code on Oracle backend instance

echo "Fixing git ownership issue..."
sudo git config --global --add safe.directory /opt/blyss/blyss

echo ""
echo "Pulling latest code..."
cd /opt/blyss/blyss
sudo git pull origin master

echo ""
echo "Running migrations..."
cd server
sudo -u blyss /home/blyss/.local/bin/uv run task db_migrate

echo ""
echo "Restarting services..."
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker

echo ""
echo "Checking service status..."
sudo systemctl status blyss-api --no-pager
sudo systemctl status blyss-worker --no-pager

echo ""
echo "✓ Update complete!"
echo ""
echo "Test the API:"
echo "curl https://server.blyss.co.ke/healthz"

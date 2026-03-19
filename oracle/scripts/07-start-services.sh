#!/bin/bash
# Start Services: Start API and Worker
set -e

source "$(dirname "$0")/common.sh"

log_info "Starting services..."

# Start services
systemctl start blyss-api
systemctl start blyss-worker

# Wait a moment for services to start
sleep 3

# Display status
echo ""
echo "=========================================="
echo "  Services Started!"
echo "=========================================="
echo ""
echo "API Service:"
systemctl status blyss-api --no-pager -l | head -n 10
echo ""
echo "Worker Service:"
systemctl status blyss-worker --no-pager -l | head -n 10
echo ""

log_success "Services started successfully!"

#!/bin/bash
# Systemd Setup: Create and enable services
set -e

source "$(dirname "$0")/common.sh"

log_info "Starting systemd setup..."

# API Service
log_info "Creating blyss-api service..."
cat > /etc/systemd/system/blyss-api.service << 'APISERVICE'
[Unit]
Description=Blyss API Server
After=network.target

[Service]
Type=simple
User=blyss
Group=blyss
WorkingDirectory=/opt/blyss/blyss/server
Environment="PATH=/home/blyss/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/blyss/.local/bin/uv run task api
Restart=always
RestartSec=10
StandardOutput=append:/var/log/blyss/api.log
StandardError=append:/var/log/blyss/api-error.log
MemoryMax=512M
CPUQuota=80%

[Install]
WantedBy=multi-user.target
APISERVICE

# Worker Service
log_info "Creating blyss-worker service..."
cat > /etc/systemd/system/blyss-worker.service << 'WORKERSERVICE'
[Unit]
Description=Blyss Background Worker
After=network.target blyss-api.service

[Service]
Type=simple
User=blyss
Group=blyss
WorkingDirectory=/opt/blyss/blyss/server
Environment="PATH=/home/blyss/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/blyss/.local/bin/uv run task worker
Restart=always
RestartSec=10
StandardOutput=append:/var/log/blyss/worker.log
StandardError=append:/var/log/blyss/worker-error.log
MemoryMax=256M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
WORKERSERVICE

# Reload and enable services
systemctl daemon-reload
systemctl enable blyss-api
systemctl enable blyss-worker

log_success "Systemd services created and enabled!"

#!/bin/bash
# Nginx Setup: Configure reverse proxy
set -e

source "$(dirname "$0")/common.sh"

log_info "Starting Nginx setup..."

# Create Nginx configuration
log_info "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/blyss << 'NGINXCONF'
server {
    listen 80;
    server_name server.blyss.co.ke;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /healthz {
        proxy_pass http://127.0.0.1:8000/healthz;
        access_log off;
    }
}
NGINXCONF

# Enable site
if [ ! -L /etc/nginx/sites-enabled/blyss ]; then
    ln -s /etc/nginx/sites-available/blyss /etc/nginx/sites-enabled/
    log_info "Nginx site enabled"
fi

# Remove default site
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    log_info "Default site removed"
fi

# Test nginx configuration
log_info "Testing Nginx configuration..."
nginx -t

# Reload nginx
systemctl reload nginx

log_success "Nginx setup completed!"

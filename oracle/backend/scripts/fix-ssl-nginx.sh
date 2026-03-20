#!/bin/bash
# Fix SSL Nginx Configuration
set -e

source "$(dirname "$0")/common.sh"

check_root

log_info "Fixing Nginx SSL configuration..."

# Create proper SSL-enabled Nginx config
cat > /etc/nginx/sites-available/blyss << 'NGINXCONF'
server {
    listen 80;
    server_name server.blyss.co.ke;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name server.blyss.co.ke;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/server.blyss.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/server.blyss.co.ke/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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

# Test configuration
log_info "Testing Nginx configuration..."
nginx -t

# Reload Nginx
log_info "Reloading Nginx..."
systemctl reload nginx

# Wait a moment
sleep 2

# Check if listening on 443
if ss -tlnp | grep -q ":443"; then
    log_success "Nginx is now listening on port 443!"
else
    log_error "Nginx still not listening on port 443"
    log_info "Checking Nginx status..."
    systemctl status nginx --no-pager
fi

log_success "SSL configuration fixed!"

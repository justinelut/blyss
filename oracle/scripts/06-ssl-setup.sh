#!/bin/bash
# SSL Setup: Configure Let's Encrypt certificate
set -e

source "$(dirname "$0")/common.sh"

log_info "Starting SSL setup..."

# Setup SSL with Let's Encrypt
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    log_info "Obtaining SSL certificate..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@blyss.co.ke
    log_success "SSL certificate obtained"
else
    log_info "SSL certificate already exists"
fi

log_success "SSL setup completed!"

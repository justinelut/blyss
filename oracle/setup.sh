#!/bin/bash
# Blyss Backend Deployment - Main Orchestrator
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/common.sh"

echo "=========================================="
echo "  Blyss Backend Automated Deployment"
echo "  Oracle Cloud - 1GB RAM / 1 OCPU"
echo "=========================================="
echo ""

# Check root
check_root

# Parse arguments
SKIP_SYSTEM=false
SKIP_USER=false
SKIP_APP=false
SKIP_SYSTEMD=false
SKIP_NGINX=false
SKIP_SSL=false
SKIP_START=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-system)
            SKIP_SYSTEM=true
            shift
            ;;
        --skip-user)
            SKIP_USER=true
            shift
            ;;
        --skip-app)
            SKIP_APP=true
            shift
            ;;
        --skip-systemd)
            SKIP_SYSTEMD=true
            shift
            ;;
        --skip-nginx)
            SKIP_NGINX=true
            shift
            ;;
        --skip-ssl)
            SKIP_SSL=true
            shift
            ;;
        --skip-start)
            SKIP_START=true
            shift
            ;;
        --help)
            echo "Usage: sudo ./setup.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-system    Skip system setup (packages, swap, firewall)"
            echo "  --skip-user      Skip user setup"
            echo "  --skip-app       Skip application setup (repo, dependencies)"
            echo "  --skip-systemd   Skip systemd service creation"
            echo "  --skip-nginx     Skip Nginx configuration"
            echo "  --skip-ssl       Skip SSL certificate setup"
            echo "  --skip-start     Skip starting services"
            echo "  --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  sudo ./setup.sh                    # Full deployment"
            echo "  sudo ./setup.sh --skip-system      # Skip system setup"
            echo "  sudo ./setup.sh --skip-ssl         # Skip SSL (for testing)"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Make all scripts executable
chmod +x "$SCRIPT_DIR/scripts/"*.sh

# Run deployment steps
if [ "$SKIP_SYSTEM" = false ]; then
    log_info "Step 1/7: System Setup"
    bash "$SCRIPT_DIR/scripts/01-system-setup.sh"
    echo ""
else
    log_warn "Skipping system setup"
fi

if [ "$SKIP_USER" = false ]; then
    log_info "Step 2/7: User Setup"
    bash "$SCRIPT_DIR/scripts/02-user-setup.sh"
    echo ""
else
    log_warn "Skipping user setup"
fi

if [ "$SKIP_APP" = false ]; then
    log_info "Step 3/7: Application Setup"
    bash "$SCRIPT_DIR/scripts/03-app-setup.sh"
    echo ""
else
    log_warn "Skipping application setup"
fi

if [ "$SKIP_SYSTEMD" = false ]; then
    log_info "Step 4/7: Systemd Setup"
    bash "$SCRIPT_DIR/scripts/04-systemd-setup.sh"
    echo ""
else
    log_warn "Skipping systemd setup"
fi

if [ "$SKIP_NGINX" = false ]; then
    log_info "Step 5/7: Nginx Setup"
    bash "$SCRIPT_DIR/scripts/05-nginx-setup.sh"
    echo ""
else
    log_warn "Skipping Nginx setup"
fi

if [ "$SKIP_SSL" = false ]; then
    log_info "Step 6/7: SSL Setup"
    bash "$SCRIPT_DIR/scripts/06-ssl-setup.sh"
    echo ""
else
    log_warn "Skipping SSL setup"
fi

if [ "$SKIP_START" = false ]; then
    log_info "Step 7/7: Start Services"
    bash "$SCRIPT_DIR/scripts/07-start-services.sh"
    echo ""
else
    log_warn "Skipping service start"
fi

# Final summary
echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Access your application at:"
echo "  https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status blyss-api     - Check API status"
echo "  sudo systemctl status blyss-worker  - Check worker status"
echo "  sudo systemctl restart blyss-api    - Restart API"
echo "  sudo systemctl restart blyss-worker - Restart worker"
echo "  sudo tail -f /var/log/blyss/api.log - View API logs"
echo "  sudo tail -f /var/log/blyss/worker.log - View worker logs"
echo ""
echo "Health check:"
echo "  curl https://$DOMAIN/healthz"
echo ""
echo "To update the application:"
echo "  cd /opt/blyss/blyss && sudo ./oracle/scripts/update.sh"
echo ""

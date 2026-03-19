# Oracle Cloud Deployment Guide

Automated deployment script for Blyss backend on Oracle Cloud Infrastructure.

## Server Specifications

- **Instance**: 1GB RAM, 1 OCPU, 100GB Storage
- **OS**: Ubuntu 22.04 LTS
- **Domain**: server.blyss.co.ke
- **IP**: 92.4.130.9
- **Target Users**: 200 concurrent users

## Prerequisites

1. Oracle Cloud instance running Ubuntu 22.04
2. Domain DNS configured (server.blyss.co.ke → 92.4.130.9)
3. SSH access to the server
4. GitHub Personal Access Token (for private repo)

## Quick Start

### 1. SSH into your Oracle instance

```bash
ssh -i ssh-key-2026-03-17.key ubuntu@92.4.130.9
```

### 2. Clone the repository

```bash
git clone https://justinelut:YOUR_GITHUB_TOKEN@github.com/justinelut/blyss.git
cd blyss/oracle
```

### 3. Run the setup script

```bash
sudo chmod +x setup.sh
sudo ./setup.sh
```

The setup script orchestrates 7 modular scripts:

1. **01-system-setup.sh** - System packages, swap, firewall
2. **02-user-setup.sh** - Application user and uv installation
3. **03-app-setup.sh** - Repository, dependencies, JWKS, email renderer, migrations
4. **04-systemd-setup.sh** - Systemd service files
5. **05-nginx-setup.sh** - Nginx reverse proxy configuration
6. **06-ssl-setup.sh** - Let's Encrypt SSL certificate
7. **07-start-services.sh** - Start API and worker services

### Selective Deployment

You can skip specific steps if needed:

```bash
# Skip SSL setup (for testing)
sudo ./setup.sh --skip-ssl

# Skip system setup (if already done)
sudo ./setup.sh --skip-system

# Skip starting services (manual start later)
sudo ./setup.sh --skip-start

# See all options
sudo ./setup.sh --help
```

### Run Individual Scripts

You can also run individual scripts for specific tasks:

```bash
# Update application only
sudo ./scripts/update.sh

# Reconfigure Nginx only
sudo ./scripts/05-nginx-setup.sh

# Restart services only
sudo ./scripts/07-start-services.sh
```

## What Gets Deployed

### Services

1. **blyss-api** - FastAPI REST API server (port 8000)
   - Memory limit: 512MB
   - CPU quota: 80%
   - Auto-restart on failure

2. **blyss-worker** - Dramatiq background worker
   - Memory limit: 256MB
   - CPU quota: 50%
   - Auto-restart on failure

### External Services

- **Database**: Neon PostgreSQL (managed, SSL required)
- **Cache**: Upstash Redis (managed)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Payments**: Paystack (test mode)

## Service Management

### Check status
```bash
sudo systemctl status blyss-api
sudo systemctl status blyss-worker
```

### Restart services
```bash
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

### View logs
```bash
sudo tail -f /var/log/blyss/api.log
sudo tail -f /var/log/blyss/api-error.log
sudo tail -f /var/log/blyss/worker.log
sudo tail -f /var/log/blyss/worker-error.log
```

### Health check
```bash
curl https://server.blyss.co.ke/healthz
```

## Updating the Application

Use the dedicated update script:

```bash
cd /opt/blyss/blyss/oracle
sudo ./scripts/update.sh
```

This will:
- Pull latest code from GitHub
- Update Python dependencies
- Run database migrations
- Rebuild email renderer if needed
- Restart services

Or manually:

```bash
cd /opt/blyss/blyss
sudo -u blyss git pull
sudo -u blyss /home/blyss/.local/bin/uv sync
sudo -u blyss /home/blyss/.local/bin/uv run task db_migrate
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

## Troubleshooting

### API won't start
```bash
# Check logs
sudo journalctl -u blyss-api -n 50

# Check if port 8000 is in use
sudo lsof -i :8000

# Verify .env file
sudo -u blyss cat /opt/blyss/blyss/server/.env
```

### Database connection issues
```bash
# Test database connection
cd /opt/blyss/blyss/server
sudo -u blyss /home/blyss/.local/bin/uv run python -c "from polar.config import settings; print(settings.postgres_dsn)"
```

### Out of memory
```bash
# Check memory usage
free -h

# Check swap
swapon --show

# Monitor processes
htop
```

### SSL certificate issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## File Locations

- **Application**: `/opt/blyss/blyss/`
- **Server code**: `/opt/blyss/blyss/server/`
- **Environment**: `/opt/blyss/blyss/server/.env`
- **Logs**: `/var/log/blyss/`
- **Systemd services**: `/etc/systemd/system/blyss-*.service`
- **Nginx config**: `/etc/nginx/sites-available/blyss`
- **SSL certificates**: `/etc/letsencrypt/live/server.blyss.co.ke/`
- **Deployment scripts**: `/opt/blyss/blyss/oracle/scripts/`

## Script Reference

All deployment scripts are in the `oracle/scripts/` directory:

- **common.sh** - Shared configuration and functions
- **01-system-setup.sh** - System packages, swap, firewall
- **02-user-setup.sh** - User creation and uv installation
- **03-app-setup.sh** - Repository, dependencies, JWKS, migrations
- **04-systemd-setup.sh** - Systemd service creation
- **05-nginx-setup.sh** - Nginx configuration
- **06-ssl-setup.sh** - SSL certificate setup
- **07-start-services.sh** - Service startup
- **update.sh** - Application update helper

## Security Notes

- The GitHub token is embedded in the setup script for convenience
- In production, consider using SSH keys instead
- The .env file contains sensitive credentials - keep it secure
- Firewall is configured to only allow ports 22, 80, 443
- Services run as non-root user 'blyss'
- Memory and CPU limits prevent resource exhaustion

## Performance Optimization

The setup includes several optimizations for 1GB RAM:
- 2GB swap file with swappiness=10
- Memory limits on services (API: 512MB, Worker: 256MB)
- CPU quotas to prevent overload
- Connection pooling for PostgreSQL (Neon pooler)
- Redis for caching

## Multi-Instance Deployment

This backend (Instance 1) is part of a 5-instance architecture. To eliminate external service costs ($34+/month), deploy additional instances:

- **Instance 2**: PostgreSQL Primary + PgBouncer
- **Instance 3**: PostgreSQL Standby + Backups
- **Instance 4**: Redis + MinIO (S3-compatible storage)
- **Instance 5**: Prometheus + Grafana monitoring

See complete guides:
- `oracle/DEPLOYMENT_GUIDE.md` - Complete 5-instance deployment
- `oracle/DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `oracle/BACKEND_MIGRATION_GUIDE.md` - Migrate from Neon/Upstash/R2 to self-hosted
- `oracle/TAILSCALE_NETWORK_MAP.md` - Network reference

## Next Steps

After deployment:
1. Test the health endpoint: `curl https://server.blyss.co.ke/healthz`
2. Create your first user account
3. Configure Paystack production keys (currently using test keys)
4. Deploy additional instances (see guides above) to save $34+/month
5. Deploy frontend to Vercel

## Support

For issues or questions:
- Check logs: `/var/log/blyss/`
- Review systemd status: `systemctl status blyss-api blyss-worker`
- Check Nginx logs: `/var/log/nginx/error.log`

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

The script will automatically:
- Update system packages
- Install Python 3.12, Nginx, and dependencies
- Create 2GB swap memory (critical for 1GB RAM)
- Configure firewall (ports 22, 80, 443)
- Create application user
- Install uv (Python package manager)
- Clone/update repository
- Setup .env from .env.production
- Install Python dependencies
- Generate JWKS file (for JWT authentication)
- Build email renderer binary
- Run database migrations
- Create systemd services (API + Worker)
- Configure Nginx reverse proxy
- Setup SSL with Let's Encrypt
- Start all services

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

## Next Steps

After deployment:
1. Test the health endpoint: `curl https://server.blyss.co.ke/healthz`
2. Create your first user account
3. Configure Paystack production keys (currently using test keys)
4. Set up monitoring (optional)
5. Configure backups (database is managed by Neon)
6. Deploy frontend to Vercel

## Support

For issues or questions:
- Check logs: `/var/log/blyss/`
- Review systemd status: `systemctl status blyss-api blyss-worker`
- Check Nginx logs: `/var/log/nginx/error.log`

# Blyss Backend Deployment Guide - Oracle Cloud

## Prerequisites
- Oracle Cloud instance: 92.4.130.9
- Domain: server.blyss.co.ke pointing to 92.4.130.9
- SSH key: `server/oracle cloud server/ssh-key-2026-03-17.key`

## Step 1: Push Code to GitHub

```bash
# From your local machine in the project root
cd /path/to/blyss

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial deployment commit"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/blyss.git

# Push to GitHub
git push -u origin main
```

## Step 2: Connect to Oracle Cloud Server

```bash
# From your local machine
cd server

# Fix key permissions (important!)
chmod 400 "oracle cloud server/ssh-key-2026-03-17.key"

# SSH into the server
ssh -i "oracle cloud server/ssh-key-2026-03-17.key" ubuntu@92.4.130.9
```

If you get "Permission denied", the key might need to be for the `opc` user instead:
```bash
ssh -i "oracle cloud server/ssh-key-2026-03-17.key" opc@92.4.130.9
```

## Step 3: Upload Setup Script to Server

### Option A: Using SCP (from your local machine)
```bash
# Copy the setup script to the server
scp -i "oracle cloud server/ssh-key-2026-03-17.key" \
    deploy/setup.sh \
    ubuntu@92.4.130.9:/tmp/

# Copy systemd service files
scp -i "oracle cloud server/ssh-key-2026-03-17.key" \
    deploy/blyss-api.service \
    ubuntu@92.4.130.9:/tmp/

scp -i "oracle cloud server/ssh-key-2026-03-17.key" \
    deploy/blyss-worker.service \
    ubuntu@92.4.130.9:/tmp/

scp -i "oracle cloud server/ssh-key-2026-03-17.key" \
    deploy/nginx.conf \
    ubuntu@92.4.130.9:/tmp/
```

### Option B: Clone directly on server (recommended)
After SSH'ing into the server:
```bash
# On the server
cd /tmp
git clone https://github.com/YOUR_USERNAME/blyss.git
cd blyss/server/deploy
```

## Step 4: Run Automated Setup

```bash
# On the server, make script executable
chmod +x /tmp/blyss/server/deploy/setup.sh

# Run as root
sudo /tmp/blyss/server/deploy/setup.sh
```

The script will:
1. Update system packages
2. Install Python 3.12, Nginx, and dependencies
3. Create 2GB swap file
4. Configure firewall (UFW)
5. Create `blyss` user
6. Install `uv` package manager
7. Clone your repository to `/opt/blyss`
8. Create production `.env` file
9. Install Python dependencies
10. Run database migrations
11. Setup systemd services
12. Configure Nginx
13. Setup SSL with Let's Encrypt

## Step 5: Verify Deployment

```bash
# Check service status
sudo systemctl status blyss-api
sudo systemctl status blyss-worker

# View logs
sudo journalctl -u blyss-api -f
sudo journalctl -u blyss-worker -f

# Check if API is responding
curl http://localhost:8000/healthz
curl http://server.blyss.co.ke/healthz
```

## Step 6: Update Production Secrets

```bash
# Edit the production environment file
sudo nano /opt/blyss/server/.env.production

# Update these values:
# - POLAR_PAYSTACK_SECRET_KEY (use production key)
# - POLAR_PAYSTACK_PUBLIC_KEY (use production key)
# - POLAR_PAYSTACK_WEBHOOK_SECRET (generate a secure secret)
# - POLAR_SECRET (generate a secure JWT secret)

# Restart services after changes
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

## Useful Commands

### Service Management
```bash
# Restart services
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker

# Stop services
sudo systemctl stop blyss-api
sudo systemctl stop blyss-worker

# Start services
sudo systemctl start blyss-api
sudo systemctl start blyss-worker

# Check status
sudo systemctl status blyss-api
sudo systemctl status blyss-worker
```

### Logs
```bash
# Follow API logs
sudo journalctl -u blyss-api -f

# Follow worker logs
sudo journalctl -u blyss-worker -f

# View last 100 lines
sudo journalctl -u blyss-api -n 100

# View logs from today
sudo journalctl -u blyss-api --since today
```

### Updates
```bash
# Pull latest code
sudo su - blyss
cd /opt/blyss
git pull

# Install new dependencies
/home/blyss/.local/bin/uv sync

# Run migrations
/home/blyss/.local/bin/uv run task db_migrate

# Exit blyss user
exit

# Restart services
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

### Nginx
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Renewal
```bash
# Renew SSL certificate (auto-renews, but can force)
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### System Monitoring
```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Check CPU and memory
htop

# Check swap usage
swapon --show
```

## Troubleshooting

### Service won't start
```bash
# Check detailed logs
sudo journalctl -u blyss-api -n 50 --no-pager

# Check if port 8000 is in use
sudo lsof -i :8000

# Check environment variables
sudo cat /opt/blyss/server/.env.production
```

### Out of memory
```bash
# Check swap
free -h
swapon --show

# If swap not active
sudo swapon /swapfile

# Check memory usage by process
ps aux --sort=-%mem | head -10
```

### Database connection issues
```bash
# Test database connection
sudo su - blyss
cd /opt/blyss/server
/home/blyss/.local/bin/uv run python -c "from polar.postgres import create_async_engine; import asyncio; asyncio.run(create_async_engine('test').connect())"
```

### Nginx issues
```bash
# Check Nginx configuration
sudo nginx -t

# Check if Nginx is running
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key-only authentication
- [ ] SSL certificate installed
- [ ] Production secrets updated
- [ ] Database uses SSL
- [ ] Redis uses password
- [ ] Regular backups configured

## Performance Optimization for 1GB RAM

The setup includes:
- 2GB swap file
- Memory limits on services (API: 512MB, Worker: 256MB)
- CPU quotas to prevent overload
- Nginx caching
- Connection pooling for database

## Next Steps

1. Update frontend `.env` to point to `https://server.blyss.co.ke`
2. Deploy frontend to Vercel
3. Configure Paystack webhooks to point to your server
4. Set up monitoring (optional: UptimeRobot, Sentry)
5. Configure automated backups

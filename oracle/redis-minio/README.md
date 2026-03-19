# Redis + MinIO Storage - Instance 4

Automated deployment for Redis cache and MinIO S3-compatible object storage.

## Server Specifications

- **Instance**: 1GB RAM, 1 OCPU, 100GB Storage
- **OS**: Ubuntu 22.04 LTS
- **Domain**: storage.blyss.co.ke (for MinIO console)
- **Tailscale IP**: Will be assigned (e.g., 100.64.0.4)
- **Services**: Redis 7, MinIO, Nginx

## Prerequisites

1. Oracle Cloud instance running Ubuntu 22.04
2. Tailscale auth key
3. (Optional) Domain DNS configured: storage.blyss.co.ke → Instance IP

## Quick Start

### 1. SSH into your Oracle instance

```bash
ssh -i your-key.key ubuntu@YOUR_INSTANCE_IP
```

### 2. Download deployment scripts

```bash
sudo mkdir -p /opt/blyss
cd /opt/blyss

git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/justinelut/blyss.git temp
cd temp
git sparse-checkout set oracle/redis-minio
mv oracle/redis-minio/* /opt/blyss/
cd /opt/blyss
rm -rf temp
```

### 3. Configure Tailscale auth key

```bash
nano scripts/common.sh
# Set: TAILSCALE_AUTH_KEY="tskey-auth-xxxxx"
```

### 4. Run the setup script

```bash
sudo chmod +x setup.sh
sudo ./setup.sh
```

## What Gets Deployed

### Services

1. **Redis 7** - In-memory cache and queue
   - Port: 6379 (Tailscale only)
   - Password protected
   - Persistence enabled (AOF + RDB)
   - Max memory: 512MB with LRU eviction

2. **MinIO** - S3-compatible object storage
   - API Port: 9000 (Tailscale only)
   - Console Port: 9001 (Public with Nginx)
   - SSL/TLS enabled
   - Buckets: blyss-files, blyss-public

3. **Nginx** - Reverse proxy for MinIO console
   - Port: 80/443
   - SSL/TLS with Let's Encrypt
   - Access: https://storage.blyss.co.ke

## Redis Configuration

### Connection Details

```bash
# From backend (Instance 1)
REDIS_HOST=100.64.0.4
REDIS_PORT=6379
REDIS_PASSWORD=RedisSecure2024!
REDIS_DB=0
```

### Redis CLI

```bash
# Connect locally
redis-cli -a RedisSecure2024!

# Test connection
redis-cli -a RedisSecure2024! ping
# Should return: PONG
```

### Monitor Redis

```bash
# Real-time monitoring
redis-cli -a RedisSecure2024! monitor

# Get info
redis-cli -a RedisSecure2024! info

# Check memory usage
redis-cli -a RedisSecure2024! info memory
```

## MinIO Configuration

### Connection Details

```bash
# S3-compatible endpoint
ENDPOINT=http://100.64.0.4:9000
ACCESS_KEY=minioadmin
SECRET_KEY=minioadmin123

# Web Console
https://storage.blyss.co.ke
```

### MinIO Client (mc)

```bash
# Configure mc
mc alias set blyss http://100.64.0.4:9000 minioadmin minioadmin123

# List buckets
mc ls blyss

# Upload file
mc cp file.txt blyss/blyss-files/

# Download file
mc cp blyss/blyss-files/file.txt ./
```

### Buckets

- **blyss-files**: Private files (user uploads, documents)
- **blyss-public**: Public files (images, assets)

## Updating Backend Configuration

On Instance 1 (Backend), update `/opt/blyss/blyss/server/.env`:

```bash
# Redis (replace Upstash)
POLAR_REDIS_HOST=100.64.0.4
POLAR_REDIS_PORT=6379
POLAR_REDIS_DB=0
POLAR_REDIS_PASSWORD=RedisSecure2024!

# MinIO (replace Cloudflare R2)
POLAR_AWS_ACCESS_KEY_ID=minioadmin
POLAR_AWS_SECRET_ACCESS_KEY=minioadmin123
POLAR_S3_ENDPOINT_URL=http://100.64.0.4:9000
POLAR_AWS_REGION=us-east-1
POLAR_S3_FILES_BUCKET_NAME=blyss-files
POLAR_S3_FILES_PUBLIC_BUCKET_NAME=blyss-public
POLAR_S3_CUSTOMER_INVOICES_BUCKET_NAME=blyss-files
POLAR_S3_PAYOUT_INVOICES_BUCKET_NAME=blyss-files
```

Then restart:
```bash
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

## Service Management

### Redis

```bash
# Status
sudo systemctl status redis-server

# Restart
sudo systemctl restart redis-server

# Logs
sudo tail -f /var/log/redis/redis-server.log
```

### MinIO

```bash
# Status
sudo systemctl status minio

# Restart
sudo systemctl restart minio

# Logs
sudo journalctl -u minio -f
```

## Monitoring

### Redis Metrics

```bash
# Memory usage
redis-cli -a RedisSecure2024! info memory | grep used_memory_human

# Connected clients
redis-cli -a RedisSecure2024! info clients

# Operations per second
redis-cli -a RedisSecure2024! info stats | grep instantaneous_ops_per_sec
```

### MinIO Metrics

```bash
# Disk usage
mc admin info blyss

# Server info
curl http://100.64.0.4:9000/minio/health/live
```

## Troubleshooting

### Redis Not Starting

```bash
# Check logs
sudo tail -f /var/log/redis/redis-server.log

# Check if port is in use
sudo netstat -tlnp | grep 6379

# Test connection
redis-cli -h 100.64.0.4 -a RedisSecure2024! ping
```

### MinIO Not Accessible

```bash
# Check service
sudo systemctl status minio

# Check logs
sudo journalctl -u minio -n 50

# Test API
curl http://100.64.0.4:9000/minio/health/live
```

### Can't Connect from Backend

```bash
# Check Tailscale
sudo tailscale status
sudo tailscale ping 100.64.0.1  # Backend instance

# Check firewall
sudo ufw status
```

## File Locations

- **Redis config**: `/etc/redis/redis.conf`
- **Redis data**: `/var/lib/redis/`
- **MinIO data**: `/mnt/minio/data/`
- **MinIO config**: `/etc/default/minio`
- **Nginx config**: `/etc/nginx/sites-available/minio`
- **Scripts**: `/opt/blyss/scripts/`

## Security Notes

- Redis only accessible via Tailscale
- MinIO API only accessible via Tailscale
- MinIO Console accessible via HTTPS with SSL
- Password authentication required
- Firewall blocks external access to Redis/MinIO API

## Next Steps

After deployment:
1. Note your Tailscale IP
2. Access MinIO console: https://storage.blyss.co.ke
3. Update backend .env with Redis and MinIO settings
4. Test Redis connection from backend
5. Upload test file to MinIO
6. Deploy Instance 5 (Monitoring)

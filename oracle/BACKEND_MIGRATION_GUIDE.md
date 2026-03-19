# Backend Migration Guide: From Managed Services to Self-Hosted

Complete guide for migrating Instance 1 (Backend) from managed services (Neon, Upstash, R2) to self-hosted services on Instances 2-4.

## Overview

This guide helps you:
1. Add Tailscale to existing backend (Instance 1)
2. Migrate from Neon PostgreSQL to self-hosted (Instance 2)
3. Migrate from Upstash Redis to self-hosted (Instance 4)
4. Migrate from Cloudflare R2 to MinIO (Instance 4)

## Prerequisites

- All 5 instances deployed and running
- Tailscale IPs noted from each instance
- SSH access to Instance 1 (Backend)

## Step 1: Add Tailscale to Backend (Instance 1)

### 1.1 SSH into Backend

```bash
ssh -i ssh-key-2026-03-17.key ubuntu@92.4.130.9
```

### 1.2 Update common.sh with Tailscale Auth Key

```bash
cd /opt/blyss/blyss/oracle
sudo nano scripts/common.sh
```

Add your Tailscale auth key:
```bash
TAILSCALE_AUTH_KEY="tskey-auth-xxxxx"
```

### 1.3 Run Tailscale Setup

```bash
sudo chmod +x scripts/08-tailscale-setup.sh
sudo ./scripts/08-tailscale-setup.sh
```

### 1.4 Verify Tailscale Connection

```bash
# Check Tailscale status
sudo tailscale status

# Get your Tailscale IP
sudo tailscale ip -4

# Test connectivity to other instances
sudo tailscale ping 100.64.0.2  # PostgreSQL Primary
sudo tailscale ping 100.64.0.3  # PostgreSQL Standby
sudo tailscale ping 100.64.0.4  # Redis + MinIO
sudo tailscale ping 100.64.0.5  # Monitoring
```

## Step 2: Migrate PostgreSQL (Neon → Self-Hosted)

### 2.1 Backup Current Database

```bash
# Export from Neon (run locally, not on server)
pg_dump "postgresql://[neon-connection-string]" > neon_backup.sql
```

### 2.2 Update Backend .env

```bash
cd /opt/blyss/blyss/server
sudo -u blyss nano .env
```

Replace Neon configuration:

```bash
# OLD (Neon)
# POLAR_POSTGRES_HOST=ep-xxx.us-east-2.aws.neon.tech
# POLAR_POSTGRES_PORT=5432
# POLAR_POSTGRES_USER=neondb_owner
# POLAR_POSTGRES_PWD=xxx
# POLAR_POSTGRES_DATABASE=neondb
# POLAR_POSTGRES_SSL_MODE=require

# NEW (Self-hosted via Tailscale)
POLAR_POSTGRES_HOST=100.64.0.2
POLAR_POSTGRES_PORT=6432
POLAR_POSTGRES_USER=blyss
POLAR_POSTGRES_PWD=BlyssDB2024Secure!
POLAR_POSTGRES_DATABASE=blyss
POLAR_POSTGRES_SSL_MODE=prefer

# Read Replica (Instance 3)
POLAR_POSTGRES_READ_HOST=100.64.0.3
POLAR_POSTGRES_READ_PORT=6432
POLAR_POSTGRES_READ_USER=blyss
POLAR_POSTGRES_READ_PWD=BlyssDB2024Secure!
POLAR_POSTGRES_READ_DATABASE=blyss
POLAR_POSTGRES_READ_SSL_MODE=prefer
```

### 2.3 Import Data to Self-Hosted PostgreSQL

```bash
# Copy backup to Instance 2
scp -i ssh-key-2026-03-17.key neon_backup.sql ubuntu@INSTANCE_2_IP:/tmp/

# SSH into Instance 2
ssh -i ssh-key-2026-03-17.key ubuntu@INSTANCE_2_IP

# Import data
sudo -u postgres psql blyss < /tmp/neon_backup.sql

# Verify import
sudo -u postgres psql blyss -c "SELECT COUNT(*) FROM products;"
```

### 2.4 Test Backend Connection

```bash
# On Instance 1 (Backend)
cd /opt/blyss/blyss/server

# Test database connection
sudo -u blyss /home/blyss/.local/bin/uv run python -c "
from polar.config import settings
print(f'Database: {settings.postgres_dsn}')
"

# Run migrations (should show all up-to-date)
sudo -u blyss /home/blyss/.local/bin/uv run task db_migrate
```

## Step 3: Migrate Redis (Upstash → Self-Hosted)

### 3.1 Update Backend .env

```bash
cd /opt/blyss/blyss/server
sudo -u blyss nano .env
```

Replace Upstash configuration:

```bash
# OLD (Upstash)
# POLAR_REDIS_HOST=xxx.upstash.io
# POLAR_REDIS_PORT=6379
# POLAR_REDIS_DB=0
# POLAR_REDIS_PASSWORD=xxx

# NEW (Self-hosted via Tailscale)
POLAR_REDIS_HOST=100.64.0.4
POLAR_REDIS_PORT=6379
POLAR_REDIS_DB=0
POLAR_REDIS_PASSWORD=RedisSecure2024!
```

### 3.2 Test Redis Connection

```bash
# On Instance 1 (Backend)
cd /opt/blyss/blyss/server

# Test Redis connection
sudo -u blyss /home/blyss/.local/bin/uv run python -c "
import redis
r = redis.Redis(host='100.64.0.4', port=6379, password='RedisSecure2024!', db=0)
r.ping()
print('Redis connection successful!')
"
```

### 3.3 Clear Old Cache (Optional)

Since you're switching Redis instances, the cache will be empty. This is fine - it will rebuild automatically.

## Step 4: Migrate Storage (Cloudflare R2 → MinIO)

### 4.1 Update Backend .env

```bash
cd /opt/blyss/blyss/server
sudo -u blyss nano .env
```

Replace R2 configuration:

```bash
# OLD (Cloudflare R2)
# POLAR_AWS_ACCESS_KEY_ID=xxx
# POLAR_AWS_SECRET_ACCESS_KEY=xxx
# POLAR_S3_ENDPOINT_URL=https://xxx.r2.cloudflarestorage.com
# POLAR_AWS_REGION=auto

# NEW (MinIO via Tailscale)
POLAR_AWS_ACCESS_KEY_ID=minioadmin
POLAR_AWS_SECRET_ACCESS_KEY=minioadmin123
POLAR_S3_ENDPOINT_URL=http://100.64.0.4:9000
POLAR_AWS_REGION=us-east-1

# Bucket names (keep same or update)
POLAR_S3_FILES_BUCKET_NAME=blyss-files
POLAR_S3_FILES_PUBLIC_BUCKET_NAME=blyss-public
POLAR_S3_CUSTOMER_INVOICES_BUCKET_NAME=blyss-files
POLAR_S3_PAYOUT_INVOICES_BUCKET_NAME=blyss-files
```

### 4.2 Migrate Existing Files from R2 to MinIO

```bash
# Install AWS CLI (if not already installed)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure R2 credentials
aws configure --profile r2
# Enter your R2 credentials

# Configure MinIO credentials
aws configure --profile minio
# Access Key: minioadmin
# Secret Key: minioadmin123
# Region: us-east-1

# Sync files from R2 to MinIO
aws s3 sync s3://blyss-files \
  s3://blyss-files \
  --profile r2 \
  --endpoint-url https://xxx.r2.cloudflarestorage.com \
  --source-region auto \
  --profile minio \
  --endpoint-url http://100.64.0.4:9000

aws s3 sync s3://blyss-public \
  s3://blyss-public \
  --profile r2 \
  --endpoint-url https://xxx.r2.cloudflarestorage.com \
  --source-region auto \
  --profile minio \
  --endpoint-url http://100.64.0.4:9000
```

Or use MinIO Client (mc):

```bash
# Install mc
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure R2
mc alias set r2 https://xxx.r2.cloudflarestorage.com ACCESS_KEY SECRET_KEY

# Configure MinIO
mc alias set minio http://100.64.0.4:9000 minioadmin minioadmin123

# Mirror files
mc mirror r2/blyss-files minio/blyss-files
mc mirror r2/blyss-public minio/blyss-public
```

### 4.3 Test MinIO Connection

```bash
# On Instance 1 (Backend)
cd /opt/blyss/blyss/server

# Test S3 connection
sudo -u blyss /home/blyss/.local/bin/uv run python -c "
import boto3
s3 = boto3.client(
    's3',
    endpoint_url='http://100.64.0.4:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin123',
    region_name='us-east-1'
)
buckets = s3.list_buckets()
print('MinIO connection successful!')
print('Buckets:', [b['Name'] for b in buckets['Buckets']])
"
```

## Step 5: Restart Backend Services

```bash
# On Instance 1 (Backend)
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker

# Check status
sudo systemctl status blyss-api
sudo systemctl status blyss-worker

# Check logs for errors
sudo tail -f /var/log/blyss/api.log
sudo tail -f /var/log/blyss/worker.log
```

## Step 6: Verify Everything Works

### 6.1 Health Check

```bash
curl https://server.blyss.co.ke/healthz
```

### 6.2 Test Database

```bash
curl https://server.blyss.co.ke/v1/products/public?limit=5
```

### 6.3 Test Redis (check logs for cache hits)

```bash
sudo tail -f /var/log/blyss/api.log | grep -i redis
```

### 6.4 Test File Upload

Upload a test file through your application and verify it appears in MinIO:

```bash
# On Instance 4
mc ls minio/blyss-files
```

## Step 7: Monitor Performance

Access Grafana dashboard:
```
https://monitor.blyss.co.ke
Login: admin/admin
```

Check:
- Database connections and query performance
- Redis memory usage and hit rate
- MinIO storage usage
- API response times

## Rollback Plan

If something goes wrong, you can quickly rollback:

### Rollback to Neon

```bash
cd /opt/blyss/blyss/server
sudo -u blyss nano .env
# Restore old Neon configuration
sudo systemctl restart blyss-api blyss-worker
```

### Rollback to Upstash

```bash
cd /opt/blyss/blyss/server
sudo -u blyss nano .env
# Restore old Upstash configuration
sudo systemctl restart blyss-api blyss-worker
```

### Rollback to R2

```bash
cd /opt/blyss/blyss/server
sudo -u blyss nano .env
# Restore old R2 configuration
sudo systemctl restart blyss-api blyss-worker
```

## Cost Savings Summary

| Service | Before (Monthly) | After | Savings |
|---------|------------------|-------|---------|
| Neon PostgreSQL | $19+ | $0 | $19+ |
| Upstash Redis | $10+ | $0 | $10+ |
| Cloudflare R2 | $5+ | $0 | $5+ |
| **Total** | **$34+** | **$0** | **$34+** |

## Troubleshooting

### Can't Connect to PostgreSQL

```bash
# Check Tailscale connectivity
sudo tailscale ping 100.64.0.2

# Check if PostgreSQL is listening
# On Instance 2:
sudo netstat -tlnp | grep 6432

# Check PgBouncer logs
# On Instance 2:
sudo journalctl -u pgbouncer -f
```

### Can't Connect to Redis

```bash
# Check Tailscale connectivity
sudo tailscale ping 100.64.0.4

# Test Redis directly
redis-cli -h 100.64.0.4 -a RedisSecure2024! ping

# Check Redis logs
# On Instance 4:
sudo tail -f /var/log/redis/redis-server.log
```

### Can't Connect to MinIO

```bash
# Check Tailscale connectivity
sudo tailscale ping 100.64.0.4

# Test MinIO API
curl http://100.64.0.4:9000/minio/health/live

# Check MinIO logs
# On Instance 4:
sudo journalctl -u minio -f
```

## Next Steps

After successful migration:

1. **Cancel Managed Services** (after 1-2 weeks of stable operation):
   - Cancel Neon PostgreSQL subscription
   - Cancel Upstash Redis subscription
   - Cancel Cloudflare R2 subscription

2. **Set Up Monitoring Alerts**:
   - Configure Grafana alerts for disk space
   - Set up alerts for database replication lag
   - Monitor Redis memory usage

3. **Schedule Regular Backups**:
   - Automated daily backups are already configured on Instance 3
   - Test restore procedure monthly

4. **Performance Tuning**:
   - Monitor query performance in Grafana
   - Adjust PostgreSQL settings if needed
   - Tune Redis memory limits based on usage

5. **Security Hardening**:
   - Change default passwords (PostgreSQL, Redis, MinIO)
   - Rotate Tailscale auth keys periodically
   - Review firewall rules

## Support

For issues:
- Check service logs on each instance
- Verify Tailscale connectivity: `sudo tailscale status`
- Review Grafana dashboards for performance issues
- Check individual instance READMEs for service-specific troubleshooting


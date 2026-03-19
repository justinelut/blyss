# Blyss Multi-Instance Deployment Guide

Complete guide for deploying Blyss across 5 Oracle Cloud instances with Tailscale VPN.

## Architecture Overview

```
Instance 1 (Backend)      → 92.4.130.9 → server.blyss.co.ke
Instance 2 (PostgreSQL)   → [New IP]   → db.blyss.co.ke (optional)
Instance 3 (PG Standby)   → [New IP]   → (internal only)
Instance 4 (Redis+MinIO)  → [New IP]   → storage.blyss.co.ke
Instance 5 (Monitoring)   → [New IP]   → monitor.blyss.co.ke

All connected via Tailscale VPN (100.64.0.x network)
```

## Prerequisites

1. **5 Oracle Cloud Instances** (1GB RAM, 1 OCPU, 100GB each)
2. **Tailscale Account**: https://login.tailscale.com/start
3. **DNS Records** (optional for web UIs):
   - db.blyss.co.ke → Instance 2 IP
   - storage.blyss.co.ke → Instance 4 IP
   - monitor.blyss.co.ke → Instance 5 IP

## Step 1: Setup Tailscale

1. Create Tailscale account: https://login.tailscale.com/start
2. Generate auth key: https://login.tailscale.com/admin/settings/keys
   - Make it reusable
   - Set expiration to never (or long duration)
3. Save the auth key (format: `tskey-auth-xxxxx`)

## Step 2: Deploy PostgreSQL Primary (Instance 2)

```bash
# SSH into Instance 2
ssh -i your-key.key ubuntu@INSTANCE_2_IP

# Download deployment scripts
sudo mkdir -p /opt/blyss
cd /opt/blyss
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/justinelut/blyss.git temp
cd temp
git sparse-checkout set oracle/postgres-primary
mv oracle/postgres-primary/* /opt/blyss/
cd /opt/blyss
rm -rf temp

# Configure Tailscale auth key
nano scripts/common.sh
# Set: TAILSCALE_AUTH_KEY="tskey-auth-xxxxx"

# Run deployment
sudo chmod +x setup.sh
sudo ./setup.sh

# Note the Tailscale IP (e.g., 100.64.0.2)
sudo tailscale ip -4
```

## Step 3: Deploy PostgreSQL Standby (Instance 3)

```bash
# SSH into Instance 3
ssh -i your-key.key ubuntu@INSTANCE_3_IP

# Download deployment scripts
sudo mkdir -p /opt/blyss
cd /opt/blyss
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/justinelut/blyss.git temp
cd temp
git sparse-checkout set oracle/postgres-standby
mv oracle/postgres-standby/* /opt/blyss/
cd /opt/blyss
rm -rf temp

# Configure settings
nano scripts/common.sh
# Set: TAILSCALE_AUTH_KEY="tskey-auth-xxxxx"
# Set: PRIMARY_HOST="100.64.0.2"  # Instance 2 Tailscale IP

# Run deployment
sudo chmod +x setup.sh
sudo ./setup.sh

# Note the Tailscale IP
sudo tailscale ip -4

# Verify replication
sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"
```

## Step 4: Deploy Redis + MinIO (Instance 4)

```bash
# SSH into Instance 4
ssh -i your-key.key ubuntu@INSTANCE_4_IP

# Download deployment scripts
sudo mkdir -p /opt/blyss
cd /opt/blyss
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/justinelut/blyss.git temp
cd temp
git sparse-checkout set oracle/redis-minio
mv oracle/redis-minio/* /opt/blyss/
cd /opt/blyss
rm -rf temp

# Configure Tailscale auth key
nano scripts/common.sh
# Set: TAILSCALE_AUTH_KEY="tskey-auth-xxxxx"

# Run deployment
sudo chmod +x setup.sh
sudo ./setup.sh

# Note the Tailscale IP
sudo tailscale ip -4

# Test Redis
redis-cli -a RedisSecure2024! ping

# Access MinIO console
# https://storage.blyss.co.ke (if DNS configured)
# Login: minioadmin / minioadmin123
```

## Step 5: Deploy Monitoring (Instance 5)

```bash
# SSH into Instance 5
ssh -i your-key.key ubuntu@INSTANCE_5_IP

# Download deployment scripts
sudo mkdir -p /opt/blyss
cd /opt/blyss
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/justinelut/blyss.git temp
cd temp
git sparse-checkout set oracle/monitoring
mv oracle/monitoring/* /opt/blyss/
cd /opt/blyss
rm -rf temp

# Configure settings
nano scripts/common.sh
# Set: TAILSCALE_AUTH_KEY="tskey-auth-xxxxx"
# Set all instance Tailscale IPs:
# BACKEND_IP="100.64.0.1"
# POSTGRES_PRIMARY_IP="100.64.0.2"
# POSTGRES_STANDBY_IP="100.64.0.3"
# REDIS_MINIO_IP="100.64.0.4"

# Run deployment
sudo chmod +x setup.sh
sudo ./setup.sh

# Access Grafana
# https://monitor.blyss.co.ke
# Login: admin/admin (change password!)
```

## Step 6: Add Tailscale to Backend (Instance 1)

```bash
# SSH into Instance 1 (Backend)
ssh -i your-key.key ubuntu@92.4.130.9

# Update common.sh with Tailscale auth key
cd /opt/blyss/blyss/oracle
sudo nano scripts/common.sh
# Add: TAILSCALE_AUTH_KEY="tskey-auth-xxxxx"

# Run Tailscale setup
sudo chmod +x scripts/08-tailscale-setup.sh
sudo ./scripts/08-tailscale-setup.sh

# Verify connectivity to all instances
sudo tailscale status
sudo tailscale ping 100.64.0.2  # PostgreSQL Primary
sudo tailscale ping 100.64.0.3  # PostgreSQL Standby
sudo tailscale ping 100.64.0.4  # Redis + MinIO
sudo tailscale ping 100.64.0.5  # Monitoring
```

## Step 7: Migrate Backend to Self-Hosted Services

Follow the detailed migration guide: `oracle/BACKEND_MIGRATION_GUIDE.md`

Quick summary:

### 7.1 Backup Neon Database

```bash
# Run locally (not on server)
pg_dump "postgresql://[neon-connection-string]" > neon_backup.sql
```

### 7.2 Update Backend .env

```bash
# On Instance 1
cd /opt/blyss/blyss/server
sudo -u blyss nano .env
```

Replace with:

```bash
# PostgreSQL (replace Neon)
POLAR_POSTGRES_HOST=100.64.0.2
POLAR_POSTGRES_PORT=6432
POLAR_POSTGRES_USER=blyss
POLAR_POSTGRES_PWD=BlyssDB2024Secure!
POLAR_POSTGRES_DATABASE=blyss
POLAR_POSTGRES_SSL_MODE=prefer

# Read Replica
POLAR_POSTGRES_READ_HOST=100.64.0.3
POLAR_POSTGRES_READ_PORT=6432
POLAR_POSTGRES_READ_USER=blyss
POLAR_POSTGRES_READ_PWD=BlyssDB2024Secure!
POLAR_POSTGRES_READ_DATABASE=blyss
POLAR_POSTGRES_READ_SSL_MODE=prefer

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

### 7.3 Import Data to PostgreSQL

```bash
# Copy backup to Instance 2
scp -i your-key.key neon_backup.sql ubuntu@INSTANCE_2_IP:/tmp/

# SSH into Instance 2 and import
ssh -i your-key.key ubuntu@INSTANCE_2_IP
sudo -u postgres psql blyss < /tmp/neon_backup.sql
```

### 7.4 Migrate Files to MinIO

```bash
# Install MinIO client
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure R2 and MinIO
mc alias set r2 https://xxx.r2.cloudflarestorage.com R2_ACCESS_KEY R2_SECRET_KEY
mc alias set minio http://100.64.0.4:9000 minioadmin minioadmin123

# Mirror files
mc mirror r2/blyss-files minio/blyss-files
mc mirror r2/blyss-public minio/blyss-public
```

### 7.5 Restart Backend Services

```bash
# On Instance 1
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker

# Verify
curl https://server.blyss.co.ke/healthz
```

## Deployment Status

- [x] Instance 1: Backend (Already deployed at 92.4.130.9)
- [x] Instance 2: PostgreSQL Primary (Scripts ready)
- [x] Instance 3: PostgreSQL Standby (Scripts ready)
- [x] Instance 4: Redis + MinIO (Scripts ready)
- [x] Instance 5: Monitoring (Scripts ready)
- [x] Tailscale setup script for backend (Script ready)
- [x] Migration guide (Complete)

## Cost Savings

| Service | Before (Monthly) | After | Savings |
|---------|------------------|-------|---------|
| Neon PostgreSQL | $19+ | $0 | $19+ |
| Upstash Redis | $10+ | $0 | $10+ |
| Cloudflare R2 | $5+ | $0 | $5+ |
| **Total** | **$34+** | **$0** | **$34+** |

## Support

For issues with specific instances, check their individual READMEs:
- `oracle/postgres-primary/README.md`
- `oracle/postgres-standby/README.md` (coming)
- `oracle/redis-minio/README.md` (coming)
- `oracle/monitoring/README.md` (coming)

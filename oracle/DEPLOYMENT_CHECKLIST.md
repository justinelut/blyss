# Deployment Checklist

Use this checklist to track your multi-instance deployment progress.

## Pre-Deployment

- [ ] Create Tailscale account: https://login.tailscale.com/start
- [ ] Generate Tailscale auth key: https://login.tailscale.com/admin/settings/keys
  - Make it reusable: Yes
  - Expiration: Never (or long duration)
  - Save auth key: `tskey-auth-_____________________`
- [ ] Create 4 new Oracle Cloud instances (Instances 2-5)
  - [ ] Instance 2: 1GB RAM, 1 OCPU, 100GB storage
  - [ ] Instance 3: 1GB RAM, 1 OCPU, 100GB storage
  - [ ] Instance 4: 1GB RAM, 1 OCPU, 100GB storage
  - [ ] Instance 5: 1GB RAM, 1 OCPU, 100GB storage
- [ ] Note public IPs:
  - Instance 2: `___________________`
  - Instance 3: `___________________`
  - Instance 4: `___________________`
  - Instance 5: `___________________`
- [ ] Configure DNS (optional):
  - [ ] db.blyss.co.ke → Instance 2 IP
  - [ ] storage.blyss.co.ke → Instance 4 IP
  - [ ] monitor.blyss.co.ke → Instance 5 IP

## Instance 2: PostgreSQL Primary

- [ ] SSH into Instance 2
- [ ] Download deployment scripts
  ```bash
  sudo mkdir -p /opt/blyss && cd /opt/blyss
  git clone --depth 1 --filter=blob:none --sparse \
    https://github.com/justinelut/blyss.git temp
  cd temp && git sparse-checkout set oracle/postgres-primary
  mv oracle/postgres-primary/* /opt/blyss/
  cd /opt/blyss && rm -rf temp
  ```
- [ ] Configure Tailscale auth key in `scripts/common.sh`
- [ ] Run deployment: `sudo chmod +x setup.sh && sudo ./setup.sh`
- [ ] Note Tailscale IP: `sudo tailscale ip -4`
  - Tailscale IP: `100.64.0._____`
- [ ] Verify PostgreSQL is running: `sudo systemctl status postgresql`
- [ ] Verify PgBouncer is running: `sudo systemctl status pgbouncer`
- [ ] Test connection: `sudo -u postgres psql -c "SELECT version();"`

## Instance 3: PostgreSQL Standby

- [ ] SSH into Instance 3
- [ ] Download deployment scripts
  ```bash
  sudo mkdir -p /opt/blyss && cd /opt/blyss
  git clone --depth 1 --filter=blob:none --sparse \
    https://github.com/justinelut/blyss.git temp
  cd temp && git sparse-checkout set oracle/postgres-standby
  mv oracle/postgres-standby/* /opt/blyss/
  cd /opt/blyss && rm -rf temp
  ```
- [ ] Configure in `scripts/common.sh`:
  - Tailscale auth key
  - PRIMARY_HOST (Instance 2 Tailscale IP)
- [ ] Run deployment: `sudo chmod +x setup.sh && sudo ./setup.sh`
- [ ] Note Tailscale IP: `sudo tailscale ip -4`
  - Tailscale IP: `100.64.0._____`
- [ ] Verify replication: `sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"`
- [ ] Check replication on primary (Instance 2): `sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"`

## Instance 4: Redis + MinIO

- [ ] SSH into Instance 4
- [ ] Download deployment scripts
  ```bash
  sudo mkdir -p /opt/blyss && cd /opt/blyss
  git clone --depth 1 --filter=blob:none --sparse \
    https://github.com/justinelut/blyss.git temp
  cd temp && git sparse-checkout set oracle/redis-minio
  mv oracle/redis-minio/* /opt/blyss/
  cd /opt/blyss && rm -rf temp
  ```
- [ ] Configure Tailscale auth key in `scripts/common.sh`
- [ ] Run deployment: `sudo chmod +x setup.sh && sudo ./setup.sh`
- [ ] Note Tailscale IP: `sudo tailscale ip -4`
  - Tailscale IP: `100.64.0._____`
- [ ] Test Redis: `redis-cli -a RedisSecure2024! ping`
- [ ] Access MinIO console: https://storage.blyss.co.ke (or http://INSTANCE_4_IP:9001)
  - Login: minioadmin / minioadmin123
- [ ] Verify buckets exist: `mc ls minio` (after configuring mc)

## Instance 5: Monitoring

- [ ] SSH into Instance 5
- [ ] Download deployment scripts
  ```bash
  sudo mkdir -p /opt/blyss && cd /opt/blyss
  git clone --depth 1 --filter=blob:none --sparse \
    https://github.com/justinelut/blyss.git temp
  cd temp && git sparse-checkout set oracle/monitoring
  mv oracle/monitoring/* /opt/blyss/
  cd /opt/blyss && rm -rf temp
  ```
- [ ] Configure in `scripts/common.sh`:
  - Tailscale auth key
  - All instance Tailscale IPs
- [ ] Run deployment: `sudo chmod +x setup.sh && sudo ./setup.sh`
- [ ] Note Tailscale IP: `sudo tailscale ip -4`
  - Tailscale IP: `100.64.0._____`
- [ ] Access Grafana: https://monitor.blyss.co.ke
  - Login: admin / admin
- [ ] Change Grafana admin password
- [ ] Verify Prometheus targets: http://100.64.0.5:9090/targets (via Tailscale)

## Instance 1: Add Tailscale to Backend

- [ ] SSH into Instance 1 (Backend): `ssh -i ssh-key-2026-03-17.key ubuntu@92.4.130.9`
- [ ] Update common.sh: `cd /opt/blyss/blyss/oracle && sudo nano scripts/common.sh`
  - Add Tailscale auth key
- [ ] Run Tailscale setup: `sudo chmod +x scripts/08-tailscale-setup.sh && sudo ./scripts/08-tailscale-setup.sh`
- [ ] Note Tailscale IP: `sudo tailscale ip -4`
  - Tailscale IP: `100.64.0._____`
- [ ] Test connectivity to all instances:
  - [ ] `sudo tailscale ping 100.64.0.2` (PostgreSQL Primary)
  - [ ] `sudo tailscale ping 100.64.0.3` (PostgreSQL Standby)
  - [ ] `sudo tailscale ping 100.64.0.4` (Redis + MinIO)
  - [ ] `sudo tailscale ping 100.64.0.5` (Monitoring)

## Data Migration

### Backup Current Data

- [ ] Backup Neon database (run locally):
  ```bash
  pg_dump "postgresql://[neon-connection-string]" > neon_backup_$(date +%Y%m%d).sql
  ```
- [ ] Verify backup file size: `ls -lh neon_backup_*.sql`

### Import to Self-Hosted PostgreSQL

- [ ] Copy backup to Instance 2:
  ```bash
  scp -i ssh-key-2026-03-17.key neon_backup_*.sql ubuntu@INSTANCE_2_IP:/tmp/
  ```
- [ ] SSH into Instance 2 and import:
  ```bash
  sudo -u postgres psql blyss < /tmp/neon_backup_*.sql
  ```
- [ ] Verify data:
  ```bash
  sudo -u postgres psql blyss -c "SELECT COUNT(*) FROM products;"
  sudo -u postgres psql blyss -c "SELECT COUNT(*) FROM users;"
  ```

### Migrate Files to MinIO

- [ ] Install MinIO client (mc) on your local machine or Instance 1
- [ ] Configure R2 alias:
  ```bash
  mc alias set r2 https://[r2-endpoint] [access-key] [secret-key]
  ```
- [ ] Configure MinIO alias:
  ```bash
  mc alias set minio http://100.64.0.4:9000 minioadmin minioadmin123
  ```
- [ ] Mirror files:
  ```bash
  mc mirror r2/blyss-files minio/blyss-files
  mc mirror r2/blyss-public minio/blyss-public
  ```
- [ ] Verify files: `mc ls minio/blyss-files`

## Update Backend Configuration

- [ ] SSH into Instance 1 (Backend)
- [ ] Edit .env file: `cd /opt/blyss/blyss/server && sudo -u blyss nano .env`
- [ ] Update PostgreSQL settings:
  ```bash
  POLAR_POSTGRES_HOST=100.64.0.2
  POLAR_POSTGRES_PORT=6432
  POLAR_POSTGRES_USER=blyss
  POLAR_POSTGRES_PWD=BlyssDB2024Secure!
  POLAR_POSTGRES_DATABASE=blyss
  POLAR_POSTGRES_SSL_MODE=prefer
  ```
- [ ] Update Read Replica settings:
  ```bash
  POLAR_POSTGRES_READ_HOST=100.64.0.3
  POLAR_POSTGRES_READ_PORT=6432
  POLAR_POSTGRES_READ_USER=blyss
  POLAR_POSTGRES_READ_PWD=BlyssDB2024Secure!
  POLAR_POSTGRES_READ_DATABASE=blyss
  POLAR_POSTGRES_READ_SSL_MODE=prefer
  ```
- [ ] Update Redis settings:
  ```bash
  POLAR_REDIS_HOST=100.64.0.4
  POLAR_REDIS_PORT=6379
  POLAR_REDIS_DB=0
  POLAR_REDIS_PASSWORD=RedisSecure2024!
  ```
- [ ] Update MinIO settings:
  ```bash
  POLAR_AWS_ACCESS_KEY_ID=minioadmin
  POLAR_AWS_SECRET_ACCESS_KEY=minioadmin123
  POLAR_S3_ENDPOINT_URL=http://100.64.0.4:9000
  POLAR_AWS_REGION=us-east-1
  POLAR_S3_FILES_BUCKET_NAME=blyss-files
  POLAR_S3_FILES_PUBLIC_BUCKET_NAME=blyss-public
  ```

## Restart and Verify

- [ ] Restart backend services:
  ```bash
  sudo systemctl restart blyss-api
  sudo systemctl restart blyss-worker
  ```
- [ ] Check service status:
  ```bash
  sudo systemctl status blyss-api
  sudo systemctl status blyss-worker
  ```
- [ ] Check logs for errors:
  ```bash
  sudo tail -f /var/log/blyss/api.log
  sudo tail -f /var/log/blyss/worker.log
  ```
- [ ] Test health endpoint: `curl https://server.blyss.co.ke/healthz`
- [ ] Test API endpoint: `curl https://server.blyss.co.ke/v1/products/public?limit=5`
- [ ] Test file upload through your application
- [ ] Verify file appears in MinIO: `mc ls minio/blyss-files`

## Monitoring Setup

- [ ] Access Grafana: https://monitor.blyss.co.ke
- [ ] Change admin password
- [ ] Import dashboards:
  - [ ] Node Exporter Full (ID: 1860)
  - [ ] PostgreSQL Database (ID: 9628)
  - [ ] Redis Dashboard (ID: 11835)
- [ ] Configure alerts (optional):
  - [ ] Disk space < 10%
  - [ ] Memory usage > 90%
  - [ ] PostgreSQL replication lag > 10s
  - [ ] Redis memory > 90%

## Post-Deployment

- [ ] Monitor for 24-48 hours to ensure stability
- [ ] Check Grafana dashboards daily
- [ ] Verify automated backups are running (Instance 3):
  ```bash
  ls -lh /var/backups/postgresql/
  ```
- [ ] Test restore procedure (optional but recommended)
- [ ] Document any custom configurations
- [ ] Update team documentation with new connection details

## Cost Savings - Cancel Managed Services

**Wait 1-2 weeks to ensure everything is stable before canceling!**

- [ ] Cancel Neon PostgreSQL subscription
  - Estimated savings: $19+/month
- [ ] Cancel Upstash Redis subscription
  - Estimated savings: $10+/month
- [ ] Cancel Cloudflare R2 subscription
  - Estimated savings: $5+/month
- [ ] **Total monthly savings: $34+**

## Security Hardening (Recommended)

- [ ] Change default PostgreSQL passwords:
  ```bash
  # On Instance 2
  sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'NewStrongPassword123!';"
  sudo -u postgres psql -c "ALTER USER blyss WITH PASSWORD 'NewBlyssPassword123!';"
  sudo -u postgres psql -c "ALTER USER replicator WITH PASSWORD 'NewReplicatorPassword123!';"
  ```
- [ ] Change Redis password:
  ```bash
  # On Instance 4
  sudo nano /etc/redis/redis.conf
  # Update: requirepass NewRedisPassword123!
  sudo systemctl restart redis-server
  ```
- [ ] Change MinIO credentials:
  ```bash
  # On Instance 4
  sudo nano /etc/default/minio
  # Update MINIO_ROOT_USER and MINIO_ROOT_PASSWORD
  sudo systemctl restart minio
  ```
- [ ] Update backend .env with new passwords
- [ ] Rotate Tailscale auth keys periodically
- [ ] Review firewall rules on all instances

## Troubleshooting Reference

If issues occur, refer to:
- [ ] `oracle/BACKEND_MIGRATION_GUIDE.md` - Detailed migration steps
- [ ] `oracle/TAILSCALE_NETWORK_MAP.md` - Network reference
- [ ] Individual instance READMEs in `oracle/*/README.md`
- [ ] Service logs on each instance

## Notes

Use this space to document any issues, custom configurations, or important information:

```
[Your notes here]
```


# PostgreSQL Standby (Read Replica) - Instance 3

Automated deployment for PostgreSQL standby server with streaming replication and automated backups.

## Server Specifications

- **Instance**: 1GB RAM, 1 OCPU, 100GB Storage
- **OS**: Ubuntu 22.04 LTS
- **Tailscale IP**: Will be assigned (e.g., 100.64.0.3)
- **Services**: PostgreSQL 16 (Standby), PgBouncer, Automated Backups

## Prerequisites

1. Oracle Cloud instance running Ubuntu 22.04
2. Instance 2 (PostgreSQL Primary) already deployed
3. Tailscale auth key
4. Primary database Tailscale IP (from Instance 2)

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
git sparse-checkout set oracle/postgres-standby
mv oracle/postgres-standby/* /opt/blyss/
cd /opt/blyss
rm -rf temp
```

### 3. Configure settings

Edit `scripts/common.sh`:

```bash
nano scripts/common.sh

# Set these values:
TAILSCALE_AUTH_KEY="tskey-auth-xxxxx"
PRIMARY_HOST="100.64.0.2"  # Tailscale IP of Instance 2
```

### 4. Run the setup script

```bash
sudo chmod +x setup.sh
sudo ./setup.sh
```

## What Gets Deployed

### Services

1. **PostgreSQL 16 (Standby)** - Read replica
   - Port: 5432 (Tailscale only)
   - Streaming replication from primary
   - Read-only queries
   - Automatic failover ready

2. **PgBouncer** - Connection pooler
   - Port: 6432 (Tailscale only)
   - Read-only pool

3. **Automated Backups**
   - Daily full backups at 2 AM
   - 7-day retention
   - Compressed with gzip
   - Stored in /var/backups/postgresql/

4. **Node Exporter** - Prometheus metrics
   - Port: 9100 (Tailscale only)

## Replication

The standby continuously replicates from the primary using PostgreSQL streaming replication:

- **Replication Lag**: Typically < 1 second
- **Automatic Recovery**: Reconnects if connection drops
- **Hot Standby**: Can serve read-only queries

### Check Replication Status

On the standby:
```bash
sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"
```

On the primary (Instance 2):
```bash
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"
```

## Backups

### Automated Daily Backups

Backups run daily at 2 AM via cron:
- Full database dump
- Compressed with gzip
- 7-day retention (older backups auto-deleted)
- Location: `/var/backups/postgresql/`

### Manual Backup

```bash
sudo /opt/blyss/scripts/backup.sh
```

### Restore from Backup

```bash
# List available backups
ls -lh /var/backups/postgresql/

# Restore (on primary or standby)
gunzip < /var/backups/postgresql/blyss_YYYYMMDD.sql.gz | \
  sudo -u postgres psql blyss
```

## Failover (Promote Standby to Primary)

If Instance 2 (primary) fails, promote this standby to primary:

```bash
# Stop replication and promote to primary
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl promote \
  -D /var/lib/postgresql/16/main/

# Update backend to use this instance
# Change POLAR_POSTGRES_HOST to this instance's Tailscale IP
```

## Connection Details

### Read-Only Queries

From backend, use this for read queries:

```bash
# Via PgBouncer (recommended)
postgresql://blyss:BlyssDB2024Secure!@100.64.0.3:6432/blyss

# Direct PostgreSQL
postgresql://blyss:BlyssDB2024Secure!@100.64.0.3:5432/blyss
```

## Service Management

### Check status
```bash
sudo systemctl status postgresql
sudo systemctl status pgbouncer
```

### View replication lag
```bash
sudo -u postgres psql -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"
```

### View logs
```bash
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

## Monitoring

### Backup Status
```bash
# List recent backups
ls -lh /var/backups/postgresql/

# Check backup cron job
sudo crontab -l
```

### Disk Usage
```bash
# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('blyss'));"

# Check disk space
df -h /var/lib/postgresql
df -h /var/backups
```

## Troubleshooting

### Replication Not Working

```bash
# Check replication status
sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"

# Check if primary is reachable
sudo tailscale ping 100.64.0.2

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Backup Failed

```bash
# Check backup script
cat /opt/blyss/scripts/backup.sh

# Run backup manually
sudo /opt/blyss/scripts/backup.sh

# Check disk space
df -h /var/backups
```

## File Locations

- **PostgreSQL data**: `/var/lib/postgresql/16/main/`
- **Backups**: `/var/backups/postgresql/`
- **Scripts**: `/opt/blyss/scripts/`
- **Logs**: `/var/log/postgresql/`

## Next Steps

After deployment:
1. Verify replication: `sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;"`
2. Test read queries from backend
3. Verify automated backups are running
4. Update backend .env with read replica IP
5. Deploy Instance 4 (Redis + MinIO)

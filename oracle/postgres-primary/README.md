# PostgreSQL Primary Database - Instance 2

Automated deployment for PostgreSQL primary database server with Tailscale VPN.

## Server Specifications

- **Instance**: 1GB RAM, 1 OCPU, 100GB Storage
- **OS**: Ubuntu 22.04 LTS
- **Domain**: db.blyss.co.ke (optional, for pgAdmin)
- **Tailscale IP**: Will be assigned (e.g., 100.64.0.2)
- **Services**: PostgreSQL 16, PgBouncer, Node Exporter

## Prerequisites

1. Oracle Cloud instance running Ubuntu 22.04
2. Tailscale account and auth key: https://login.tailscale.com/admin/settings/keys
3. SSH access to the server
4. (Optional) Domain DNS configured for pgAdmin access

## Quick Start

### 1. SSH into your Oracle instance

```bash
ssh -i your-key.key ubuntu@YOUR_INSTANCE_IP
```

### 2. Download deployment scripts

```bash
sudo mkdir -p /opt/blyss
cd /opt/blyss

# Clone only this folder (sparse checkout)
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/justinelut/blyss.git temp
cd temp
git sparse-checkout set oracle/postgres-primary
mv oracle/postgres-primary/* /opt/blyss/
cd /opt/blyss
rm -rf temp
```

### 3. Configure Tailscale auth key

Edit `scripts/common.sh` and add your Tailscale auth key:

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

1. **PostgreSQL 16** - Primary database server
   - Port: 5432 (Tailscale network only)
   - Max connections: 100
   - Shared buffers: 256MB
   - Effective cache: 512MB
   - Streaming replication enabled

2. **PgBouncer** - Connection pooler
   - Port: 6432 (Tailscale network only)
   - Pool mode: transaction
   - Max client connections: 100
   - Default pool size: 25

3. **Node Exporter** - Prometheus metrics
   - Port: 9100 (Tailscale network only)

### Security

- PostgreSQL only listens on Tailscale interface
- Firewall blocks all external database access
- SSL/TLS encryption for replication
- Password authentication required
- Automated backups to standby server

## Configuration

### Database Credentials

Default credentials (change in production):
- **Superuser**: postgres / ChangeMeInProduction123!
- **Application User**: blyss / BlyssDB2024Secure!
- **Replication User**: replicator / ReplicateSecure2024!

### Connection Strings

From Backend (Instance 1) via Tailscale:

```bash
# Direct PostgreSQL connection
postgresql://blyss:BlyssDB2024Secure!@100.64.0.2:5432/blyss

# Via PgBouncer (recommended)
postgresql://blyss:BlyssDB2024Secure!@100.64.0.2:6432/blyss
```

## Service Management

### Check status
```bash
sudo systemctl status postgresql
sudo systemctl status pgbouncer
sudo systemctl status node_exporter
```

### Restart services
```bash
sudo systemctl restart postgresql
sudo systemctl restart pgbouncer
```

### View logs
```bash
sudo tail -f /var/log/postgresql/postgresql-16-main.log
sudo journalctl -u pgbouncer -f
```

### Check Tailscale connection
```bash
sudo tailscale status
sudo tailscale ip -4  # Get your Tailscale IP
```

## Database Management

### Connect to PostgreSQL
```bash
sudo -u postgres psql
```

### Create database and user (already done by script)
```sql
CREATE DATABASE blyss;
CREATE USER blyss WITH PASSWORD 'BlyssDB2024Secure!';
GRANT ALL PRIVILEGES ON DATABASE blyss TO blyss;
```

### Check replication status
```sql
SELECT * FROM pg_stat_replication;
```

### Backup database manually
```bash
sudo -u postgres pg_dump blyss > /var/backups/postgresql/blyss_$(date +%Y%m%d).sql
```

## Updating Backend to Use This Database

On Instance 1 (Backend), update `/opt/blyss/blyss/server/.env`:

```bash
# Replace Neon PostgreSQL with self-hosted
POLAR_POSTGRES_HOST=100.64.0.2  # Tailscale IP of this instance
POLAR_POSTGRES_PORT=6432        # PgBouncer port
POLAR_POSTGRES_USER=blyss
POLAR_POSTGRES_PWD=BlyssDB2024Secure!
POLAR_POSTGRES_DATABASE=blyss
POLAR_POSTGRES_SSL_MODE=prefer

# Read replica (will be Instance 3)
POLAR_POSTGRES_READ_HOST=100.64.0.3
POLAR_POSTGRES_READ_PORT=6432
POLAR_POSTGRES_READ_USER=blyss
POLAR_POSTGRES_READ_PWD=BlyssDB2024Secure!
POLAR_POSTGRES_READ_DATABASE=blyss
POLAR_POSTGRES_READ_SSL_MODE=prefer
```

Then restart backend services:
```bash
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

## Monitoring

### Prometheus metrics
```bash
curl http://100.64.0.2:9100/metrics
```

### Check database size
```sql
SELECT pg_size_pretty(pg_database_size('blyss'));
```

### Check active connections
```sql
SELECT count(*) FROM pg_stat_activity;
```

## Troubleshooting

### PostgreSQL won't start
```bash
sudo journalctl -u postgresql -n 50
sudo systemctl status postgresql
```

### Can't connect from backend
```bash
# On this instance, check if PostgreSQL is listening
sudo netstat -tlnp | grep 5432

# Check Tailscale connectivity
sudo tailscale ping 100.64.0.1  # Backend instance

# Check pg_hba.conf
sudo cat /etc/postgresql/16/main/pg_hba.conf
```

### Replication not working
```bash
# Check replication slots
sudo -u postgres psql -c "SELECT * FROM pg_replication_slots;"

# Check replication status
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"
```

## File Locations

- **PostgreSQL data**: `/var/lib/postgresql/16/main/`
- **PostgreSQL config**: `/etc/postgresql/16/main/postgresql.conf`
- **PgBouncer config**: `/etc/pgbouncer/pgbouncer.ini`
- **Logs**: `/var/log/postgresql/`
- **Backups**: `/var/backups/postgresql/`
- **Scripts**: `/opt/blyss/scripts/`

## Performance Tuning

The setup includes optimizations for 1GB RAM:
- Shared buffers: 256MB (25% of RAM)
- Effective cache size: 512MB (50% of RAM)
- Work mem: 4MB
- Maintenance work mem: 64MB
- Max connections: 100
- PgBouncer connection pooling

## Security Notes

- Database only accessible via Tailscale VPN
- No public internet exposure
- SSL/TLS encryption for replication
- Regular automated backups
- Firewall configured to block external access

## Next Steps

After deployment:
1. Note your Tailscale IP: `sudo tailscale ip -4`
2. Update backend .env with this IP
3. Deploy Instance 3 (PostgreSQL Standby)
4. Test connection from backend
5. Migrate data from Neon to self-hosted
6. Monitor performance and adjust settings

## Support

For issues:
- Check logs: `sudo journalctl -u postgresql -f`
- Check Tailscale: `sudo tailscale status`
- Verify connectivity: `sudo tailscale ping 100.64.0.1`

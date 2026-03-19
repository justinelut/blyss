#!/bin/bash

# PostgreSQL Standby Setup with Streaming Replication

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root
check_primary_host

log_info "Setting up PostgreSQL Standby with streaming replication..."

# Add PostgreSQL repository
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update

# Install PostgreSQL
log_info "Installing PostgreSQL $POSTGRES_VERSION..."
apt-get install -y postgresql-$POSTGRES_VERSION postgresql-contrib-$POSTGRES_VERSION

# Stop PostgreSQL
systemctl stop postgresql

# Get Tailscale IP
TAILSCALE_IP=$(get_tailscale_ip)
if [ "$TAILSCALE_IP" = "not_connected" ]; then
    log_error "Tailscale not connected"
    exit 1
fi

# Remove default data directory
log_info "Removing default data directory..."
rm -rf /var/lib/postgresql/$POSTGRES_VERSION/main/*

# Create base backup from primary
log_info "Creating base backup from primary ($PRIMARY_HOST)..."
export PGPASSWORD="$POSTGRES_REPLICATION_PASSWORD"
sudo -u postgres pg_basebackup -h "$PRIMARY_HOST" -D /var/lib/postgresql/$POSTGRES_VERSION/main \
    -U "$POSTGRES_REPLICATION_USER" -v -P -X stream -R

# Configure PostgreSQL
PG_CONF="/etc/postgresql/$POSTGRES_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$POSTGRES_VERSION/main/pg_hba.conf"

cp "$PG_CONF" "$PG_CONF.backup"
cp "$PG_HBA" "$PG_HBA.backup"

# Configure postgresql.conf for standby
cat >> "$PG_CONF" <<EOF

# Blyss Standby Configuration
listen_addresses = 'localhost,$TAILSCALE_IP'
port = 5432
max_connections = 100

# Memory Settings
shared_buffers = 256MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
work_mem = 4MB

# Standby Settings
hot_standby = on
hot_standby_feedback = on
max_standby_streaming_delay = 30s

# Logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d '
log_connections = on
log_disconnections = on
EOF

# Configure pg_hba.conf
cat > "$PG_HBA" <<EOF
# PostgreSQL Standby Authentication
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             100.64.0.0/10           md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF

# Start PostgreSQL
log_info "Starting PostgreSQL standby..."
systemctl start postgresql
systemctl enable postgresql

wait_for_service postgresql

# Verify replication
log_info "Verifying replication status..."
sleep 5
sudo -u postgres psql -c "SELECT * FROM pg_stat_wal_receiver;" || log_warn "Replication not yet active"

log_info "PostgreSQL standby setup completed!"
log_info "Connection: postgresql://$POSTGRES_APP_USER:$POSTGRES_APP_PASSWORD@$TAILSCALE_IP:5432/$POSTGRES_APP_DATABASE"

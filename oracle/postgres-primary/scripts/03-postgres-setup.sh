#!/bin/bash

# PostgreSQL 16 Setup Script
# Installs and configures PostgreSQL with optimizations for 1GB RAM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

log_info "Starting PostgreSQL $POSTGRES_VERSION setup..."

# Add PostgreSQL repository
log_info "Adding PostgreSQL repository..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -

# Update package list
apt-get update

# Install PostgreSQL
log_info "Installing PostgreSQL $POSTGRES_VERSION..."
apt-get install -y postgresql-$POSTGRES_VERSION postgresql-contrib-$POSTGRES_VERSION

# Get Tailscale IP
TAILSCALE_IP=$(get_tailscale_ip)
if [ "$TAILSCALE_IP" = "not_connected" ]; then
    log_error "Tailscale not connected. Please run 02-tailscale-setup.sh first"
    exit 1
fi

log_info "Configuring PostgreSQL..."

# Stop PostgreSQL to configure
systemctl stop postgresql

# Configure PostgreSQL to listen on Tailscale interface only
PG_CONF="/etc/postgresql/$POSTGRES_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$POSTGRES_VERSION/main/pg_hba.conf"

# Backup original configs
cp "$PG_CONF" "$PG_CONF.backup"
cp "$PG_HBA" "$PG_HBA.backup"

# Configure postgresql.conf
log_info "Configuring postgresql.conf..."
cat >> "$PG_CONF" <<EOF

# Blyss Custom Configuration
# Listen on Tailscale interface only
listen_addresses = 'localhost,$TAILSCALE_IP'
port = 5432

# Connection Settings
max_connections = 100
superuser_reserved_connections = 3

# Memory Settings (optimized for 1GB RAM)
shared_buffers = 256MB
effective_cache_size = 512MB
maintenance_work_mem = 64MB
work_mem = 4MB

# WAL Settings
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
wal_keep_size = 1GB
hot_standby = on

# Checkpoint Settings
checkpoint_completion_target = 0.9
checkpoint_timeout = 10min
max_wal_size = 1GB
min_wal_size = 256MB

# Query Tuning
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_duration = off
log_lock_waits = on
log_statement = 'ddl'
log_temp_files = 0

# Performance
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
pg_stat_statements.track = all
EOF

# Configure pg_hba.conf for Tailscale network
log_info "Configuring pg_hba.conf..."
cat > "$PG_HBA" <<EOF
# PostgreSQL Client Authentication Configuration File
# Blyss Custom Configuration

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             all                                     peer

# Tailscale network connections (100.64.0.0/10)
host    all             all             100.64.0.0/10           md5

# Replication connections
host    replication     $POSTGRES_REPLICATION_USER     100.64.0.0/10           md5

# Localhost connections
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF

# Start PostgreSQL
log_info "Starting PostgreSQL..."
systemctl start postgresql
wait_for_service postgresql

# Set postgres user password
log_info "Setting postgres user password..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$POSTGRES_SUPERUSER_PASSWORD';"

# Create application database and user
log_info "Creating application database and user..."
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE $POSTGRES_APP_DATABASE;

-- Create application user
CREATE USER $POSTGRES_APP_USER WITH PASSWORD '$POSTGRES_APP_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_APP_DATABASE TO $POSTGRES_APP_USER;

-- Connect to the database and grant schema privileges
\c $POSTGRES_APP_DATABASE
GRANT ALL ON SCHEMA public TO $POSTGRES_APP_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $POSTGRES_APP_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $POSTGRES_APP_USER;

-- Create replication user
\c postgres
CREATE USER $POSTGRES_REPLICATION_USER WITH REPLICATION PASSWORD '$POSTGRES_REPLICATION_PASSWORD';

-- Enable pg_stat_statements extension
\c $POSTGRES_APP_DATABASE
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EOF

# Enable and start PostgreSQL
systemctl enable postgresql
systemctl restart postgresql

# Verify PostgreSQL is running
if systemctl is-active --quiet postgresql; then
    log_info "PostgreSQL is running successfully"
    
    # Show connection info
    log_info "PostgreSQL connection details:"
    log_info "  Host: $TAILSCALE_IP"
    log_info "  Port: 5432"
    log_info "  Database: $POSTGRES_APP_DATABASE"
    log_info "  User: $POSTGRES_APP_USER"
    log_info "  Password: $POSTGRES_APP_PASSWORD"
    log_info ""
    log_info "Connection string:"
    log_info "  postgresql://$POSTGRES_APP_USER:$POSTGRES_APP_PASSWORD@$TAILSCALE_IP:5432/$POSTGRES_APP_DATABASE"
else
    log_error "PostgreSQL failed to start"
    exit 1
fi

log_info "PostgreSQL setup completed successfully!"

#!/bin/bash

# PgBouncer Setup Script
# Installs and configures PgBouncer connection pooler

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

log_info "Starting PgBouncer setup..."

# Install PgBouncer
log_info "Installing PgBouncer..."
apt-get install -y pgbouncer

# Get Tailscale IP
TAILSCALE_IP=$(get_tailscale_ip)
if [ "$TAILSCALE_IP" = "not_connected" ]; then
    log_error "Tailscale not connected"
    exit 1
fi

# Configure PgBouncer
log_info "Configuring PgBouncer..."

# Backup original config
cp /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.backup

# Create PgBouncer configuration
cat > /etc/pgbouncer/pgbouncer.ini <<EOF
[databases]
$POSTGRES_APP_DATABASE = host=127.0.0.1 port=5432 dbname=$POSTGRES_APP_DATABASE

[pgbouncer]
listen_addr = $TAILSCALE_IP,127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = $PGBOUNCER_POOL_MODE
max_client_conn = $PGBOUNCER_MAX_CLIENT_CONN
default_pool_size = $PGBOUNCER_DEFAULT_POOL_SIZE
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 50
max_user_connections = 50
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60
autodb_idle_timeout = 3600
stats_period = 60
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
application_name_add_host = 1
EOF

# Create userlist.txt with MD5 hashed passwords
log_info "Creating PgBouncer user list..."

# Generate MD5 hash for passwords
POSTGRES_APP_MD5=$(echo -n "$POSTGRES_APP_PASSWORD$POSTGRES_APP_USER" | md5sum | awk '{print $1}')

cat > /etc/pgbouncer/userlist.txt <<EOF
"$POSTGRES_APP_USER" "md5$POSTGRES_APP_MD5"
EOF

# Set permissions
chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
chown postgres:postgres /etc/pgbouncer/userlist.txt
chmod 640 /etc/pgbouncer/pgbouncer.ini
chmod 640 /etc/pgbouncer/userlist.txt

# Enable and start PgBouncer
log_info "Starting PgBouncer..."
systemctl enable pgbouncer
systemctl restart pgbouncer

wait_for_service pgbouncer

# Verify PgBouncer is running
if systemctl is-active --quiet pgbouncer; then
    log_info "PgBouncer is running successfully"
    log_info "PgBouncer connection details:"
    log_info "  Host: $TAILSCALE_IP"
    log_info "  Port: 6432"
    log_info "  Database: $POSTGRES_APP_DATABASE"
    log_info ""
    log_info "Connection string (via PgBouncer):"
    log_info "  postgresql://$POSTGRES_APP_USER:$POSTGRES_APP_PASSWORD@$TAILSCALE_IP:6432/$POSTGRES_APP_DATABASE"
else
    log_error "PgBouncer failed to start"
    journalctl -u pgbouncer -n 50
    exit 1
fi

log_info "PgBouncer setup completed successfully!"

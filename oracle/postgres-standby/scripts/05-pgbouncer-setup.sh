#!/bin/bash

# PgBouncer Setup for Standby (Read-only pool)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

log_info "Installing PgBouncer..."
apt-get install -y pgbouncer

TAILSCALE_IP=$(get_tailscale_ip)

# Configure PgBouncer
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
EOF

# Create userlist
POSTGRES_APP_MD5=$(echo -n "$POSTGRES_APP_PASSWORD$POSTGRES_APP_USER" | md5sum | awk '{print $1}')
cat > /etc/pgbouncer/userlist.txt <<EOF
"$POSTGRES_APP_USER" "md5$POSTGRES_APP_MD5"
EOF

chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
chown postgres:postgres /etc/pgbouncer/userlist.txt
chmod 640 /etc/pgbouncer/pgbouncer.ini
chmod 640 /etc/pgbouncer/userlist.txt

systemctl enable pgbouncer
systemctl restart pgbouncer

wait_for_service pgbouncer

log_info "PgBouncer setup completed!"
log_info "Connection: postgresql://$POSTGRES_APP_USER:$POSTGRES_APP_PASSWORD@$TAILSCALE_IP:6432/$POSTGRES_APP_DATABASE"

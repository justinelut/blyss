#!/bin/bash
# Make all scripts executable
# Run this once to set proper permissions

chmod +x /opt/blyss/blyss/oracle/backend/scripts/*.sh
chmod +x /opt/blyss/blyss/oracle/redis-minio/scripts/*.sh
chmod +x /opt/blyss/blyss/oracle/monitoring/scripts/*.sh
chmod +x /opt/blyss/blyss/oracle/postgres-primary/scripts/*.sh
chmod +x /opt/blyss/blyss/oracle/postgres-standby/scripts/*.sh

echo "✅ All scripts are now executable"

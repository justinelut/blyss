#!/bin/bash

# Automated Backup Setup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

log_info "Setting up automated backups..."

# Create backup script
cat > "$APP_DIR/scripts/backup.sh" <<'BACKUP_SCRIPT'
#!/bin/bash

BACKUP_DIR="/var/backups/postgresql"
RETENTION_DAYS=7
DATABASE="blyss"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/blyss_$TIMESTAMP.sql.gz"

echo "[$(date)] Starting backup..."

# Create backup
sudo -u postgres pg_dump "$DATABASE" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed: $BACKUP_FILE"

    # Delete old backups
    find "$BACKUP_DIR" -name "blyss_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "[$(date)] Old backups cleaned up"
else
    echo "[$(date)] Backup failed!"
    exit 1
fi
BACKUP_SCRIPT

chmod +x "$APP_DIR/scripts/backup.sh"

# Create cron job for daily backups at 2 AM
log_info "Creating cron job for daily backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup.sh >> $LOG_DIR/backup.log 2>&1") | crontab -

# Run initial backup
log_info "Running initial backup..."
"$APP_DIR/scripts/backup.sh"

log_info "Backup setup completed!"
log_info "Backups will run daily at 2 AM"
log_info "Backup location: $BACKUP_DIR"
log_info "Retention: $BACKUP_RETENTION_DAYS days"

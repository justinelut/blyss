#!/bin/bash
# Update Prometheus configuration with actual Tailscale IPs

set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo bash update-prometheus-config.sh"
    exit 1
fi

echo "=========================================="
echo "  Updating Prometheus Configuration"
echo "=========================================="
echo ""

# Actual Tailscale IPs from INSTANCE_INFO files
BACKEND_IP="100.88.88.98"
POSTGRES_PRIMARY_IP="100.114.146.100"
POSTGRES_STANDBY_IP="100.81.214.7"
REDIS_MINIO_IP="100.117.231.42"
MONITORING_IP="100.82.175.24"

echo "Backing up current config..."
cp /etc/prometheus/prometheus.yml /etc/prometheus/prometheus.yml.backup.$(date +%Y%m%d_%H%M%S)

echo "Creating new Prometheus config..."
cat > /etc/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    static_configs:
      - targets: ['${BACKEND_IP}:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'backend'

  - job_name: 'postgres-primary'
    static_configs:
      - targets: ['${POSTGRES_PRIMARY_IP}:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'postgres-primary'

  - job_name: 'postgres-standby'
    static_configs:
      - targets: ['${POSTGRES_STANDBY_IP}:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'postgres-standby'

  - job_name: 'redis-minio'
    static_configs:
      - targets: ['${REDIS_MINIO_IP}:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'redis-minio'

  - job_name: 'monitoring'
    static_configs:
      - targets: ['${MONITORING_IP}:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'monitoring'
EOF

chown prometheus:prometheus /etc/prometheus/prometheus.yml

echo "Restarting Prometheus..."
systemctl restart prometheus

sleep 3

if systemctl is-active --quiet prometheus; then
    echo ""
    echo "✅ Prometheus updated successfully!"
    echo ""
    echo "Configured targets:"
    echo "  - Backend: ${BACKEND_IP}:9100"
    echo "  - PostgreSQL Primary: ${POSTGRES_PRIMARY_IP}:9100"
    echo "  - PostgreSQL Standby: ${POSTGRES_STANDBY_IP}:9100"
    echo "  - Redis+MinIO: ${REDIS_MINIO_IP}:9100"
    echo "  - Monitoring: ${MONITORING_IP}:9100"
    echo ""
    echo "Check targets at: http://${MONITORING_IP}:9090/targets"
    echo "Or via Grafana: https://monitor.blyss.co.ke"
else
    echo ""
    echo "❌ Prometheus failed to start!"
    echo "Check logs: sudo journalctl -u prometheus -n 50"
    exit 1
fi

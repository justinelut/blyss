# Monitoring Stack - Instance 5

Automated deployment for Prometheus and Grafana monitoring.

## Server Specifications

- **Instance**: 1GB RAM, 1 OCPU, 100GB Storage
- **OS**: Ubuntu 22.04 LTS
- **Domain**: monitor.blyss.co.ke
- **Tailscale IP**: Will be assigned (e.g., 100.64.0.5)
- **Services**: Prometheus, Grafana, Node Exporter

## Prerequisites

1. Oracle Cloud instance running Ubuntu 22.04
2. Tailscale auth key
3. All other instances (1-4) deployed
4. Domain DNS: monitor.blyss.co.ke → Instance IP

## Quick Start

```bash
# SSH into instance
ssh -i your-key.key ubuntu@YOUR_INSTANCE_IP

# Download scripts
sudo mkdir -p /opt/blyss
cd /opt/blyss
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/justinelut/blyss.git temp
cd temp
git sparse-checkout set oracle/monitoring
mv oracle/monitoring/* /opt/blyss/
cd /opt/blyss
rm -rf temp

# Configure
nano scripts/common.sh
# Set: TAILSCALE_AUTH_KEY and all instance IPs

# Deploy
sudo chmod +x setup.sh
sudo ./setup.sh
```

## What Gets Deployed

1. **Prometheus** - Metrics collection
   - Port: 9090 (Tailscale only)
   - Scrapes all instances
   - 15-day retention

2. **Grafana** - Dashboards
   - Port: 3000 (Public via Nginx)
   - URL: https://monitor.blyss.co.ke
   - Default: admin/admin

3. **Node Exporter** - System metrics
   - Port: 9100 (Tailscale only)

## Access

- **Grafana**: https://monitor.blyss.co.ke
- **Prometheus**: http://100.64.0.5:9090 (Tailscale only)

## Monitored Targets

- Instance 1 (Backend): API, Worker metrics
- Instance 2 (PostgreSQL): Database metrics
- Instance 3 (Standby): Replication metrics
- Instance 4 (Redis+MinIO): Cache and storage metrics
- Instance 5 (This): System metrics

## Default Dashboards

- System Overview (CPU, Memory, Disk)
- PostgreSQL Performance
- Redis Performance
- Application Metrics

## Next Steps

1. Access Grafana: https://monitor.blyss.co.ke
2. Login: admin/admin (change password!)
3. Add dashboards from Grafana.com
4. Configure alerts (optional)


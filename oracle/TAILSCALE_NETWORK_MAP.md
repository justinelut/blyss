# Tailscale Network Map

Quick reference for all instances and their Tailscale IPs.

## Network Overview

All instances are connected via Tailscale VPN on the `100.64.0.x` network.

## Instance Map

| Instance | Service | Public IP | Tailscale IP | Domain |
|----------|---------|-----------|--------------|--------|
| Instance 1 | Backend (API + Worker) | 92.4.130.9 | 100.64.0.1 (typical) | server.blyss.co.ke |
| Instance 2 | PostgreSQL Primary + PgBouncer | [Your IP] | 100.64.0.2 (typical) | db.blyss.co.ke (optional) |
| Instance 3 | PostgreSQL Standby + Backups | [Your IP] | 100.64.0.3 (typical) | (internal only) |
| Instance 4 | Redis + MinIO | [Your IP] | 100.64.0.4 (typical) | storage.blyss.co.ke |
| Instance 5 | Prometheus + Grafana | [Your IP] | 100.64.0.5 (typical) | monitor.blyss.co.ke |

## Service Ports

### Instance 1 (Backend)
- **8000**: FastAPI API (internal, proxied by Nginx)
- **80/443**: Nginx (public)

### Instance 2 (PostgreSQL Primary)
- **5432**: PostgreSQL (Tailscale only)
- **6432**: PgBouncer (Tailscale only)
- **9100**: Node Exporter (Tailscale only)

### Instance 3 (PostgreSQL Standby)
- **5432**: PostgreSQL (Tailscale only)
- **6432**: PgBouncer (Tailscale only)
- **9100**: Node Exporter (Tailscale only)

### Instance 4 (Redis + MinIO)
- **6379**: Redis (Tailscale only)
- **9000**: MinIO API (Tailscale only)
- **9001**: MinIO Console (internal)
- **80/443**: Nginx → MinIO Console (public)
- **9100**: Node Exporter (Tailscale only)

### Instance 5 (Monitoring)
- **9090**: Prometheus (Tailscale only)
- **3000**: Grafana (internal)
- **80/443**: Nginx → Grafana (public)
- **9100**: Node Exporter (Tailscale only)

## Connection Strings

### PostgreSQL Primary (Write Operations)
```bash
# Direct PostgreSQL
postgresql://blyss:BlyssDB2024Secure!@100.64.0.2:5432/blyss

# Via PgBouncer (recommended)
postgresql://blyss:BlyssDB2024Secure!@100.64.0.2:6432/blyss
```

### PostgreSQL Standby (Read Operations)
```bash
# Direct PostgreSQL
postgresql://blyss:BlyssDB2024Secure!@100.64.0.3:5432/blyss

# Via PgBouncer (recommended)
postgresql://blyss:BlyssDB2024Secure!@100.64.0.3:6432/blyss
```

### Redis
```bash
redis://RedisSecure2024!@100.64.0.4:6379/0
```

### MinIO (S3-compatible)
```bash
Endpoint: http://100.64.0.4:9000
Access Key: minioadmin
Secret Key: minioadmin123
Region: us-east-1
```

## Useful Commands

### Check Tailscale Status
```bash
sudo tailscale status
```

### Get Your Tailscale IP
```bash
sudo tailscale ip -4
```

### Test Connectivity
```bash
# From any instance, ping others
sudo tailscale ping 100.64.0.1  # Backend
sudo tailscale ping 100.64.0.2  # PostgreSQL Primary
sudo tailscale ping 100.64.0.3  # PostgreSQL Standby
sudo tailscale ping 100.64.0.4  # Redis + MinIO
sudo tailscale ping 100.64.0.5  # Monitoring
```

### View Tailscale Network
```bash
# See all devices on your Tailscale network
sudo tailscale status --json | jq '.Peer[] | {hostname: .HostName, ip: .TailscaleIPs[0]}'
```

## Filling in Your IPs

After deploying each instance, note its Tailscale IP here:

```
Instance 1 (Backend):     100.64.0._____
Instance 2 (PostgreSQL):  100.64.0._____
Instance 3 (Standby):     100.64.0._____
Instance 4 (Redis+MinIO): 100.64.0._____
Instance 5 (Monitoring):  100.64.0._____
```

Get the IP on each instance with:
```bash
sudo tailscale ip -4
```

## Security Notes

- All database and cache services only listen on Tailscale interface
- No public internet exposure for sensitive services
- Only web consoles (Grafana, MinIO) are publicly accessible via Nginx with SSL
- Firewall rules block all external access to internal ports

## Troubleshooting

### Can't Connect Between Instances

1. Check Tailscale is running:
   ```bash
   sudo systemctl status tailscaled
   ```

2. Check Tailscale connectivity:
   ```bash
   sudo tailscale status
   ```

3. Test ping:
   ```bash
   sudo tailscale ping TARGET_IP
   ```

4. Check if service is listening on Tailscale interface:
   ```bash
   sudo netstat -tlnp | grep PORT
   ```

### Tailscale Not Starting

```bash
# Restart Tailscale
sudo systemctl restart tailscaled

# Re-authenticate
sudo tailscale up --authkey="YOUR_AUTH_KEY"
```

### Wrong Tailscale IP

Tailscale assigns IPs automatically. The IPs shown above (100.64.0.1-5) are typical but not guaranteed. Always verify with:
```bash
sudo tailscale ip -4
```

## Tailscale Dashboard

View and manage all devices:
https://login.tailscale.com/admin/machines

Features:
- See all connected devices
- View connection status
- Disable/enable devices
- Generate new auth keys
- Configure ACLs (access control lists)


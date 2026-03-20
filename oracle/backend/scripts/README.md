# Backend Deployment Scripts

This directory contains scripts for managing the Blyss backend deployment on Oracle Cloud.

## Scripts Overview

### Core Scripts

- **`common.sh`** - Shared functions and variables used by all scripts
- **`update.sh`** - Main deployment script (pulls code, updates dependencies, restarts services)
- **`fix-all.sh`** - Comprehensive fix script that resolves common issues

### Diagnostic Scripts

- **`diagnose-upload-issue.sh`** - Diagnoses file upload problems
- **`check-upload-flow.sh`** - Tests the complete upload flow from API to MinIO
- **`check-server-logs.sh`** - Analyzes server logs for upload-related errors

### Fix Scripts

- **`fix-service-config.sh`** - Fixes systemd service configuration issues

## Usage

### Regular Deployment

The deployment happens automatically via GitHub Actions when you push to master. The workflow:
1. Pulls latest code from GitHub
2. Syncs `.env.production` to `.env`
3. Installs/updates Python dependencies
4. Runs database migrations
5. Rebuilds email templates (if changed)
6. Restarts services
7. Tests API health

### Manual Deployment

SSH into the server and run:

```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash update.sh
```

### Fix Common Issues

If services are failing or uploads aren't working:

```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash fix-all.sh
```

This will:
- Fix file permissions
- Ensure `.env` exists
- Fix service configuration
- Restart services
- Test API health

### Diagnose Upload Issues

To check why file uploads are failing:

```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash diagnose-upload-issue.sh
```

This shows:
- Service status and logs
- `.env` configuration
- MinIO connectivity
- Storage endpoint accessibility
- Recent errors

### Check Server Logs

To analyze server logs for errors:

```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash check-server-logs.sh
```

This shows:
- Service status
- Recent API logs
- Upload/file-related errors
- Configuration errors
- S3/MinIO connection errors

### Check Upload Flow

To test the complete upload chain:

```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash check-upload-flow.sh
```

This tests:

```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash check-server-logs.sh
```

This shows:
- Service status
- Recent API logs
- Upload/file-related errors
- Configuration errors
- S3/MinIO connection errors

```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash check-upload-flow.sh
```

This tests:
- MinIO accessibility via Tailscale
- Bucket accessibility
- Public storage endpoint (storage.blyss.co.ke)
- API file upload endpoint
- S3 configuration
- Recent upload errors

## GitHub Workflows

### Automatic Workflows

- **`deploy-backend.yml`** - Runs automatically on push to master (when backend files change)

### Manual Workflows

You can trigger these from GitHub Actions tab:

- **`check-server-logs.yml`** - View recent logs and errors remotely
- **`diagnose-backend.yml`** - Run diagnostics remotely
- **`fix-backend-config.yml`** - Fix service configuration remotely
- **`check-upload-flow.yml`** - Check upload flow remotely

## Common Issues and Solutions

### Issue: API service fails to start with "status=241/CONFIGURATION_DIRECTORY"

**Cause**: `.env` file is missing or service `WorkingDirectory` is incorrect

**Solution**:
```bash
sudo bash fix-all.sh
```

### Issue: File uploads fail with CORS errors

**Cause**: MinIO CORS not configured or storage.blyss.co.ke not accessible

**Solution**: Check MinIO configuration on redis-minio server

### Issue: File uploads fail with connection refused

**Cause**: MinIO not accessible via Tailscale or public endpoint down

**Solution**:
```bash
sudo bash check-upload-flow.sh
```

### Issue: Services restart but API doesn't respond

**Cause**: Database connection issues or missing dependencies

**Solution**:
```bash
sudo journalctl -u blyss-api -n 50
```

## Service Management

### Check service status
```bash
sudo systemctl status blyss-api
sudo systemctl status blyss-worker
```

### View logs
```bash
sudo journalctl -u blyss-api -f          # Follow logs
sudo journalctl -u blyss-api -n 100      # Last 100 lines
sudo journalctl -u blyss-api --since "10 minutes ago"
```

### Restart services
```bash
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

## Environment Configuration

The `.env` file is automatically synced from `.env.production` during deployment. Key settings:

- **Database**: PostgreSQL via Tailscale (100.114.146.100:5432)
- **Redis**: Self-hosted via Tailscale (100.117.231.42:6379)
- **MinIO**: Self-hosted via Tailscale (100.117.231.42:9000)
- **Public Storage**: https://storage.blyss.co.ke

## Troubleshooting

If automated deployment fails:

1. Check GitHub Actions logs
2. SSH into server and check service logs
3. Run diagnostic scripts
4. Run fix-all.sh if needed
5. Check Tailscale connectivity between servers

For persistent issues, check:
- Tailscale is running on all servers
- DNS records are correct
- SSL certificates are valid
- MinIO is running and accessible

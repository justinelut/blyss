# Backend Deployment Automation

## Overview

The backend deployment is now fully automated with comprehensive diagnostics and fix scripts. When you push to master, GitHub Actions automatically deploys to Oracle Cloud.

## What Happens on Push

1. **Automatic Trigger**: Push to `master` branch triggers deployment if backend files changed
2. **SSH Connection**: GitHub Actions connects to backend server using stored SSH key
3. **Comprehensive Fix**: Runs `fix-all.sh` which:
   - Pulls latest code from GitHub (force overwrite)
   - Fixes file permissions
   - Syncs `.env.production` to `.env`
   - Fixes systemd service configuration
   - Installs/updates Python dependencies
   - Runs database migrations
   - Restarts services
   - Tests API health
4. **Status Report**: Shows service status in GitHub Actions logs

## Scripts Created

### Deployment Scripts

- **`fix-all.sh`** - Main deployment script (runs everything)
- **`update.sh`** - Regular update script (used by fix-all.sh)
- **`common.sh`** - Shared functions and variables

### Diagnostic Scripts

- **`diagnose-upload-issue.sh`** - Diagnoses file upload problems
  - Checks API service status and logs
  - Verifies `.env` file exists and has S3 config
  - Tests MinIO connectivity
  - Tests public storage endpoint
  - Checks API health
  - Searches for recent errors

- **`check-upload-flow.sh`** - Tests complete upload chain
  - Tests MinIO via Tailscale
  - Tests bucket accessibility
  - Tests public storage endpoint (storage.blyss.co.ke)
  - Tests API file upload endpoint
  - Shows S3 configuration
  - Shows recent upload errors

### Fix Scripts

- **`fix-service-config.sh`** - Fixes systemd service configuration
  - Ensures `.env` exists
  - Creates/updates service file with correct WorkingDirectory
  - Restarts services
  - Tests API health

- **`make-executable.sh`** - Makes all scripts executable

## GitHub Workflows

### Automatic Workflows

- **`deploy-backend.yml`** - Runs on push to master
  - Triggers when: `server/**`, `oracle/backend/**`, or workflow file changes
  - Runs: `fix-all.sh` to deploy and fix everything
  - Shows: Service status in logs

### Manual Workflows

Trigger from GitHub Actions tab → Run workflow:

- **`diagnose-backend.yml`** - Run diagnostics remotely
- **`fix-backend-config.yml`** - Fix service configuration remotely
- **`check-upload-flow.yml`** - Check upload flow remotely

## Common Issues Fixed Automatically

### Issue: `.env` file missing

**Auto-fix**: `fix-all.sh` syncs from `.env.production`

### Issue: Service fails with "status=241/CONFIGURATION_DIRECTORY"

**Auto-fix**: `fix-all.sh` creates service file with correct `WorkingDirectory`

### Issue: File permissions wrong

**Auto-fix**: `fix-all.sh` runs `chown -R blyss:blyss` on app directory

### Issue: Old code running

**Auto-fix**: `fix-all.sh` runs `git reset --hard origin/master` to force sync

### Issue: Dependencies out of date

**Auto-fix**: `fix-all.sh` runs `uv sync` to update dependencies

### Issue: Database migrations not applied

**Auto-fix**: `fix-all.sh` runs `uv run task db_migrate`

## Upload Flow

The file upload system works as follows:

1. **Frontend** requests upload URL from API (`POST /v1/files/`)
2. **API** generates presigned URL using MinIO SDK
   - Connects to MinIO via Tailscale: `http://100.117.231.42:9000`
   - Generates URL with public domain: `https://storage.blyss.co.ke`
3. **Frontend** uploads file directly to presigned URL
4. **MinIO** receives file via Nginx reverse proxy
   - Nginx adds CORS headers
   - Nginx proxies to MinIO on port 9001 (Console UI)
5. **File** is stored in MinIO bucket (`blyss-public` or `blyss-files`)

## Troubleshooting

### If deployment fails

1. Check GitHub Actions logs for error messages
2. SSH into server: `ssh ubuntu@92.4.130.9`
3. Run diagnostics: `cd /opt/blyss/blyss/oracle/backend/scripts && sudo bash diagnose-upload-issue.sh`
4. Check service logs: `sudo journalctl -u blyss-api -n 50`

### If uploads fail

1. Run upload flow check: `sudo bash check-upload-flow.sh`
2. Check MinIO is accessible: `curl -I http://100.117.231.42:9000/blyss-public/`
3. Check public endpoint: `curl -I https://storage.blyss.co.ke/blyss-public/`
4. Check API logs for S3 errors: `sudo journalctl -u blyss-api --since "10 minutes ago" | grep -i s3`

### If service won't start

1. Check `.env` exists: `ls -la /opt/blyss/blyss/server/.env`
2. Check service file: `cat /etc/systemd/system/blyss-api.service`
3. Run fix: `sudo bash fix-service-config.sh`
4. Check logs: `sudo journalctl -u blyss-api -n 50`

## Manual Deployment

If you need to deploy manually:

```bash
ssh ubuntu@92.4.130.9
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash fix-all.sh
```

## Configuration

### Environment Variables

All configuration is in `server/.env.production` which is synced to `server/.env` during deployment.

Key settings:
- `POLAR_S3_ENDPOINT_URL="http://100.117.231.42:9000"` - Internal MinIO connection
- `POLAR_S3_PUBLIC_ENDPOINT_URL="https://storage.blyss.co.ke"` - Public presigned URLs
- `POLAR_AWS_ACCESS_KEY_ID="minioadmin"` - MinIO credentials
- `POLAR_S3_FILES_PUBLIC_BUCKET_NAME="blyss-public"` - Public bucket name

### Service Configuration

The systemd service file is automatically created/updated by `fix-all.sh`:

```ini
[Service]
Type=simple
User=blyss
Group=blyss
WorkingDirectory=/opt/blyss/blyss/server
Environment="PATH=/home/blyss/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/home/blyss/.local/bin/uv run task api
```

## Next Steps

1. **Push to master** - Deployment happens automatically
2. **Check GitHub Actions** - Monitor deployment progress
3. **Test uploads** - Try uploading a file from frontend
4. **Check logs** - If issues, run diagnostic scripts

## No More Manual Work!

You no longer need to:
- SSH into the server for deployments
- Manually sync `.env` files
- Manually restart services
- Manually fix permissions
- Manually run migrations

Everything is automated! Just push to master and GitHub Actions handles the rest.

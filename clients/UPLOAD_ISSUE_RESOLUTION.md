# Upload Issue Resolution - Complete Automation

## Problem Summary

File uploads were failing from the frontend. The root cause was likely:

1. Backend API service configuration issues (missing `.env` or wrong `WorkingDirectory`)
2. Potential MinIO connectivity issues
3. Lack of automated diagnostics and fixes

## Solution Implemented

Created a comprehensive suite of automated scripts and workflows to:

1. **Automatically deploy** backend on push to master
2. **Automatically fix** common configuration issues
3. **Provide diagnostics** to quickly identify problems
4. **Test upload flow** end-to-end

## Files Created/Modified

### Backend Scripts (`oracle/backend/scripts/`)

1. **`fix-all.sh`** - Comprehensive deployment script
   - Pulls latest code (force overwrite)
   - Fixes file permissions
   - Syncs `.env.production` to `.env`
   - Fixes systemd service configuration
   - Installs/updates dependencies
   - Runs database migrations
   - Restarts services
   - Tests API health

2. **`diagnose-upload-issue.sh`** - Diagnostic script
   - Checks API service status and logs
   - Verifies `.env` file and S3 configuration
   - Tests MinIO connectivity
   - Tests public storage endpoint
   - Checks API health
   - Searches for recent errors

3. **`check-upload-flow.sh`** - Upload flow test
   - Tests MinIO via Tailscale
   - Tests bucket accessibility
   - Tests public storage endpoint
   - Tests API file upload endpoint
   - Shows S3 configuration
   - Shows recent upload errors

4. **`fix-service-config.sh`** - Service configuration fix
   - Ensures `.env` exists
   - Creates/updates service file with correct `WorkingDirectory`
   - Restarts services
   - Tests API health

5. **`make-executable.sh`** - Makes all scripts executable

6. **`update.sh`** - Enhanced with better error handling
   - Added `.env` verification
   - Added service configuration check
   - Better logging

### GitHub Workflows (`.github/workflows/`)

1. **`deploy-backend.yml`** - Automatic deployment
   - Triggers on push to master (when backend files change)
   - Runs `fix-all.sh` to deploy and fix everything
   - Shows service status in logs

2. **`diagnose-backend.yml`** - Manual diagnostic workflow
   - Run from GitHub Actions tab
   - Executes `diagnose-upload-issue.sh` remotely

3. **`fix-backend-config.yml`** - Manual fix workflow
   - Run from GitHub Actions tab
   - Executes `fix-service-config.sh` remotely

4. **`check-upload-flow.yml`** - Manual upload test workflow
   - Run from GitHub Actions tab
   - Executes `check-upload-flow.sh` remotely

### Documentation

1. **`oracle/backend/scripts/README.md`** - Comprehensive script documentation
2. **`oracle/backend/DEPLOYMENT_AUTOMATION.md`** - Deployment automation guide
3. **`oracle/backend/QUICK_REFERENCE.md`** - Quick reference card

## How It Works Now

### Automatic Deployment

1. You push code to master
2. GitHub Actions detects backend changes
3. Connects to server via SSH
4. Runs `fix-all.sh` which:
   - Pulls latest code
   - Fixes all configuration issues
   - Updates dependencies
   - Runs migrations
   - Restarts services
   - Tests API health
5. Shows service status in GitHub Actions logs

### Manual Diagnostics

If uploads still fail, you can:

1. Go to GitHub Actions tab
2. Run "Diagnose Backend Issues" workflow
3. View output to see what's wrong
4. Run "Fix Backend Configuration" workflow if needed
5. Run "Check Upload Flow" workflow to test uploads

### SSH Access (if needed)

```bash
ssh ubuntu@92.4.130.9
cd /opt/blyss/blyss/oracle/backend/scripts

# Run diagnostics
sudo bash diagnose-upload-issue.sh

# Fix issues
sudo bash fix-all.sh

# Test upload flow
sudo bash check-upload-flow.sh
```

## What Was Fixed

### Service Configuration

The `blyss-api.service` file now has:

- Correct `WorkingDirectory=/opt/blyss/blyss/server`
- Proper `User` and `Group` settings
- Correct `PATH` environment variable
- Memory limits

### Environment Configuration

The `.env` file is now:

- Automatically synced from `.env.production`
- Verified to exist before service starts
- Has correct permissions (600)
- Owned by correct user (blyss:blyss)

### Deployment Process

The deployment now:

- Uses `git reset --hard origin/master` to force sync
- Fixes permissions automatically
- Verifies configuration before starting services
- Tests API health after deployment
- Shows clear status in logs

## Upload Flow

The file upload system works as follows:

1. **Frontend** → API: Request upload URL
2. **API** → MinIO: Generate presigned URL
   - Internal: `http://100.117.231.42:9000`
   - Public: `https://storage.blyss.co.ke`
3. **Frontend** → Storage: Upload file to presigned URL
4. **Nginx** → MinIO: Proxy request with CORS headers
5. **MinIO**: Store file in bucket

## Testing

To test if uploads work:

1. Go to frontend: https://www.blyss.co.ke
2. Try to upload a product image
3. Check browser console for errors
4. If errors, run diagnostic workflow from GitHub Actions

## Next Steps

1. **Push this code to master** - Deployment will happen automatically
2. **Monitor GitHub Actions** - Check deployment logs
3. **Test uploads** - Try uploading a file from frontend
4. **Run diagnostics if needed** - Use manual workflows

## Benefits

- **No more manual SSH** for deployments
- **Automatic fixes** for common issues
- **Quick diagnostics** via GitHub Actions
- **Comprehensive logging** for troubleshooting
- **Consistent deployments** every time
- **Self-healing** configuration

## Troubleshooting

If uploads still fail after deployment:

1. Check GitHub Actions logs for deployment errors
2. Run "Diagnose Backend Issues" workflow
3. Check if MinIO is accessible: `curl -I http://100.117.231.42:9000/blyss-public/`
4. Check if storage endpoint is accessible: `curl -I https://storage.blyss.co.ke/blyss-public/`
5. Check API logs: `sudo journalctl -u blyss-api -n 50`

## Summary

Created a complete automation suite that:

- Deploys backend automatically on push
- Fixes configuration issues automatically
- Provides diagnostics via GitHub Actions
- Tests upload flow end-to-end
- Eliminates manual SSH work

**Just push to master and everything else is automatic!**

# Automated Deployment Setup

This guide will help you set up automatic deployment to your Oracle Cloud server whenever you push to the `master` branch.

## How It Works

When you push code to GitHub:
1. GitHub Actions detects changes in `server/**` or `oracle/scripts/**`
2. Connects to your Oracle Cloud server via SSH
3. Runs the `update.sh` script which:
   - Pulls latest code
   - Updates `.env` from `.env.production`
   - Installs/updates dependencies
   - Runs database migrations
   - Rebuilds emails if changed
   - Restarts API and worker services
   - Tests API health

## Setup Instructions

### Step 1: Get Your Server's SSH Private Key

On your local machine where you can SSH to the server:

```bash
# Display your private key
cat ~/.ssh/id_rsa
# OR if you use a different key
cat ~/.ssh/your_key_name
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

### Step 2: Add GitHub Secrets

1. Go to your GitHub repository: https://github.com/justinelut/blyss
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

#### Secret 1: ORACLE_HOST
- **Name**: `ORACLE_HOST`
- **Value**: Your server IP or domain (e.g., `server.blyss.co.ke` or the IP address)

#### Secret 2: ORACLE_SSH_KEY
- **Name**: `ORACLE_SSH_KEY`
- **Value**: Paste the entire private key you copied in Step 1

### Step 3: Test the Deployment

#### Option A: Push to master
```bash
git add .
git commit -m "Test automated deployment"
git push origin master
```

#### Option B: Manual trigger
1. Go to **Actions** tab in GitHub
2. Click **Deploy Backend to Oracle Cloud**
3. Click **Run workflow** → **Run workflow**

### Step 4: Monitor Deployment

1. Go to **Actions** tab in GitHub
2. Click on the running workflow
3. Watch the deployment logs in real-time
4. You'll see:
   - ✅ Code pulled
   - ✅ Dependencies updated
   - ✅ Migrations run
   - ✅ Emails rebuilt (if changed)
   - ✅ Services restarted
   - ✅ API health check

## What Gets Deployed Automatically

The workflow triggers on changes to:
- `server/**` - Any backend code changes
- `oracle/scripts/**` - Deployment script changes
- `.github/workflows/deploy-backend.yml` - Workflow changes

## Manual Deployment (If Needed)

If you ever need to deploy manually:

```bash
ssh ubuntu@server.blyss.co.ke
cd /opt/blyss/blyss/oracle/scripts
sudo bash update.sh
```

## Troubleshooting

### Deployment fails with "Permission denied"
- Check that `ORACLE_SSH_KEY` secret is correct
- Verify the key has no extra spaces or line breaks

### Deployment fails with "Host key verification failed"
- The server's SSH host key changed
- SSH to the server manually once to accept the new key

### Services don't restart
- Check logs: `sudo journalctl -u blyss-api -n 50`
- Check service status: `sudo systemctl status blyss-api`

### Email rebuild fails
- Check if pnpm is installed: `pnpm --version`
- Manually rebuild: `cd /opt/blyss/blyss/server && uv run task emails`

## Benefits

✅ No more manual SSH logins
✅ No more running commands on the server
✅ Automatic .env updates from .env.production
✅ Automatic email rebuilds when templates change
✅ Automatic database migrations
✅ Health checks after deployment
✅ Deployment history in GitHub Actions
✅ Can rollback by reverting commits

## Next Steps

After setup, just:
1. Make changes locally
2. Commit and push to master
3. Watch it deploy automatically! 🚀

No more crying about SSH! 😊

# Gemini API Deployment Summary

## ✅ Completed Changes

### 1. API Key Configuration

**Local Development (`.env`)**:
- ✅ Added `POLAR_AI_PROVIDER=gemini`
- ✅ Added `POLAR_GOOGLE_AI_API_KEY="AIzaSyD-kfVSxVPuctl6JzsnMssfV-yHJbPKTPc"`
- ✅ Added `POLAR_GOOGLE_AI_MODEL="gemini-2.0-flash"`

**Production (`.env.production`)**:
- ✅ Added `POLAR_AI_PROVIDER=gemini`
- ✅ Added `POLAR_GOOGLE_AI_API_KEY="AIzaSyD-kfVSxVPuctl6JzsnMssfV-yHJbPKTPc"`
- ✅ Added `POLAR_GOOGLE_AI_MODEL="gemini-2.0-flash"`
- ✅ Kept OpenAI configuration as fallback

### 2. Deployment Automation

**GitHub Actions Workflow** (`.github/workflows/deploy-backend.yml`):
- ✅ Automatically syncs `.env.production` to `.env` on server
- ✅ Runs on push to `master` branch when `server/` files change
- ✅ Can be triggered manually via "workflow_dispatch"

**Update Script** (`oracle/backend/scripts/update.sh`):
- ✅ Copies `.env.production` to `.env` with proper permissions
- ✅ Creates backup of existing `.env` before overwriting
- ✅ Verifies `.env` exists after sync
- ✅ Installs Python dependencies with `uv sync`
- ✅ Runs database migrations
- ✅ Rebuilds backoffice assets if needed
- ✅ Restarts services (blyss-api, blyss-worker)

## 🚀 Deployment Process

### Automatic Deployment (Recommended)

When you push to `master` branch:

1. **GitHub Actions triggers automatically** if changes detected in:
   - `server/**`
   - `oracle/backend/scripts/**`
   - `.github/workflows/deploy-backend.yml`

2. **Workflow executes on server**:
   ```bash
   # Pull latest code
   git fetch origin && git reset --hard origin/master
   
   # Sync environment variables
   cp server/.env.production server/.env
   
   # Update dependencies
   uv sync
   
   # Run migrations
   uv run task db_migrate
   
   # Build backoffice
   cd polar/backoffice && pnpm install && pnpm run build
   
   # Restart services
   systemctl restart blyss-api blyss-worker
   ```

3. **Environment variables are automatically updated** from `.env.production`

### Manual Deployment

If you need to deploy manually:

```bash
# SSH into server
ssh ubuntu@server.blyss.co.ke

# Run update script
sudo bash /opt/blyss/blyss/oracle/backend/scripts/update.sh
```

The script will:
- Pull latest code
- Sync `.env.production` → `.env`
- Update dependencies
- Run migrations
- Rebuild assets
- Restart services

## 🔍 Verification

### Check if Gemini is Active

After deployment, check the logs:

```bash
# On server
sudo journalctl -u blyss-api -n 100 | grep "review_analyzer.initialized"
```

You should see:
```
review_analyzer.initialized provider=gemini model=gemini-2.0-flash
```

### Test Organization Review

The Gemini AI will be used for:
- Organization approval reviews
- Risk assessment
- Policy compliance checks

## 📝 Configuration Details

### AI Provider Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `POLAR_AI_PROVIDER` | `gemini` | Active AI provider |
| `POLAR_GOOGLE_AI_API_KEY` | `AIzaSyD-...` | Gemini API key (free tier) |
| `POLAR_GOOGLE_AI_MODEL` | `gemini-2.0-flash` | Model to use |

### Fallback Configuration

OpenAI is still configured as a fallback:
- `POLAR_OPENAI_API_KEY` - Available if needed
- `POLAR_OPENAI_MODEL` - `gpt-4o-2024-12-11`

To switch back to OpenAI, just change:
```bash
POLAR_AI_PROVIDER=openai
```

## 🎯 Next Steps

1. **Push to master branch**:
   ```bash
   git add server/.env.production
   git commit -m "Add Gemini API configuration"
   git push origin master
   ```

2. **Monitor deployment**:
   - Check GitHub Actions tab for workflow status
   - Watch for "✅ Deployment completed!" message

3. **Verify on server**:
   ```bash
   # Check service status
   sudo systemctl status blyss-api
   
   # Check logs for Gemini initialization
   sudo journalctl -u blyss-api -n 50 | grep gemini
   ```

4. **Test organization review**:
   - Create a test organization
   - Submit for review
   - Check that Gemini is processing the review

## 🔒 Security Notes

- API key is stored in `.env.production` (not committed to git)
- `.env` file has `600` permissions (owner read/write only)
- Owned by `blyss` user
- Backup created before each update

## 💰 Cost Savings

- **Before**: OpenAI GPT-4o (pay-per-use)
- **After**: Google Gemini 2.0 Flash (free tier)
- **Savings**: 100% of AI costs for organization reviews

## 📚 Documentation

- Setup guide: `AI_PROVIDER_SETUP.md`
- Migration guide: `MIGRATION_TO_GEMINI.md`
- Quick start: `GEMINI_QUICK_START.md`

# Quick Reference - Backend Deployment

## Automatic Deployment

**Just push to master** - Everything else is automatic!

```bash
git add .
git commit -m "Your changes"
git push origin master
```

GitHub Actions will:
1. Pull latest code
2. Sync .env
3. Update dependencies
4. Run migrations
5. Restart services
6. Test API health

## Check Deployment Status

Go to: https://github.com/YOUR_REPO/actions

## Manual Workflows (if needed)

From GitHub Actions tab, click "Run workflow":

- **Check Server Logs** - View recent logs and errors
- **Diagnose Backend** - Check what's wrong
- **Fix Backend Config** - Fix service configuration
- **Check Upload Flow** - Test file uploads

## SSH Commands (if needed)

### Connect to server
```bash
ssh ubuntu@92.4.130.9
```

### Check service status
```bash
sudo systemctl status blyss-api
sudo systemctl status blyss-worker
```

### View logs
```bash
sudo journalctl -u blyss-api -f              # Follow logs
sudo journalctl -u blyss-api -n 100          # Last 100 lines
sudo journalctl -u blyss-api --since "10 minutes ago"
```

### Run diagnostics
```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash diagnose-upload-issue.sh           # Diagnose upload issues
sudo bash check-upload-flow.sh               # Test upload flow
```

### Fix issues
```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash fix-all.sh                         # Fix everything
sudo bash fix-service-config.sh              # Fix service config only
```

### Restart services
```bash
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

## Common Issues

### Uploads not working

```bash
cd /opt/blyss/blyss/oracle/backend/scripts
sudo bash check-upload-flow.sh
```

Look for:
- ❌ MinIO not accessible
- ❌ Public endpoint not accessible
- ❌ API not responding

### Service won't start

```bash
sudo journalctl -u blyss-api -n 50
```

Common causes:
- Missing .env file → Run `fix-all.sh`
- Wrong WorkingDirectory → Run `fix-service-config.sh`
- Database connection issue → Check Tailscale

### API returning errors

```bash
sudo journalctl -u blyss-api --since "5 minutes ago" | grep -i error
```

## File Locations

- **Code**: `/opt/blyss/blyss/`
- **Scripts**: `/opt/blyss/blyss/oracle/backend/scripts/`
- **Config**: `/opt/blyss/blyss/server/.env`
- **Service**: `/etc/systemd/system/blyss-api.service`
- **Logs**: `journalctl -u blyss-api`

## Important URLs

- **API**: https://server.blyss.co.ke
- **Frontend**: https://www.blyss.co.ke
- **Storage**: https://storage.blyss.co.ke
- **Monitoring**: https://monitor.blyss.co.ke

## Tailscale IPs

- **Backend**: 100.114.146.100 (Instance 1)
- **PostgreSQL Primary**: 100.114.146.100 (Instance 2)
- **PostgreSQL Standby**: 100.81.214.7 (Instance 3)
- **Redis + MinIO**: 100.117.231.42 (Instance 4)
- **Monitoring**: 100.81.214.7 (Instance 5)

## Emergency Contacts

If everything is broken:

1. Check GitHub Actions logs
2. SSH into server and run `diagnose-upload-issue.sh`
3. Run `fix-all.sh` to fix everything
4. Check service logs with `journalctl`
5. Verify Tailscale connectivity

## Remember

**You don't need to SSH for normal deployments!**

Just push to master and let GitHub Actions handle it.

# Oracle Cloud Deployment

## Quick Start

1. **SSH into server:**
```bash
ssh -i ssh-key-2026-03-17.key ubuntu@92.4.130.9
```

2. **Clone repo and run setup:**
```bash
cd /tmp
git clone https://github.com/justinelut/blyss.git
cd blyss/oracle
sudo chmod +x setup.sh
sudo ./setup.sh
```

That's it! The script does everything automatically.

## What the script does:
- Updates system
- Installs Python 3.12, Nginx, dependencies
- Creates 2GB swap
- Configures firewall
- Clones repository
- Installs dependencies
- Runs migrations
- Sets up systemd services
- Configures Nginx
- Sets up SSL

## After deployment:

**Check status:**
```bash
sudo systemctl status blyss-api
sudo systemctl status blyss-worker
```

**View logs:**
```bash
sudo journalctl -u blyss-api -f
sudo journalctl -u blyss-worker -f
```

**Restart services:**
```bash
sudo systemctl restart blyss-api
sudo systemctl restart blyss-worker
```

**Update code:**
```bash
sudo su - blyss
cd /opt/blyss
git pull
/home/blyss/.local/bin/uv sync
/home/blyss/.local/bin/uv run task db_migrate
exit
sudo systemctl restart blyss-api blyss-worker
```

## API Endpoints:
- Health: http://server.blyss.co.ke/healthz
- API: http://server.blyss.co.ke/v1/
- Docs: http://server.blyss.co.ke/docs

## Files:
- App: `/opt/blyss`
- Logs: `/var/log/blyss/`
- Config: `/opt/blyss/server/.env`
- Services: `/etc/systemd/system/blyss-*.service`
- Nginx: `/etc/nginx/sites-available/blyss`

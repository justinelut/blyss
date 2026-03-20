#!/bin/bash
# Test MinIO connectivity and diagnose issues

set -e

echo "=========================================="
echo "  MinIO Connectivity Test"
echo "=========================================="
echo ""

DOMAIN="storage.blyss.co.ke"
PUBLIC_IP=$(curl -s ifconfig.me || echo "unknown")
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "100.117.231.42")

echo "Server Information:"
echo "  Public IP: $PUBLIC_IP"
echo "  Tailscale IP: $TAILSCALE_IP"
echo "  Domain: $DOMAIN"
echo ""

echo "[TEST 1] DNS Resolution..."
if nslookup $DOMAIN | grep -q "$PUBLIC_IP"; then
    echo "✅ DNS resolves correctly to $PUBLIC_IP"
else
    echo "❌ DNS does not resolve to $PUBLIC_IP"
    nslookup $DOMAIN
fi
echo ""

echo "[TEST 2] MinIO Service Status..."
if systemctl is-active --quiet minio; then
    echo "✅ MinIO service is running"
else
    echo "❌ MinIO service is not running"
    systemctl status minio --no-pager
fi
echo ""

echo "[TEST 3] Nginx Service Status..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx service is running"
else
    echo "❌ Nginx service is not running"
    systemctl status nginx --no-pager
fi
echo ""

echo "[TEST 4] Port 80 Listening..."
if netstat -tlnp | grep -q ":80.*nginx"; then
    echo "✅ Nginx is listening on port 80"
else
    echo "❌ Nginx is not listening on port 80"
fi
echo ""

echo "[TEST 5] Firewall Rules..."
echo "Current UFW status:"
ufw status | grep -E "(80|443|9000|9001)"
echo ""

echo "[TEST 6] MinIO API Access (Internal)..."
if curl -s -I http://$TAILSCALE_IP:9000 | grep -q "Server: MinIO"; then
    echo "✅ MinIO API is accessible internally"
else
    echo "❌ MinIO API is not accessible internally"
fi
echo ""

echo "[TEST 7] Nginx Proxy to MinIO..."
if curl -s -I http://127.0.0.1 | grep -q "Server: nginx"; then
    echo "✅ Nginx is proxying requests"
    echo "Response headers:"
    curl -s -I http://127.0.0.1 | grep -E "(Access-Control|Server)"
else
    echo "❌ Nginx proxy is not working"
fi
echo ""

echo "[TEST 8] Public Access Test..."
echo "Testing public access to $DOMAIN..."
if curl -s -I http://$DOMAIN/blyss-public/ | grep -q "200 OK"; then
    echo "✅ Public access is working"
else
    echo "❌ Public access failed"
    echo "Response:"
    curl -s -I http://$DOMAIN/blyss-public/
fi
echo ""

echo "[TEST 9] CORS Headers..."
if curl -s -I -H "Origin: https://www.blyss.co.ke" http://$DOMAIN/blyss-public/ | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ CORS headers are present"
else
    echo "❌ CORS headers are missing"
fi
echo ""

echo "=========================================="
echo "  Test Complete"
echo "=========================================="

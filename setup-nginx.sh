#!/bin/bash
# Setup script for nginx proxy configuration

set -e

CONFIG_FILE="$(dirname "$0")/nginx-proxy.conf"
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_CONF_PATH="$NGINX_CONF_DIR/to3mal-proxy.conf"

echo "Setting up nginx proxy for TO3MAL PostGate API..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script requires sudo privileges."
    echo "Please run: sudo ./setup-nginx.sh"
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "nginx is not installed. Installing..."
    apt-get update
    apt-get install -y nginx
fi

# Copy configuration file
echo "Copying nginx configuration to $NGINX_CONF_PATH..."
cp "$CONFIG_FILE" "$NGINX_CONF_PATH"

# Test nginx configuration
echo "Testing nginx configuration..."
if nginx -t; then
    echo "✓ nginx configuration is valid"
else
    echo "✗ nginx configuration test failed"
    exit 1
fi

# Reload nginx
echo "Reloading nginx..."
systemctl reload nginx

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    echo "✓ nginx is running"
else
    echo "Starting nginx..."
    systemctl start nginx
fi

echo ""
echo "========================================="
echo "✓ Setup complete!"
echo "========================================="
echo ""
echo "Proxy is now running at: http://localhost:8080"
echo ""
echo "To verify:"
echo "  curl http://localhost:8080/health"
echo ""
echo "To test API:"
echo "  curl 'http://localhost:8080/api/Configuration/Login?Apikey=YOUR_KEY' -X POST -H 'Content-Type: application/json' -d '{\"username\":\"test\",\"password\":\"test\"}'"
echo ""
echo "To stop the proxy:"
echo "  sudo rm /etc/nginx/conf.d/to3mal-proxy.conf"
echo "  sudo systemctl reload nginx"
echo ""

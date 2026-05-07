#!/bin/sh
# Nginx entrypoint - create real log files instead of symlinks

# Remove symlinks and create real log files
rm -f /var/log/nginx/access.log /var/log/nginx/error.log
touch /var/log/nginx/access.log /var/log/nginx/error.log
chmod 644 /var/log/nginx/access.log /var/log/nginx/error.log

echo "Created real log files in /var/log/nginx/"
ls -la /var/log/nginx/

# Start nginx
exec nginx -g "daemon off;"

#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 EC2 instance.
# Usage (from the cloned repo): sudo DOMAIN=your.domain bash deploy/scripts/01-server-setup.sh
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=3-104-192-31.sslip.io}"
APP_DIR=/home/ubuntu/shopsmart
ENV_FILE=/etc/shopsmart/backend.env

echo "==> Installing system packages"
apt-get update -y
apt-get install -y nginx postgresql git curl rsync certbot python3-certbot-nginx

echo "==> Installing Node.js 22 LTS"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Adding a 2 GB swap file (helps npm and Vite on small instances)"
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Creating the PostgreSQL user and database (localhost only)"
systemctl enable --now postgresql
if [[ ! -f "$ENV_FILE" ]]; then
  DB_PASSWORD="$(openssl rand -hex 16)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'shopsmart_user') THEN
    CREATE ROLE shopsmart_user LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE shopsmart_user PASSWORD '${DB_PASSWORD}';
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'shopsmart'" | grep -q 1 \
    || sudo -u postgres createdb -O shopsmart_user shopsmart

  echo "==> Writing server-only settings to $ENV_FILE (readable by ubuntu only)"
  mkdir -p /etc/shopsmart
  cat > "$ENV_FILE" <<ENV
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
FRONTEND_URL=https://${DOMAIN}
DATABASE_URL="postgresql://shopsmart_user:${DB_PASSWORD}@localhost:5432/shopsmart?schema=public"
SESSION_SECRET=$(openssl rand -hex 32)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
ENV
  chown ubuntu:ubuntu "$ENV_FILE"
  chmod 600 "$ENV_FILE"
else
  echo "    $ENV_FILE already exists; keeping the existing database password and secret."
fi

echo "==> Installing the Nginx site"
mkdir -p /var/www/shopsmart
chown ubuntu:ubuntu /var/www/shopsmart
sed "s/YOUR_DOMAIN/${DOMAIN}/g" "$APP_DIR/deploy/nginx/shopsmart.conf" > /etc/nginx/sites-available/shopsmart
ln -sf /etc/nginx/sites-available/shopsmart /etc/nginx/sites-enabled/shopsmart
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Installing the API service"
cp "$APP_DIR/deploy/systemd/shopsmart-api.service" /etc/systemd/system/shopsmart-api.service
systemctl daemon-reload
systemctl enable shopsmart-api

echo "Setup complete. Next: bash deploy/scripts/02-release.sh (as ubuntu), then"
echo "  sudo certbot --nginx -d ${DOMAIN} --redirect --agree-tos -m YOUR_EMAIL --no-eff-email"

#!/bin/bash
# ShopSmart single-EC2 setup (Ubuntu Server 24.04 LTS). Paste into EC2 "User data" at launch.
# It runs once, as root, on first boot. Progress: /var/log/shopsmart-setup.log
# Result:  Nginx (HTTPS, React build, /api proxy) -> Express on 127.0.0.1:3000 -> PostgreSQL on 127.0.0.1:5432
# No secret is written in this file. The database password is generated on the server.
set -euxo pipefail
exec > >(tee -a /var/log/shopsmart-setup.log) 2>&1

REPO=https://github.com/teptepphhh/COGNIX--ShopSmart-Challenge.git
BRANCH=aws-deployment-revano
APP_DIR=/opt/shopsmart
ENV_FILE=/etc/shopsmart/backend.env
export DEBIAN_FRONTEND=noninteractive

# 1. Swap: t3.micro has 1 GB RAM; npm ci and the Vite build need more.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 2. Packages: Node.js 22, PostgreSQL, Nginx, Certbot
apt-get update
apt-get install -y ca-certificates curl git nginx postgresql certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# 3. App user (no login shell) and code at the tested branch
id shopsmart >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin shopsmart
if [ ! -d "$APP_DIR/.git" ]; then git clone --branch "$BRANCH" --depth 1 "$REPO" "$APP_DIR"; fi
chown -R shopsmart:shopsmart "$APP_DIR"

# 4. Public hostname from the instance metadata (IMDSv2). sslip.io maps 1-2-3-4.sslip.io to 1.2.3.4.
TOKEN=$(curl -sX PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
HOSTNAME_PUBLIC="${PUBLIC_IP//./-}.sslip.io"

# 5. PostgreSQL: local only (Ubuntu default listen_addresses = localhost). Random password, never printed.
if [ ! -f "$ENV_FILE" ]; then
  DB_PASS=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER shopsmart_app WITH PASSWORD '$DB_PASS';"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE shopsmart OWNER shopsmart_app;"
  mkdir -p /etc/shopsmart
  umask 027
  cat > "$ENV_FILE" <<ENV
DATABASE_URL=postgresql://shopsmart_app:${DB_PASS}@127.0.0.1:5432/shopsmart?schema=public
HOST=127.0.0.1
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://${HOSTNAME_PUBLIC}
TRUST_PROXY=1
COOKIE_SECURE=true
GEMINI_API_KEY=
ENV
  chown root:shopsmart "$ENV_FILE" && chmod 640 "$ENV_FILE"
  umask 022
  FIRST_INSTALL=1
fi

# 6. Install, generate Prisma Client, apply committed migrations, build the frontend for same-origin /api
sudo -u shopsmart -H bash -c "cd $APP_DIR && npm ci --no-audit --no-fund"
sudo -u shopsmart -H bash -c "set -a; . $ENV_FILE; set +a; cd $APP_DIR/backend && npx prisma generate && npx prisma migrate deploy"
# Sample products only on the brand-new, empty database. db:seed deletes orders, so it never runs again.
if [ "${FIRST_INSTALL:-0}" = "1" ]; then
  sudo -u shopsmart -H bash -c "set -a; . $ENV_FILE; set +a; cd $APP_DIR/backend && npm run db:seed"
fi
sudo -u shopsmart -H bash -c "cd $APP_DIR && VITE_API_URL=/api npm run build --workspace frontend"

# 7. Express as a systemd service: starts on boot, restarts on crash, logs to journald
cp "$APP_DIR/deploy/shopsmart-api.service" /etc/systemd/system/shopsmart-api.service
systemctl daemon-reload
systemctl enable --now shopsmart-api

# 8. Nginx: serve the React build, SPA rewrite, proxy /api to the internal API
sed "s/__SERVER_NAME__/${HOSTNAME_PUBLIC}/" "$APP_DIR/deploy/nginx-shopsmart.conf" > /etc/nginx/sites-available/shopsmart
ln -sf /etc/nginx/sites-available/shopsmart /etc/nginx/sites-enabled/shopsmart
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 9. HTTPS certificate from Let's Encrypt, HTTP redirected to HTTPS
if certbot --nginx -d "$HOSTNAME_PUBLIC" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
  echo "HTTPS ready"
else
  # Without HTTPS the secure cookie cannot work. Fall back so the failure is visible, not silent.
  sed -i "s#^FRONTEND_URL=.*#FRONTEND_URL=http://${HOSTNAME_PUBLIC}#; s#^COOKIE_SECURE=.*#COOKIE_SECURE=false#" "$ENV_FILE"
  echo "WARNING: certbot failed; site is HTTP only. Do not use sign-in until HTTPS works."
fi
systemctl restart shopsmart-api

echo "SHOPSMART SETUP DONE: https://${HOSTNAME_PUBLIC}" | tee /var/log/shopsmart-setup.done

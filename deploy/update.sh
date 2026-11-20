#!/bin/bash
# Redeploy the latest commit of the branch on the EC2 host. Run: sudo bash /opt/shopsmart/deploy/update.sh
# Order: backup -> pull -> install -> migrate (deploy only, never reset or seed) -> build -> restart -> check
set -euo pipefail
APP_DIR=/opt/shopsmart
ENV_FILE=/etc/shopsmart/backend.env
BRANCH=aws-deployment-revano
STAMP=$(date +%Y%m%d-%H%M%S)

echo "== 1. Database backup before changing anything"
mkdir -p /var/backups/shopsmart && chown postgres:postgres /var/backups/shopsmart && chmod 700 /var/backups/shopsmart
sudo -u postgres pg_dump -F c -d shopsmart -f "/var/backups/shopsmart/before-update-${STAMP}.dump"
ls -l "/var/backups/shopsmart/before-update-${STAMP}.dump"

echo "== 2. Code: $(sudo -u shopsmart git -C "$APP_DIR" log -1 --oneline) -> pulling $BRANCH"
sudo -u shopsmart -H git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
echo "   now at: $(sudo -u shopsmart git -C "$APP_DIR" log -1 --oneline)"

echo "== 3. Install, generate client, apply committed migrations"
sudo -u shopsmart -H bash -c "cd $APP_DIR && npm ci --no-audit --no-fund"
sudo -u shopsmart -H bash -c "set -a; . $ENV_FILE; set +a; cd $APP_DIR/backend && npx prisma generate && npx prisma migrate deploy && npx prisma migrate status"

echo "== 4. Build frontend (same-origin /api)"
sudo -u shopsmart -H bash -c "cd $APP_DIR && VITE_API_URL=/api npm run build --workspace frontend"

echo "== 5. Restart API and check"
systemctl restart shopsmart-api
sleep 3
systemctl is-active shopsmart-api
curl -s http://127.0.0.1:3000/api/health; echo
echo "UPDATE DONE at $(sudo -u shopsmart git -C "$APP_DIR" log -1 --oneline)"

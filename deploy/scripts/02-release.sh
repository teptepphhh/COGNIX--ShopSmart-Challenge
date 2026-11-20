#!/usr/bin/env bash
# Build and release the current code. Run as the ubuntu user from the repo root:
#   bash deploy/scripts/02-release.sh
set -euo pipefail

APP_DIR=/home/ubuntu/shopsmart
ENV_FILE=/etc/shopsmart/backend.env
cd "$APP_DIR"

echo "==> Updating code"
git pull --ff-only || echo "    (git pull skipped: not on a tracking branch)"
echo "    Release commit: $(git rev-parse --short HEAD)"

echo "==> Installing dependencies exactly as locked"
npm ci

echo "==> Generating Prisma Client"
npm run db:generate

echo "==> Applying committed migrations (prisma migrate deploy; never the seed script)"
set -a; source "$ENV_FILE"; set +a
npm run db:deploy

echo "==> Building the frontend with a same-origin API URL"
VITE_API_URL=/api npm run build

echo "==> Publishing the frontend"
rsync -a --delete frontend/dist/ /var/www/shopsmart/

echo "==> Restarting the API"
sudo systemctl restart shopsmart-api
sleep 3
curl -fsS http://127.0.0.1:3000/api/health && echo
echo "Release complete."

#!/usr/bin/env bash
# FIRST DEPLOY ONLY: loads the six sample products into an EMPTY database.
# The seed deletes all orders and products, so this script refuses to run if any order exists.
set -euo pipefail
cd /home/ubuntu/shopsmart
set -a; source /etc/shopsmart/backend.env; set +a
ORDERS=$(sudo -u postgres psql -d shopsmart -tAc 'SELECT COUNT(*) FROM "Order"')
if [[ "$ORDERS" != "0" ]]; then
  echo "Refusing to seed: the database already has $ORDERS order(s)." >&2
  exit 1
fi
npm run db:seed

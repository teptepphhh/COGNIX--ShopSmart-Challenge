#!/usr/bin/env bash
# Back up the ShopSmart database before risky changes or teardown.
#   bash deploy/scripts/03-backup.sh
set -euo pipefail
mkdir -p "$HOME/backups"
FILE="$HOME/backups/shopsmart-$(date +%Y%m%d-%H%M%S).sql"
sudo -u postgres pg_dump shopsmart > "$FILE"
echo "Backup written to $FILE ($(du -h "$FILE" | cut -f1))"

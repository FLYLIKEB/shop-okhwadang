#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_FILE="$SCRIPT_DIR/../backend/src/database/seeds/okhwadang-seed.sql"

if [ ! -f "$SEED_FILE" ]; then
  echo "Error: Seed file not found at $SEED_FILE"
  exit 1
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3307}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-changeme_root_password}"
DB_NAME="${DB_NAME:-okhwadang}"

echo "Running seed for $DB_NAME..."

docker exec -i okhwadang-mysql mysql \
  --default-character-set=utf8mb4 \
  -u"$DB_USER" \
  -p"$DB_PASS" \
  "$DB_NAME" < "$SEED_FILE"

echo "Seed completed."

#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3307}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-__REDACTED_ROOT_PW__}"
DB_NAME="${DB_NAME:-commerce}"

export LOCAL_DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Running TypeORM seed..."
echo "Database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}"

cd "$BACKEND_DIR"
npm run seed

echo "Seed completed."

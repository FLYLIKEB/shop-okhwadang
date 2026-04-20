#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3307}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-okhwadang_local_root_2024}"
DB_NAME="${DB_NAME:-commerce}"

# typeorm.config.ts는 DATABASE_URL을 LOCAL_DATABASE_URL보다 우선 사용하고,
# run-seed.ts가 dotenv/config로 .env를 먼저 로드하므로
# DATABASE_URL로 export해야 .env 값을 덮어쓸 수 있다.
export DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Running TypeORM seed..."
echo "Database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}"

cd "$BACKEND_DIR"
npm run seed

echo "Seed completed."

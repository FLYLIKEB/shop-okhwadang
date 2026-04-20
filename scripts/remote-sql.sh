#!/usr/bin/env bash
#
# 원격(EC2 prod) MySQL 직접 SQL 실행
#
# 사용법:
#   bash scripts/remote-sql.sh "SELECT COUNT(*) FROM users;"
#   bash scripts/remote-sql.sh "$(cat query.sql)"
#   echo "SHOW TABLES;" | bash scripts/remote-sql.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.secrets ]; then
  echo "ERROR: .env.secrets 가 프로젝트 루트에 없습니다." >&2
  exit 1
fi

set -a
. ./.env.secrets
set +a

: "${BASTION_HOST:?BASTION_HOST 가 .env.secrets 에 없습니다}"
: "${BASTION_USER:?BASTION_USER 가 .env.secrets 에 없습니다}"
: "${BASTION_KEY:?BASTION_KEY 가 .env.secrets 에 없습니다}"

BASTION_KEY_EXPANDED="${BASTION_KEY/#\~/$HOME}"

if [ ! -f "$BASTION_KEY_EXPANDED" ]; then
  echo "ERROR: SSH 키를 찾을 수 없습니다: $BASTION_KEY_EXPANDED" >&2
  exit 1
fi

# SQL 입력: 인자 또는 stdin
if [ $# -ge 1 ]; then
  SQL="$1"
elif [ ! -t 0 ]; then
  SQL="$(cat)"
else
  echo "사용법: bash scripts/remote-sql.sh \"SQL문\"" >&2
  echo "        echo \"SQL문\" | bash scripts/remote-sql.sh" >&2
  exit 1
fi

echo "▶ 원격 SQL 실행"
echo "  호스트: $BASTION_USER@$BASTION_HOST"
echo ""

# SQL을 base64로 인코딩해서 SSH 인자로 전달 (특수문자·개행 안전)
SQL_B64=$(echo "$SQL" | base64)

ssh -i "$BASTION_KEY_EXPANDED" \
    -o StrictHostKeyChecking=no \
    "$BASTION_USER@$BASTION_HOST" \
    "bash -s" <<SSHSCRIPT
DB_URL=\$(grep DATABASE_URL /app/shop-okhwadang/shop-okhwadang/backend/.env | cut -d= -f2-)
DB_USER=\$(echo "\$DB_URL" | sed 's|mysql://||' | cut -d: -f1)
DB_PASS=\$(echo "\$DB_URL" | sed 's|mysql://[^:]*:||' | cut -d@ -f1)
DB_HOST=\$(echo "\$DB_URL" | cut -d@ -f2 | cut -d: -f1)
DB_PORT=\$(echo "\$DB_URL" | cut -d@ -f2 | cut -d: -f2 | cut -d/ -f1)
DB_NAME=\$(echo "\$DB_URL" | cut -d/ -f4)
SQL=\$(echo "$SQL_B64" | base64 -d)
mysql -h"\$DB_HOST" -P"\$DB_PORT" -u"\$DB_USER" -p"\$DB_PASS" "\$DB_NAME" -e "\$SQL" 2>/dev/null
SSHSCRIPT

echo ""
echo "✓ 완료"

#!/usr/bin/env bash
#
# 원격 Lightsail MySQL SSH 터널 (Bastion EC2 경유)
#
# 사용법:
#   bash scripts/remote-db-tunnel.sh [local_port]
#     local_port  로컬 바인딩 포트 (기본 3307)
#
# 접속:
#   DBeaver/TablePlus: Host=127.0.0.1, Port=3307, User=dbadmin
#   CLI: mysql -h 127.0.0.1 -P 3307 -u dbadmin -p commerce
#
# 종료: Ctrl+C
#
# 요구사항:
#   - .env.secrets 에 다음 키 설정:
#       BASTION_HOST, BASTION_USER, BASTION_KEY
#       LIGHTSAIL_DB_HOST (Lightsail endpoint)
#       LIGHTSAIL_DB_PORT (기본 3306)

set -euo pipefail

LOCAL_PORT="${1:-3307}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.secrets ]; then
  echo "ERROR: .env.secrets 가 프로젝트 루트에 없습니다." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
. ./.env.secrets
set +a

: "${BASTION_HOST:?BASTION_HOST 가 .env.secrets 에 없습니다}"
: "${BASTION_USER:?BASTION_USER 가 .env.secrets 에 없습니다}"
: "${BASTION_KEY:?BASTION_KEY 가 .env.secrets 에 없습니다}"
: "${LIGHTSAIL_DB_HOST:?LIGHTSAIL_DB_HOST 가 .env.secrets 에 없습니다}"

REMOTE_PORT="${LIGHTSAIL_DB_PORT:-3306}"
BASTION_KEY_EXPANDED="${BASTION_KEY/#\~/$HOME}"

if [ ! -f "$BASTION_KEY_EXPANDED" ]; then
  echo "ERROR: SSH 키를 찾을 수 없습니다: $BASTION_KEY_EXPANDED" >&2
  exit 1
fi

# 포트 점유 확인
if lsof -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: 로컬 포트 $LOCAL_PORT 이 이미 사용 중입니다." >&2
  echo "  다른 포트로 실행: bash scripts/remote-db-tunnel.sh 3308" >&2
  exit 1
fi

echo "▶ SSH 터널 시작"
echo "  로컬:  127.0.0.1:$LOCAL_PORT"
echo "  원격:  $LIGHTSAIL_DB_HOST:$REMOTE_PORT"
echo "  경유:  $BASTION_USER@$BASTION_HOST"
echo ""
echo "  DBeaver 연결: Host=127.0.0.1  Port=$LOCAL_PORT  User=dbadmin"
echo "  종료:         Ctrl+C"
echo ""

exec ssh -N \
    -i "$BASTION_KEY_EXPANDED" \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    -L "$LOCAL_PORT:$LIGHTSAIL_DB_HOST:$REMOTE_PORT" \
    "$BASTION_USER@$BASTION_HOST"

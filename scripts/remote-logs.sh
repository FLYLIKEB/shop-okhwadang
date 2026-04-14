#!/usr/bin/env bash
#
# 원격(EC2 prod) PM2 로그 조회
#
# 사용법:
#   bash scripts/remote-logs.sh [tail|recent|status|monit|error] [lines]
#     tail    (기본) 실시간 로그 스트리밍 (Ctrl+C로 종료)
#     recent           최근 N줄 (기본 100)
#     status           pm2 프로세스 상태
#     monit            CPU/메모리 모니터링
#     error            에러 로그만 N줄 (기본 100)
#
# 예:
#   bash scripts/remote-logs.sh
#   bash scripts/remote-logs.sh recent 200
#   bash scripts/remote-logs.sh error 50
#
# 요구사항:
#   - .env.secrets 에 BASTION_HOST, BASTION_USER, BASTION_KEY 설정

set -euo pipefail

SUBCMD="${1:-tail}"
LINES="${2:-100}"
APP_NAME="commerce"

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

BASTION_KEY_EXPANDED="${BASTION_KEY/#\~/$HOME}"

if [ ! -f "$BASTION_KEY_EXPANDED" ]; then
  echo "ERROR: SSH 키를 찾을 수 없습니다: $BASTION_KEY_EXPANDED" >&2
  exit 1
fi

case "$SUBCMD" in
  tail)   REMOTE_CMD="pm2 logs $APP_NAME" ;;
  recent) REMOTE_CMD="pm2 logs $APP_NAME --lines $LINES --nostream" ;;
  status) REMOTE_CMD="pm2 status" ;;
  monit)  REMOTE_CMD="pm2 monit" ;;
  error)  REMOTE_CMD="pm2 logs $APP_NAME --err --lines $LINES --nostream" ;;
  *)
    echo "Usage: $0 [tail|recent|status|monit|error] [lines]" >&2
    exit 1
    ;;
esac

echo "▶ 원격 로그 조회: $SUBCMD"
echo "  호스트: $BASTION_USER@$BASTION_HOST"
echo ""

# monit/tail 은 TTY 필요 → -t 플래그
case "$SUBCMD" in
  tail|monit) SSH_FLAGS="-t" ;;
  *)          SSH_FLAGS=""   ;;
esac

ssh $SSH_FLAGS -i "$BASTION_KEY_EXPANDED" \
    -o StrictHostKeyChecking=no \
    "$BASTION_USER@$BASTION_HOST" \
    "$REMOTE_CMD"

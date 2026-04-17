#!/usr/bin/env bash
#
# 원격(EC2 prod) PM2 로그 조회
#
# 사용법:
#   bash scripts/remote-logs.sh [tail|recent|status|monit|error|error-tail] [lines]
#     tail       (기본) 실시간 로그 스트리밍 (Ctrl+C로 종료)
#     recent              최근 N줄 (기본 1000)
#     status              pm2 프로세스 상태
#     monit               CPU/메모리 모니터링
#     error               에러 로그만 N줄 (기본 1000)
#     error-tail          에러 로그 실시간 스트리밍
#     flush               PM2 로그 파일 비우기
#     reload              ecosystem.config.js로 재기동 (log_date_format 적용)
#
# 예:
#   bash scripts/remote-logs.sh
#   bash scripts/remote-logs.sh recent 5000
#   bash scripts/remote-logs.sh error 500
#   bash scripts/remote-logs.sh error-tail
#
# 요구사항:
#   - .env.secrets 에 BASTION_HOST, BASTION_USER, BASTION_KEY 설정

set -euo pipefail

SUBCMD="${1:-tail}"
LINES="${2:-1000}"
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
  tail)       REMOTE_CMD="pm2 logs $APP_NAME --lines $LINES" ;;
  recent)     REMOTE_CMD="pm2 logs $APP_NAME --lines $LINES --nostream" ;;
  status)     REMOTE_CMD="pm2 status" ;;
  monit)      REMOTE_CMD="pm2 monit" ;;
  error)      REMOTE_CMD="pm2 logs $APP_NAME --err --lines $LINES --nostream --timestamp 'YYYY-MM-DD HH:mm:ss'" ;;
  error-tail) REMOTE_CMD="pm2 logs $APP_NAME --err --lines $LINES --timestamp 'YYYY-MM-DD HH:mm:ss'" ;;
  flush)      REMOTE_CMD="pm2 flush $APP_NAME" ;;
  reload)     REMOTE_CMD="cd /app/shop-okhwadang/shop-okhwadang/backend && git pull --ff-only && pm2 delete $APP_NAME 2>/dev/null || true; cd /app/shop-okhwadang/shop-okhwadang/backend && pm2 start ecosystem.config.js --env production && pm2 save" ;;
  *)
    echo "Usage: $0 [tail|recent|status|monit|error|error-tail|flush|reload] [lines]" >&2
    exit 1
    ;;
esac

echo "▶ 원격 로그 조회: $SUBCMD"
echo "  호스트: $BASTION_USER@$BASTION_HOST"
echo ""

# monit/tail 은 TTY 필요 → -t 플래그
case "$SUBCMD" in
  tail|monit|error-tail) SSH_FLAGS="-t" ;;
  *)          SSH_FLAGS=""   ;;
esac

ssh $SSH_FLAGS -i "$BASTION_KEY_EXPANDED" \
    -o StrictHostKeyChecking=no \
    "$BASTION_USER@$BASTION_HOST" \
    "$REMOTE_CMD"

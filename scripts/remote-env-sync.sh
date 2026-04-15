#!/usr/bin/env bash
#
# 원격(EC2 prod) backend/.env 동기화
#
# 로컬의 backend/.env.production 을 조합해서 EC2의
# /app/shop-okhwadang/shop-okhwadang/backend/.env 로 업로드한다.
# .env.secrets의 DATABASE_URL을 덮어쓰기 옵션으로 적용.
#
# 사용법:
#   bash scripts/remote-env-sync.sh [push|diff|pull]
#     push  (기본) 로컬 → 원격 업로드 + pm2 restart
#     diff         로컬 vs 원격 diff만 확인 (업로드 안 함)
#     pull         원격 → 로컬 /tmp/remote.env 로 백업
#
# 요구사항:
#   - .env.secrets 에 BASTION_HOST, BASTION_USER, BASTION_KEY, DATABASE_URL 설정
#   - backend/.env.production 존재

set -euo pipefail

SUBCMD="${1:-push}"
APP_NAME="commerce"
REMOTE_PATH="/app/shop-okhwadang/shop-okhwadang/backend/.env"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env.secrets ]; then
  echo "ERROR: .env.secrets 가 프로젝트 루트에 없습니다." >&2
  exit 1
fi
if [ ! -f backend/.env.production ]; then
  echo "ERROR: backend/.env.production 파일이 없습니다." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
. ./.env.secrets
set +a

: "${BASTION_HOST:?BASTION_HOST 가 .env.secrets 에 없습니다}"
: "${BASTION_USER:?BASTION_USER 가 .env.secrets 에 없습니다}"
: "${BASTION_KEY:?BASTION_KEY 가 .env.secrets 에 없습니다}"
: "${DATABASE_URL:?DATABASE_URL 가 .env.secrets 에 없습니다}"

BASTION_KEY_EXPANDED="${BASTION_KEY/#\~/$HOME}"

if [ ! -f "$BASTION_KEY_EXPANDED" ]; then
  echo "ERROR: SSH 키를 찾을 수 없습니다: $BASTION_KEY_EXPANDED" >&2
  exit 1
fi

# 로컬 .env.production + .env.secrets 값을 병합한 최종 env 생성
TMP_ENV="$(mktemp -t remote-env.XXXXXX)"
trap 'rm -f "$TMP_ENV"' EXIT

# 1. .env.production 베이스로 복사
cp backend/.env.production "$TMP_ENV"

# 2. 플레이스홀더 DATABASE_URL 을 .env.secrets 의 실값으로 교체
#    sed 대신 awk — DATABASE_URL 값에 / & 가 포함될 수 있기 때문
awk -v v="$DATABASE_URL" '
  BEGIN { replaced = 0 }
  /^DATABASE_URL=/ { print "DATABASE_URL=" v; replaced = 1; next }
  { print }
  END { if (!replaced) print "DATABASE_URL=" v }
' "$TMP_ENV" > "$TMP_ENV.new" && mv "$TMP_ENV.new" "$TMP_ENV"

case "$SUBCMD" in
  push)
    echo "▶ 원격 .env 업로드: $BASTION_USER@$BASTION_HOST:$REMOTE_PATH"
    # 타임스탬프 백업 후 덮어쓰기
    ssh -i "$BASTION_KEY_EXPANDED" -o StrictHostKeyChecking=no \
        "$BASTION_USER@$BASTION_HOST" \
        "cp $REMOTE_PATH ${REMOTE_PATH}.backup-\$(date +%s) 2>/dev/null || true"
    scp -i "$BASTION_KEY_EXPANDED" -o StrictHostKeyChecking=no \
        "$TMP_ENV" "$BASTION_USER@$BASTION_HOST:$REMOTE_PATH"
    echo "▶ pm2 restart $APP_NAME --update-env"
    ssh -i "$BASTION_KEY_EXPANDED" -o StrictHostKeyChecking=no \
        "$BASTION_USER@$BASTION_HOST" \
        "pm2 restart $APP_NAME --update-env && pm2 save"
    echo "✓ 완료"
    ;;
  diff)
    echo "▶ 원격 .env 와 로컬 병합본 diff"
    ssh -i "$BASTION_KEY_EXPANDED" -o StrictHostKeyChecking=no \
        "$BASTION_USER@$BASTION_HOST" "cat $REMOTE_PATH" \
        | diff - "$TMP_ENV" || true
    ;;
  pull)
    OUT="/tmp/remote.env"
    echo "▶ 원격 .env → $OUT"
    scp -i "$BASTION_KEY_EXPANDED" -o StrictHostKeyChecking=no \
        "$BASTION_USER@$BASTION_HOST:$REMOTE_PATH" "$OUT"
    echo "✓ 백업: $OUT"
    ;;
  *)
    echo "Usage: $0 [push|diff|pull]" >&2
    exit 1
    ;;
esac

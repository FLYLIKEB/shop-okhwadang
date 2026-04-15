#!/usr/bin/env bash
#
# 원격(EC2 prod) backend/.env 동기화
#
# 로컬의 backend/.env.production 을 조합해서 EC2의
# /app/shop-okhwadang/shop-okhwadang/backend/.env 로 업로드한다.
# .env.secrets의 DATABASE_URL을 덮어쓰기 옵션으로 적용.
#
# 사용법:
#   bash scripts/remote-env-sync.sh [push|diff|pull|rollback|set-secret] [--verbose]
#     push          (기본) 로컬 → 원격 업로드 + pm2 restart
#     diff                  로컬 vs 원격 차이 (기본은 키 이름만, --verbose 시 값 노출)
#     pull                  원격 → /tmp/remote.env 로 백업 (mode 600)
#     rollback              원격의 .env.prev 를 .env 로 되돌리고 pm2 restart
#     set-secret            GitHub Secret BACKEND_ENV_PRODUCTION 도 같이 업데이트
#                           (deploy.yml 이 매 배포마다 Secret → .env 로 복원하므로 필수)
#
# 보호 장치:
#   - 업로드 전 값에 localhost/127.0.0.1 포함 시 경고 후 중단
#   - 업로드는 .env.tmp → chmod 600 → mv 원자적 교체
#   - 직전 버전은 .env.prev 단일 파일 (rollback 용)
#   - 기본 diff 는 값 마스킹
#
# 요구사항:
#   - .env.secrets 에 BASTION_HOST, BASTION_USER, BASTION_KEY, DATABASE_URL
#   - backend/.env.production 존재

set -euo pipefail

SUBCMD="${1:-push}"
VERBOSE=0
if [ "${2:-}" = "--verbose" ] || [ "${1:-}" = "--verbose" ]; then
  VERBOSE=1
  [ "${1:-}" = "--verbose" ] && SUBCMD="${2:-push}"
fi

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

SSH_OPTS="-o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10"

# rollback 은 로컬 파일 필요 없음 — 먼저 분기
if [ "$SUBCMD" = "rollback" ]; then
  echo "▶ 원격 .env.prev → .env 롤백"
  ssh -i "$BASTION_KEY_EXPANDED" $SSH_OPTS \
      "$BASTION_USER@$BASTION_HOST" \
      "set -e; [ -f ${REMOTE_PATH}.prev ] || { echo 'ERROR: .env.prev 없음'; exit 1; }; cp -p ${REMOTE_PATH}.prev ${REMOTE_PATH}.tmp; chmod 600 ${REMOTE_PATH}.tmp; mv ${REMOTE_PATH}.tmp $REMOTE_PATH; pm2 restart $APP_NAME --update-env; pm2 save"
  echo "✓ 롤백 완료"
  exit 0
fi

# ── 로컬 병합본 생성 ──
TMP_ENV="$(mktemp -t remote-env.XXXXXX)"
chmod 600 "$TMP_ENV"
trap 'shred -u "$TMP_ENV" 2>/dev/null || rm -f "$TMP_ENV"' EXIT

cp backend/.env.production "$TMP_ENV"

# DATABASE_URL 을 .env.secrets 실값으로 교체
awk -v v="$DATABASE_URL" '
  BEGIN { replaced = 0 }
  /^DATABASE_URL=/ { print "DATABASE_URL=" v; replaced = 1; next }
  { print }
  END { if (!replaced) print "DATABASE_URL=" v }
' "$TMP_ENV" > "$TMP_ENV.new" && mv "$TMP_ENV.new" "$TMP_ENV"

# ── 안전 검증: localhost/127.0.0.1 이 값에 섞여있으면 중단 ──
# 주석(#)과 빈 줄은 무시, KEY=VALUE 형식의 VALUE만 검사
SUSPICIOUS=$(grep -vE '^\s*(#|$)' "$TMP_ENV" | awk -F= 'NF>=2 { $1=""; sub(/^=/,""); print }' | grep -nE 'localhost|127\.0\.0\.1|172\.31\.x\.x|<[A-Z_]+>' || true)
if [ -n "$SUSPICIOUS" ]; then
  echo "⚠ 경고: 프로덕션 값에 localhost/placeholder 가 포함되어 있습니다:" >&2
  echo "$SUSPICIOUS" >&2
  echo "backend/.env.production 을 수정하거나 .env.secrets 에서 오버라이드 로직을 추가하세요." >&2
  exit 1
fi

# ── 값 마스킹 필터 ──
# KEY=VALUE → KEY=<redacted> (단 주석/빈 줄은 유지)
mask() {
  awk -F= '
    /^\s*#/ || /^\s*$/ { print; next }
    NF>=2 { print $1 "=<redacted>"; next }
    { print }
  ' "$1"
}

case "$SUBCMD" in
  push)
    echo "▶ 원격 .env 업로드: $BASTION_USER@$BASTION_HOST:$REMOTE_PATH"
    scp -i "$BASTION_KEY_EXPANDED" $SSH_OPTS \
        "$TMP_ENV" "$BASTION_USER@$BASTION_HOST:${REMOTE_PATH}.tmp"
    ssh -i "$BASTION_KEY_EXPANDED" $SSH_OPTS \
        "$BASTION_USER@$BASTION_HOST" \
        "set -e; chmod 600 ${REMOTE_PATH}.tmp; [ -f $REMOTE_PATH ] && cp -p $REMOTE_PATH ${REMOTE_PATH}.prev || true; mv ${REMOTE_PATH}.tmp $REMOTE_PATH"
    echo "▶ pm2 restart $APP_NAME --update-env"
    ssh -i "$BASTION_KEY_EXPANDED" $SSH_OPTS \
        "$BASTION_USER@$BASTION_HOST" \
        "set -e; pm2 restart $APP_NAME --update-env; pm2 save"
    echo "✓ 완료 (실패 시 rollback 으로 복구)"
    ;;
  diff)
    REMOTE_COPY="$(mktemp -t remote-env.XXXXXX)"
    chmod 600 "$REMOTE_COPY"
    # shellcheck disable=SC2064
    trap "shred -u \"$TMP_ENV\" \"$REMOTE_COPY\" 2>/dev/null || rm -f \"$TMP_ENV\" \"$REMOTE_COPY\"" EXIT
    ssh -i "$BASTION_KEY_EXPANDED" $SSH_OPTS \
        "$BASTION_USER@$BASTION_HOST" "cat $REMOTE_PATH" > "$REMOTE_COPY"
    if [ "$VERBOSE" = "1" ]; then
      echo "▶ 원격 vs 로컬 diff (값 포함 — 터미널 히스토리 주의)"
      diff "$REMOTE_COPY" "$TMP_ENV" || true
    else
      echo "▶ 원격 vs 로컬 diff (값 마스킹, 값까지 보려면 --verbose)"
      diff <(mask "$REMOTE_COPY") <(mask "$TMP_ENV") || true
    fi
    ;;
  set-secret)
    command -v gh >/dev/null 2>&1 || { echo "ERROR: gh CLI 필요" >&2; exit 1; }
    gh auth status >/dev/null 2>&1 || { echo "ERROR: gh auth login 필요" >&2; exit 1; }
    echo "▶ GitHub Secret BACKEND_ENV_PRODUCTION 업데이트"
    gh secret set BACKEND_ENV_PRODUCTION < "$TMP_ENV"
    echo "✓ Secret 업데이트 완료 (다음 배포부터 반영)"
    echo "  원격도 바로 반영하려면: bash scripts/remote-env-sync.sh push"
    ;;
  pull)
    OUT="/tmp/remote.env"
    echo "▶ 원격 .env → $OUT"
    scp -i "$BASTION_KEY_EXPANDED" $SSH_OPTS \
        "$BASTION_USER@$BASTION_HOST:$REMOTE_PATH" "$OUT"
    chmod 600 "$OUT"
    echo "✓ 백업: $OUT (mode 600)"
    ;;
  *)
    echo "Usage: $0 [push|diff|pull|rollback|set-secret] [--verbose]" >&2
    exit 1
    ;;
esac

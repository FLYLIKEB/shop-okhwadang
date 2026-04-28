#!/usr/bin/env bash
#
# 원격(EC2 prod) TypeORM 마이그레이션 실행기
#
# 사용법:
#   bash scripts/remote-migration.sh [run|revert|show]
#     run    (기본) 대기 중인 마이그레이션 모두 실행
#     revert            마지막 마이그레이션 1건 되돌리기
#     show              적용/미적용 마이그레이션 목록
#
# 요구사항:
#   - 프로젝트 루트의 .env.secrets 에 아래 키들이 설정되어 있어야 함
#       BASTION_HOST, BASTION_USER, BASTION_KEY
#   - EC2 호스트에 /app/shop-okhwadang/shop-okhwadang/backend 가 배포되어 있고
#     backend/.env 에 DATABASE_URL(Lightsail) 이 설정되어 있어야 함

set -euo pipefail

SUBCMD="${1:-run}"

case "$SUBCMD" in
  run)    NPM_SCRIPT="migration:run:prod" ;;
  revert) NPM_SCRIPT="migration:revert:prod" ;;
  show)   NPM_SCRIPT="migration:show:prod" ;;
  *)
    echo "Usage: $0 [run|revert|show]" >&2
    exit 1
    ;;
esac

# 프로젝트 루트로 이동
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

# ~ expansion
BASTION_KEY_EXPANDED="${BASTION_KEY/#\~/$HOME}"

if [ ! -f "$BASTION_KEY_EXPANDED" ]; then
  echo "ERROR: SSH 키를 찾을 수 없습니다: $BASTION_KEY_EXPANDED" >&2
  exit 1
fi

REMOTE_BACKEND_DIR="/app/shop-okhwadang/shop-okhwadang/backend"

echo "▶ 원격 마이그레이션 실행: $SUBCMD ($NPM_SCRIPT)"
echo "  호스트: $BASTION_USER@$BASTION_HOST"
echo "  경로:   $REMOTE_BACKEND_DIR"
echo ""

ssh -i "$BASTION_KEY_EXPANDED" \
    -o StrictHostKeyChecking=no \
    "$BASTION_USER@$BASTION_HOST" \
    "set -euo pipefail
     cd '$REMOTE_BACKEND_DIR'
     if [ ! -f .env ]; then
       echo 'ERROR: 원격 .env 파일이 없습니다.' >&2
       exit 1
     fi
     if [ ! -f dist/database/typeorm.config.js ]; then
       echo 'ERROR: dist/ 빌드가 없습니다. 먼저 npm run build 를 실행하세요.' >&2
       exit 1
     fi
     set -a
     . ./.env
     set +a
     NODE_ENV=production npm run $NPM_SCRIPT"

echo ""
echo "✓ 완료"

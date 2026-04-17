#!/usr/bin/env bash
#
# 원격(EC2 prod) 시드 데이터 삽입기
#
# 사용법:
#   bash scripts/remote-seed.sh
#
# 요구사항:
#   - .env.secrets 에 BASTION_HOST / BASTION_USER / BASTION_KEY
#   - EC2 /app/shop-okhwadang/shop-okhwadang/backend 에 빌드된 dist/ 존재
#   - backend/.env 에 DATABASE_URL 설정됨
#
# 주의:
#   seeder 는 기본적으로 테이블을 비우지 않습니다. 필요하면 seeder 내부에서
#   처리하거나 remote-migration.sh revert 로 스키마 재적용 후 사용하세요.

set -euo pipefail

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

REMOTE_BACKEND_DIR="/app/shop-okhwadang/shop-okhwadang/backend"

echo "▶ 원격 시드 실행"
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
     if [ ! -f dist/database/seeds/run-seed.js ]; then
       echo 'ERROR: dist/ 빌드가 없습니다. 먼저 npm run build 를 실행하세요.' >&2
       exit 1
     fi
     set -a
     . ./.env
     set +a
     NODE_ENV=production node dist/database/seeds/run-seed.js"

echo ""
echo "✓ 완료"

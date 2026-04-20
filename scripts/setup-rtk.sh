#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.env.rtk.local"
PRINT_ENV=false
CHECK_ONLY=false
SKIP_CHECK=false

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/setup-rtk.sh
  bash scripts/setup-rtk.sh --check
  bash scripts/setup-rtk.sh --no-check
  bash scripts/setup-rtk.sh --print-env
  bash scripts/setup-rtk.sh -- bash scripts/test.sh

Behavior:
  1) Reads .env.rtk.local
  2) Verifies RTK binary availability
  3) Runs the given command through RTK proxy
EOF
}

ensure_config_file() {
  if [ -f "$CONFIG_FILE" ]; then
    return
  fi

  cat > "$CONFIG_FILE" <<'EOF'
RTK_ENABLED=1
RTK_MODE=proxy
EOF

  echo -e "${YELLOW}⚠️  $CONFIG_FILE 파일이 없어 기본 템플릿을 생성했습니다.${NC}"
}

load_config() {
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a

  if [ -z "${RTK_ENABLED:-}" ]; then
    RTK_ENABLED=1
  fi

  if [ -z "${RTK_MODE:-}" ]; then
    RTK_MODE="proxy"
  fi
}

check_rtk() {
  if command -v rtk > /dev/null 2>&1; then
    return 0
  fi

  echo -e "${RED}❌ rtk 바이너리를 찾을 수 없습니다.${NC}"
  echo -e "${YELLOW}   설치 예시: brew install rtk${NC}"
  echo -e "${YELLOW}   설치 후 새 터미널에서 다시 실행하세요.${NC}"
  exit 1
}

run_command() {
  if [ "$RTK_ENABLED" != "1" ]; then
    echo -e "${YELLOW}⚠️  RTK_ENABLED!=1 이므로 원본 명령을 실행합니다.${NC}"
    "$@"
    return
  fi

  if [ "$#" -ge 2 ] && [ "$1" = "bash" ] && [ "$2" = "scripts/test.sh" ]; then
    echo -e "${YELLOW}⚠️  RTK가 현재 Vitest UTF-8 출력에서 panic 할 수 있어 tests 래핑은 우회합니다.${NC}"
    "$@"
    return
  fi

  case "$RTK_MODE" in
    proxy)
      rtk proxy "$@"
      ;;
    *)
      echo -e "${RED}❌ 지원하지 않는 RTK_MODE: ${RTK_MODE}${NC}"
      exit 1
      ;;
  esac
}

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h)
      print_usage
      exit 0
      ;;
    --print-env)
      PRINT_ENV=true
      SKIP_CHECK=true
      shift
      ;;
    --check)
      CHECK_ONLY=true
      shift
      ;;
    --no-check)
      SKIP_CHECK=true
      shift
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

ensure_config_file
load_config

if [ "$SKIP_CHECK" = false ]; then
  check_rtk
fi

if [ "$PRINT_ENV" = true ]; then
  echo "export RTK_ENABLED=\"$RTK_ENABLED\""
  echo "export RTK_MODE=\"$RTK_MODE\""
fi

if [ "$CHECK_ONLY" = true ]; then
  echo -e "${GREEN}✅ RTK 설정 확인 완료${NC}"
  exit 0
fi

if [ $# -gt 0 ]; then
  echo -e "${BLUE}▶ RTK 실행: $*${NC}"
  run_command "$@"
  exit $?
fi

echo -e "${GREEN}다음 중 하나를 실행하세요:${NC}"
echo "  bash scripts/setup-rtk.sh -- bash scripts/test.sh"
echo "  npm run test:rtk"

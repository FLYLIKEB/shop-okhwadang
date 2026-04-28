#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$PROJECT_ROOT/scripts/venv"
CRG_BIN="$VENV_DIR/bin/code-review-graph"
ACTION="${1:-detect-changes}"

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/review-graph.sh
  bash scripts/review-graph.sh build
  bash scripts/review-graph.sh status
  bash scripts/review-graph.sh detect-changes
  bash scripts/review-graph.sh install --platform claude-code
EOF
}

ensure_crg() {
  if [ -x "$CRG_BIN" ]; then
    return 0
  fi

  echo -e "${RED}❌ code-review-graph가 scripts/venv에 설치되어 있지 않습니다.${NC}"
  echo -e "${YELLOW}   설치: scripts/venv/bin/pip install code-review-graph${NC}"
  exit 1
}

ensure_graph() {
  if [ -d "$PROJECT_ROOT/.code-review-graph" ]; then
    return 0
  fi

  echo -e "${BLUE}▶ code-review-graph 초기 빌드 실행...${NC}"
  "$CRG_BIN" build > /tmp/code-review-graph-build.log 2>&1
}

run_action() {
  case "$ACTION" in
    -h|--help|help)
      print_usage
      ;;
    build)
      "$CRG_BIN" build
      ;;
    status)
      "$CRG_BIN" status
      ;;
    install)
      shift
      "$CRG_BIN" install "$@"
      ;;
    detect-changes)
      ensure_graph
      "$CRG_BIN" detect-changes
      ;;
    *)
      "$CRG_BIN" "$ACTION" "$@"
      ;;
  esac
}

ensure_crg
run_action "$@"

#!/bin/bash

# 옥화당 — 테스트 환경 정리
# 테스트 MySQL 컨테이너 종료 (volume은 tmpfs라 자동 소멸)

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

if [ -f "$BACKEND_DIR/.env" ]; then
    set -a
    source "$BACKEND_DIR/.env"
    set +a
fi

echo -e "${BLUE}🛑 테스트 MySQL 컨테이너 종료...${NC}"
cd "$BACKEND_DIR"
docker compose --profile test down mysql-test 2>/dev/null || true
cd "$PROJECT_ROOT"

echo -e "${YELLOW}⚠️  잔여 jest/vitest 워커 정리...${NC}"
pkill -f "shop-okhwadang.*jest" 2>/dev/null || true
pkill -f "shop-okhwadang.*vitest" 2>/dev/null || true

echo -e "${GREEN}✅ 테스트 환경 정리 완료${NC}"

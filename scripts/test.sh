#!/bin/bash

# 옥화당 — 통합 테스트 러너
# 사용법:
#   bash scripts/test.sh              # 프론트 + 백엔드 unit (기본)
#   bash scripts/test.sh frontend     # 프론트만
#   bash scripts/test.sh backend      # 백엔드 unit만
#   bash scripts/test.sh e2e          # 백엔드 e2e (test MySQL 자동 기동)
#   bash scripts/test.sh all          # frontend + backend unit + e2e
#
# 필요 시 Docker Desktop 자동 기동, 테스트 MySQL 컨테이너 (port 3308) 기동/헬스체크 대기.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

MODE="${1:-default}"

if [ -f "$BACKEND_DIR/.env" ]; then
    set -a
    source "$BACKEND_DIR/.env"
    set +a
fi

ensure_docker() {
    if ! command -v docker > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker 미설치${NC}"
        exit 1
    fi
    if docker info > /dev/null 2>&1; then
        return 0
    fi
    if [[ "$OSTYPE" == "darwin"* ]] && [ ! -d "/Applications/Docker.app" ]; then
        echo -e "${RED}❌ Docker Desktop 미설치${NC}"
        echo -e "${YELLOW}   설치: https://www.docker.com/products/docker-desktop/${NC}"
        exit 1
    fi
    DOCKER_BOOT_TIMEOUT="${DOCKER_BOOT_TIMEOUT:-120}"
    if ! [[ "$DOCKER_BOOT_TIMEOUT" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ DOCKER_BOOT_TIMEOUT 값이 정수가 아닙니다: ${DOCKER_BOOT_TIMEOUT}${NC}"
        exit 1
    fi
    echo -e "${YELLOW}⚠️  Docker Desktop 시작 중...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -ga Docker 2>/dev/null || true
    else
        echo -e "${YELLOW}   Docker daemon 을 수동으로 시작해주세요 (예: sudo systemctl start docker)${NC}"
    fi
    echo -e "${YELLOW}⏳ Docker Desktop 시작 대기 (최대 ${DOCKER_BOOT_TIMEOUT}초)...${NC}"
    for ((i=1; i<=DOCKER_BOOT_TIMEOUT; i++)); do
        if docker info > /dev/null 2>&1; then
            break
        fi
        if [ $((i % 10)) -eq 0 ]; then
            echo -e "${YELLOW}   ⏳ Docker Desktop 부팅 중... (${i}s 경과)${NC}"
        fi
        sleep 1
    done
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker Desktop 시작 실패 (${DOCKER_BOOT_TIMEOUT}초 경과)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker Desktop 준비 완료${NC}"
}

start_test_db() {
    ensure_docker
    echo -e "${BLUE}📦 테스트 MySQL 컨테이너 시작 (port 3308)...${NC}"
    cd "$BACKEND_DIR"
    docker compose --profile test up -d --wait mysql-test 2>&1 | tail -5
    echo -e "${GREEN}✅ 테스트 MySQL 준비 완료${NC}"
    cd "$PROJECT_ROOT"
}

run_frontend() {
    echo -e "${BLUE}🎨 프론트엔드 vitest 실행...${NC}"
    cd "$PROJECT_ROOT"
    npm run test:run
    echo -e "${GREEN}✅ 프론트엔드 테스트 통과${NC}"
}

run_backend_unit() {
    echo -e "${BLUE}🔧 백엔드 unit 테스트 실행...${NC}"
    cd "$BACKEND_DIR"
    npm run build
    npm run test
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✅ 백엔드 unit 테스트 통과${NC}"
}

run_backend_e2e() {
    start_test_db
    cd "$BACKEND_DIR"

    if [ -z "${TEST_DATABASE_URL:-}" ]; then
        if [ -n "${MYSQL_ROOT_PASSWORD:-}" ]; then
            TEST_DATABASE_URL="mysql://root:${MYSQL_ROOT_PASSWORD}@127.0.0.1:3308/commerce_test"
            export TEST_DATABASE_URL
            echo -e "${YELLOW}⚠️  TEST_DATABASE_URL 미설정 → 기본값(127.0.0.1:3308/commerce_test) 사용${NC}"
        else
            echo -e "${RED}❌ TEST_DATABASE_URL 또는 MYSQL_ROOT_PASSWORD가 필요합니다.${NC}"
            echo -e "${YELLOW}   backend/.env 에 TEST_DATABASE_URL 설정을 권장합니다.${NC}"
            exit 1
        fi
    fi

    echo -e "${BLUE}🧱 테스트 DB 마이그레이션 적용...${NC}"
    DATABASE_URL="${TEST_DATABASE_URL}" NODE_ENV=test npm run migration:run

    echo -e "${BLUE}🔧 백엔드 E2E 테스트 실행...${NC}"
    npm run test:e2e
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}✅ 백엔드 E2E 테스트 통과${NC}"
}

case "$MODE" in
    frontend|fe)
        run_frontend
        ;;
    backend|be|unit)
        run_backend_unit
        ;;
    e2e)
        run_backend_e2e
        ;;
    all)
        run_frontend
        run_backend_unit
        run_backend_e2e
        ;;
    default)
        run_frontend
        run_backend_unit
        ;;
    *)
        echo -e "${RED}❌ 알 수 없는 모드: $MODE${NC}"
        echo "사용법: bash scripts/test.sh [frontend|backend|e2e|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 모든 테스트 완료 (mode: $MODE)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

#!/bin/bash

# 로컬 개발 환경 전체 시작 스크립트
# Docker(MySQL), 백엔드(NestJS), 프론트엔드(Next.js)를 한 번에 실행합니다.
# 캐시는 백엔드 프로세스의 in-memory 캐시를 사용하므로 Redis는 더이상 필요하지 않습니다.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

if [ -f "$BACKEND_DIR/.env" ]; then
    set -a
    source "$BACKEND_DIR/.env"
    set +a
fi

if [ -z "$LOCAL_DATABASE_URL" ] && [ -n "$DATABASE_URL" ]; then
    LOCAL_DATABASE_URL="${DATABASE_URL/_test/}"
    export LOCAL_DATABASE_URL
fi

echo -e "${BLUE}🚀 옥화당 — 로컬 개발 환경 시작 중...${NC}"
echo ""

bash "$PROJECT_ROOT/scripts/stop-local.sh" 2>/dev/null || true

# 다른 워크트리/세션에서 남은 좀비 nest/next 프로세스 정리
STALE_NEST=$(pgrep -f "shop-okhwadang.*nest start" 2>/dev/null | wc -l | tr -d ' ')
if [ "$STALE_NEST" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  좀비 nest 프로세스 ${STALE_NEST}개 정리 중...${NC}"
    pkill -9 -f "shop-okhwadang.*nest start" 2>/dev/null || true
    sleep 0.5
fi

echo ""

USE_LOCAL_DB=$(echo "${LOCAL_DATABASE_URL:-}" | grep -qE "localhost:330[67]|127\.0\.0\.1:330[67]" && echo "yes" || echo "no")

# Docker Desktop 확인/시작
# DOCKER_BOOT_TIMEOUT 환경변수로 대기 시간 override 가능 (기본 120초)
if [ "$USE_LOCAL_DB" = "yes" ] && command -v docker > /dev/null 2>&1; then
    if ! docker info > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker Desktop 시작 중...${NC}"
        if ! open -ga Docker 2>&1; then
            echo -e "${RED}❌ Docker Desktop 실행 실패 — 미설치 또는 권한 문제일 수 있습니다.${NC}"
            echo -e "${YELLOW}   설치: https://www.docker.com/products/docker-desktop/${NC}"
            exit 1
        fi
        DOCKER_BOOT_TIMEOUT="${DOCKER_BOOT_TIMEOUT:-120}"
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
        # 타임아웃 후에도 한 번 더 시도 (race condition 방어)
        if ! docker info > /dev/null 2>&1; then
            echo -e "${RED}❌ Docker Desktop 시작 실패 (${DOCKER_BOOT_TIMEOUT}초 경과)${NC}"
            echo -e "${YELLOW}   타임아웃 상향: DOCKER_BOOT_TIMEOUT=180 bash scripts/start-local.sh${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ Docker Desktop 준비 완료${NC}"
    fi
fi

# Docker 컨테이너 시작 (--wait로 준비 완료까지 대기)
if [ "$USE_LOCAL_DB" = "yes" ]; then
    echo -e "${BLUE}📦 Docker 컨테이너 시작...${NC}"
    cd "$BACKEND_DIR"
    docker compose up -d --wait 2>&1 | tail -2
    echo -e "${GREEN}✅ MySQL 준비 완료${NC}"
    echo ""

    # 마이그레이션
    echo -e "${BLUE}📦 DB 마이그레이션...${NC}"
    export NODE_ENV=development
    npm run migration:run 2>/dev/null && echo -e "${GREEN}✅ 마이그레이션 완료${NC}" || echo -e "${YELLOW}⚠️  마이그레이션 건너뜀${NC}"
    cd "$PROJECT_ROOT"
    echo ""
else
    # SSH 터널
    if [ -f "$BACKEND_DIR/scripts/start-ssh-tunnel.sh" ] && [ -n "${SSH_TUNNEL_REMOTE_HOST:-}" ]; then
        echo -e "${BLUE}🔗 SSH 터널 시작...${NC}"
        cd "$BACKEND_DIR"
        bash scripts/start-ssh-tunnel.sh 2>/dev/null || true
        cd "$PROJECT_ROOT"
    fi
fi

# 백엔드 + 프론트엔드 병렬 시작
echo -e "${BLUE}🔧 백엔드 + 🎨 프론트엔드 시작...${NC}"
export NODE_ENV=development

cd "$BACKEND_DIR"
npm run start:dev > /tmp/commerce-backend.log 2>&1 &
BACKEND_PID=$!

cd "$PROJECT_ROOT"
npm run dev > /tmp/commerce-frontend.log 2>&1 &
FRONTEND_PID=$!

# 백엔드 health check
echo -e "${YELLOW}⏳ 백엔드 준비 대기...${NC}"
for i in {1..30}; do
    curl -s http://localhost:3000/api/health > /dev/null 2>&1 && break
    sleep 1
done
curl -s http://localhost:3000/api/health > /dev/null 2>&1 && echo -e "${GREEN}✅ 백엔드 준비 완료${NC}" || echo -e "${YELLOW}⚠️  백엔드 시작 중...${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 옥화당 — 모든 서버가 실행되었습니다!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📍 접속:${NC}"
echo -e "   프론트엔드: ${GREEN}http://localhost:5173${NC}"
echo -e "   백엔드:     ${GREEN}http://localhost:3000/api${NC}"
if [ "$USE_LOCAL_DB" = "yes" ]; then
    echo -e "   MySQL:      ${GREEN}127.0.0.1:3307${NC}"
fi
echo ""
echo -e "${BLUE}📋 PID: 백엔드=$BACKEND_PID / 프론트엔드=$FRONTEND_PID${NC}"
echo -e "${BLUE}🛑 종료: ./scripts/stop-local.sh${NC}"
echo ""
echo -e "${BLUE}📝 로그:${NC}"
echo -e "   백엔드:   ${GREEN}/tmp/commerce-backend.log${NC}"
echo -e "   프론트엔드: ${GREEN}/tmp/commerce-frontend.log${NC}"
echo -e "   (실시간 확인: tail -f /tmp/commerce-backend.log)${NC}"
echo ""

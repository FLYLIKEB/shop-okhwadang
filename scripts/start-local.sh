#!/bin/bash

# 로컬 개발 환경 전체 시작 스크립트
# Docker(MySQL, Redis), 백엔드(NestJS), 프론트엔드(Next.js)를 한 번에 실행합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 프로젝트 루트 디렉토리
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# 백엔드 환경 변수 로드
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

# ──────────────────────────────────────────────
# 1. 기존 서버 종료 (stop-local.sh 사용)
# ──────────────────────────────────────────────
bash "$PROJECT_ROOT/scripts/stop-local.sh" 2>/dev/null || true
echo ""

# ──────────────────────────────────────────────
# 2. Docker 컨테이너 시작 (MySQL + Redis)
# ──────────────────────────────────────────────
if echo "${LOCAL_DATABASE_URL:-}" | grep -qE "localhost:330[67]|127\.0\.0\.1:330[67]"; then
    echo -e "${BLUE}📦 Docker 컨테이너 시작 중 (MySQL + Redis)...${NC}"
    if command -v docker > /dev/null 2>&1; then
        cd "$BACKEND_DIR"
        docker compose up -d 2>&1 | tail -3
        cd "$PROJECT_ROOT"

        # MySQL 준비 대기
        echo -e "${YELLOW}⏳ MySQL 준비 대기 중...${NC}"
        for i in {1..30}; do
            MYSQL_CONTAINER=$(docker compose -f "$BACKEND_DIR/docker-compose.yml" ps -q mysql 2>/dev/null)
            if [ -n "$MYSQL_CONTAINER" ] && docker exec "$MYSQL_CONTAINER" mysqladmin ping -h localhost --silent > /dev/null 2>&1; then
                echo -e "${GREEN}✅ MySQL 준비 완료${NC}"
                break
            fi
            if [ $i -eq 30 ]; then
                echo -e "${RED}❌ MySQL 시작 시간 초과 (30초)${NC}"
                echo "   확인: docker compose -f $BACKEND_DIR/docker-compose.yml logs mysql"
                exit 1
            fi
            sleep 1
        done
        echo ""
    else
        echo -e "${RED}❌ Docker가 설치되어 있지 않습니다.${NC}"
        echo "   설치: brew install --cask docker"
        exit 1
    fi
else
    # 원격 DB 사용 시 SSH 터널
    echo -e "${BLUE}🔗 SSH 터널 시작 중...${NC}"
    if [ -f "$BACKEND_DIR/scripts/start-ssh-tunnel.sh" ] && [ -n "${SSH_TUNNEL_REMOTE_HOST:-}" ]; then
        cd "$BACKEND_DIR"
        bash scripts/start-ssh-tunnel.sh || echo -e "${YELLOW}⚠️  SSH 터널 시작 실패 (계속 진행)${NC}"
        cd "$PROJECT_ROOT"
    else
        echo -e "${YELLOW}⚠️  SSH 터널 건너뜀 (로컬 DB 사용 또는 SSH_TUNNEL_REMOTE_HOST 미설정)${NC}"
    fi
    echo ""
fi

# ──────────────────────────────────────────────
# 3. DB 마이그레이션 실행
# ──────────────────────────────────────────────
if echo "${LOCAL_DATABASE_URL:-}" | grep -qE "localhost:330[67]|127\.0\.0\.1:330[67]"; then
    echo -e "${BLUE}📦 DB 마이그레이션 실행 중...${NC}"
    cd "$BACKEND_DIR"
    export NODE_ENV=development
    if npm run migration:run 2>/dev/null; then
        echo -e "${GREEN}✅ 마이그레이션 완료${NC}"
    else
        echo -e "${YELLOW}⚠️  마이그레이션 건너뜀 (이미 적용됐거나 마이그레이션 없음)${NC}"
    fi
    cd "$PROJECT_ROOT"
    echo ""
fi

# ──────────────────────────────────────────────
# 4. 백엔드 서버 시작 (NestJS :3000)
# ──────────────────────────────────────────────
echo -e "${BLUE}🔧 백엔드 서버 시작 중 (NestJS :3000)...${NC}"
cd "$BACKEND_DIR"
export NODE_ENV=development
npm run start:dev > /tmp/commerce-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ 백엔드 서버 시작됨 (PID: $BACKEND_PID)${NC}"
echo ""

# 백엔드 Health Check 대기
echo -e "${YELLOW}⏳ 백엔드 서버 준비 대기 중...${NC}"
for i in {1..60}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 백엔드 서버 준비 완료${NC}"
        echo ""
        break
    fi
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}❌ 백엔드 서버가 비정상 종료되었습니다.${NC}"
        echo "   로그 확인: tail -f /tmp/commerce-backend.log"
        exit 1
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}❌ 백엔드 서버 시작 시간 초과 (60초)${NC}"
        echo "   로그 확인: tail -f /tmp/commerce-backend.log"
        exit 1
    fi
    sleep 1
done

# ──────────────────────────────────────────────
# 5. 프론트엔드 서버 시작 (Next.js :5173)
# ──────────────────────────────────────────────
echo -e "${BLUE}🎨 프론트엔드 서버 시작 중 (Next.js :5173)...${NC}"
cd "$PROJECT_ROOT"
export NODE_ENV=development
npm run dev > /tmp/commerce-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ 프론트엔드 서버 시작됨 (PID: $FRONTEND_PID)${NC}"
echo ""

# 프론트엔드 준비 대기
echo -e "${YELLOW}⏳ 프론트엔드 서버 준비 대기 중...${NC}"
sleep 3
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 프론트엔드 서버 준비 완료${NC}"
        echo ""
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  프론트엔드 응답 대기 중... (시작 중일 수 있습니다)${NC}"
        echo ""
    fi
    sleep 1
done

# ──────────────────────────────────────────────
# 6. 최종 상태 출력
# ──────────────────────────────────────────────
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 옥화당 — 모든 서버가 실행되었습니다!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📍 접속 정보:${NC}"
echo -e "   프론트엔드:   ${GREEN}http://localhost:5173${NC}"
echo -e "   백엔드 API:   ${GREEN}http://localhost:3000/api${NC}"
echo -e "   Health Check: ${GREEN}http://localhost:3000/api/health${NC}"
echo -e "   프록시 경유:  ${GREEN}http://localhost:5173/api/health${NC}"
if echo "${LOCAL_DATABASE_URL:-}" | grep -qE "localhost:330[67]|127\.0\.0\.1:330[67]"; then
    echo -e "   MySQL:        ${GREEN}127.0.0.1:3307/commerce${NC}"
    echo -e "   Redis:        ${GREEN}127.0.0.1:6380${NC}"
fi
echo ""
echo -e "${BLUE}📋 프로세스:${NC}"
echo -e "   백엔드 PID:     ${YELLOW}$BACKEND_PID${NC}"
echo -e "   프론트엔드 PID: ${YELLOW}$FRONTEND_PID${NC}"
echo ""
echo -e "${BLUE}📝 로그:${NC}"
echo -e "   백엔드:     ${YELLOW}tail -f /tmp/commerce-backend.log${NC}"
echo -e "   프론트엔드: ${YELLOW}tail -f /tmp/commerce-frontend.log${NC}"
echo ""
echo -e "${BLUE}🛑 종료:${NC}"
echo -e "   ${YELLOW}./scripts/stop-local.sh${NC}"
echo ""

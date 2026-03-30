#!/bin/bash

# 로컬 개발 환경 종료 스크립트
# 백엔드, 프론트엔드, SSH 터널을 종료합니다.
# Docker 컨테이너는 유지합니다 (별도로 docker compose down 필요).

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo -e "${BLUE}🛑 옥화당 — 로컬 서버 종료 중...${NC}"
echo ""

# 백엔드 종료 (포트 3000)
echo -e "${YELLOW}백엔드 서버 종료 중...${NC}"
if command -v lsof > /dev/null 2>&1; then
    BACKEND_PIDS=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$BACKEND_PIDS" ]; then
        echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✅ 백엔드 서버 종료됨${NC}"
    else
        echo -e "${YELLOW}⚠️  백엔드 서버가 실행 중이 아닙니다${NC}"
    fi
else
    pkill -f "nest start" 2>/dev/null && echo -e "${GREEN}✅ 백엔드 서버 종료됨${NC}" || echo -e "${YELLOW}⚠️  백엔드 서버가 실행 중이 아닙니다${NC}"
fi

# 프론트엔드 종료 (포트 5173)
echo -e "${YELLOW}프론트엔드 서버 종료 중...${NC}"
if command -v lsof > /dev/null 2>&1; then
    FRONTEND_PIDS=$(lsof -ti:5173 2>/dev/null || true)
    if [ -n "$FRONTEND_PIDS" ]; then
        echo "$FRONTEND_PIDS" | xargs kill -9 2>/dev/null || true
        echo -e "${GREEN}✅ 프론트엔드 서버 종료됨${NC}"
    else
        echo -e "${YELLOW}⚠️  프론트엔드 서버가 실행 중이 아닙니다${NC}"
    fi
else
    pkill -f "next dev" 2>/dev/null && echo -e "${GREEN}✅ 프론트엔드 서버 종료됨${NC}" || echo -e "${YELLOW}⚠️  프론트엔드 서버가 실행 중이 아닙니다${NC}"
fi

# SSH 터널 종료 (있는 경우)
if [ -f "$BACKEND_DIR/scripts/stop-ssh-tunnel.sh" ]; then
    echo -e "${YELLOW}SSH 터널 종료 중...${NC}"
    cd "$BACKEND_DIR"
    bash scripts/stop-ssh-tunnel.sh 2>/dev/null || true
    echo -e "${GREEN}✅ SSH 터널 종료됨${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 모든 서버가 종료되었습니다.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}💡 Docker 컨테이너는 유지됩니다.${NC}"
echo -e "   종료: ${YELLOW}cd backend && docker compose down${NC}"
echo -e "   초기화: ${YELLOW}cd backend && docker compose down -v${NC}"
echo ""

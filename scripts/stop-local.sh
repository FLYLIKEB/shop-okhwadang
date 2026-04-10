#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo -e "${BLUE}🛑 옥화당 — 로컬 서버 종료 중...${NC}"
echo ""

stop_backend() {
    # 1) 포트 점유 프로세스 종료
    if command -v lsof > /dev/null 2>&1; then
        BACKEND_PIDS=$(lsof -ti:3000 2>/dev/null || true)
        [ -n "$BACKEND_PIDS" ] && echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null || true
    fi
    # 2) nest --watch 좀비 프로세스 전부 종료 (포트 미점유 자식 포함)
    pkill -f "nest start" 2>/dev/null || true
    sleep 0.5
    # SIGKILL로 잔여 프로세스 확실히 제거
    pkill -9 -f "nest start" 2>/dev/null || true
}

stop_frontend() {
    if command -v lsof > /dev/null 2>&1; then
        FRONTEND_PIDS=$(lsof -ti:5173 2>/dev/null || true)
        [ -n "$FRONTEND_PIDS" ] && echo "$FRONTEND_PIDS" | xargs kill -9 2>/dev/null || true
    fi
    pkill -f "next dev" 2>/dev/null || true
    sleep 0.5
    pkill -9 -f "next dev" 2>/dev/null || true
}

stop_ssh_tunnel() {
    [ -f "$BACKEND_DIR/scripts/stop-ssh-tunnel.sh" ] && bash "$BACKEND_DIR/scripts/stop-ssh-tunnel.sh" 2>/dev/null || true
}

echo -e "${YELLOW}백엔드 + 프론트엔드 + SSH 터널 종료 중...${NC}"
stop_backend &
stop_frontend &
stop_ssh_tunnel &
wait

echo -e "${GREEN}✅ 모든 서버 종료됨${NC}"
echo ""
echo -e "${BLUE}💡 Docker 컨테이너는 유지됩니다.${NC}"
echo -e "   종료: ${YELLOW}cd backend && docker compose down${NC}"
echo ""

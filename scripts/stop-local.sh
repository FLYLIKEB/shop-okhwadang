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
    if command -v lsof > /dev/null 2>&1; then
        BACKEND_PIDS=$(lsof -ti:3000 2>/dev/null || true)
        [ -n "$BACKEND_PIDS" ] && echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null || true
    else
        pkill -f "nest start" 2>/dev/null || true
    fi
}

stop_frontend() {
    if command -v lsof > /dev/null 2>&1; then
        FRONTEND_PIDS=$(lsof -ti:5173 2>/dev/null || true)
        [ -n "$FRONTEND_PIDS" ] && echo "$FRONTEND_PIDS" | xargs kill -9 2>/dev/null || true
    else
        pkill -f "next dev" 2>/dev/null || true
    fi
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

#!/bin/bash
# SSH 터널 종료

set -e

SSH_TUNNEL_LOCAL_PORT=${SSH_TUNNEL_LOCAL_PORT:-3307}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

EXISTING_PID=$(lsof -ti:$SSH_TUNNEL_LOCAL_PORT 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
    echo -e "${YELLOW}⚠️  터널 종료 중 (PID: $EXISTING_PID)${NC}"
    kill $EXISTING_PID 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✅ 터널 종료 완료${NC}"
else
    echo -e "${YELLOW}⚠️  실행 중인 터널이 없습니다${NC}"
fi

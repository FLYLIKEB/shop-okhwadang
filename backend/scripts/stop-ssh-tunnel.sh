#!/bin/bash
# SSH 터널 종료

set -e

SSH_TUNNEL_LOCAL_PORT=${SSH_TUNNEL_LOCAL_PORT:-3307}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

find_ssh_tunnel_pids() {
    local candidates pid cmd
    candidates=$(lsof -nP -tiTCP:${SSH_TUNNEL_LOCAL_PORT} -sTCP:LISTEN 2>/dev/null || true)
    for pid in $candidates; do
        cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
        if [[ "$cmd" == *"ssh "* ]] && [[ "$cmd" == *"-L ${SSH_TUNNEL_LOCAL_PORT}:"* ]]; then
            echo "$pid"
        fi
    done
}

EXISTING_PIDS=$(find_ssh_tunnel_pids || true)
if [ -n "$EXISTING_PIDS" ]; then
    echo -e "${YELLOW}⚠️  SSH 터널 종료 중 (PID: $(echo "$EXISTING_PIDS" | tr '\n' ' ' | xargs))${NC}"
    while IFS= read -r pid; do
        [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    done <<< "$EXISTING_PIDS"
    sleep 1
    echo -e "${GREEN}✅ SSH 터널 종료 완료${NC}"
else
    echo -e "${YELLOW}⚠️  종료할 SSH 터널이 없습니다 (port ${SSH_TUNNEL_LOCAL_PORT})${NC}"
fi

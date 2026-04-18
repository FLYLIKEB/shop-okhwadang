#!/bin/bash
# SSH 터널: 로컬 → AWS Lightsail MySQL 접속
# 사용법: backend/.env에서 SSH_TUNNEL_ENABLED=true, SSH_TUNNEL_REMOTE_HOST=<EC2_IP> 설정 후 실행

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV_FILE="$PROJECT_ROOT/backend/.env"

load_env() {
    if [ -f "$ENV_FILE" ]; then
        export SSH_TUNNEL_ENABLED=$(grep -v '^#' "$ENV_FILE" | grep 'SSH_TUNNEL_ENABLED=' | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        export SSH_TUNNEL_LOCAL_PORT=$(grep -v '^#' "$ENV_FILE" | grep 'SSH_TUNNEL_LOCAL_PORT=' | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        export SSH_TUNNEL_REMOTE_HOST=$(grep -v '^#' "$ENV_FILE" | grep 'SSH_TUNNEL_REMOTE_HOST=' | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        export SSH_TUNNEL_REMOTE_PORT=$(grep -v '^#' "$ENV_FILE" | grep 'SSH_TUNNEL_REMOTE_PORT=' | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        export SSH_KEY_PATH=$(grep -v '^#' "$ENV_FILE" | grep 'SSH_KEY_PATH=' | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        export LIGHTSAIL_DB_HOST=$(grep -v '^#' "$ENV_FILE" | grep 'LIGHTSAIL_DB_HOST=' | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    fi
}

load_env

SSH_TUNNEL_LOCAL_PORT=${SSH_TUNNEL_LOCAL_PORT:-3307}
SSH_TUNNEL_REMOTE_PORT=${SSH_TUNNEL_REMOTE_PORT:-3306}
SSH_KEY_PATH=${SSH_KEY_PATH:-$HOME/.ssh/okhwadang.pem}
# Lightsail DB 엔드포인트 (미설정 시 EC2 localhost로 폴백)
LIGHTSAIL_DB_HOST=${LIGHTSAIL_DB_HOST:-localhost}

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

if [ "$SSH_TUNNEL_ENABLED" != "true" ]; then
    echo -e "${YELLOW}⚠️  SSH_TUNNEL_ENABLED=true 로 설정되지 않았습니다${NC}"
    exit 1
fi

if [ -z "$SSH_TUNNEL_REMOTE_HOST" ]; then
    echo -e "${RED}❌ SSH_TUNNEL_REMOTE_HOST가 설정되지 않았습니다${NC}"
    exit 1
fi

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ SSH 키 파일이 존재하지 않습니다: $SSH_KEY_PATH${NC}"
    exit 1
fi

EXISTING_PIDS=$(find_ssh_tunnel_pids || true)
if [ -n "$EXISTING_PIDS" ]; then
    echo -e "${YELLOW}⚠️  기존 SSH 터널 종료 중 (PID: $(echo "$EXISTING_PIDS" | tr '\n' ' ' | xargs))${NC}"
    while IFS= read -r pid; do
        [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    done <<< "$EXISTING_PIDS"
    sleep 1
fi

PORT_PIDS=$(lsof -nP -tiTCP:${SSH_TUNNEL_LOCAL_PORT} -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$PORT_PIDS" ]; then
    echo -e "${RED}❌ 포트 ${SSH_TUNNEL_LOCAL_PORT} 이(가) 이미 다른 프로세스에서 사용 중입니다.${NC}"
    echo -e "${YELLOW}   SSH 터널이 아닌 프로세스는 자동 종료하지 않습니다. 점유 프로세스 확인 후 다시 시도하세요.${NC}"
    while IFS= read -r pid; do
        [ -z "$pid" ] && continue
        cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
        echo -e "${YELLOW}   - PID ${pid}: ${cmd}${NC}"
    done <<< "$PORT_PIDS"
    exit 1
fi

echo -e "${BLUE}🔐 터널 시작: localhost:${SSH_TUNNEL_LOCAL_PORT} → ${SSH_TUNNEL_REMOTE_HOST}:${SSH_TUNNEL_REMOTE_PORT}${NC}"

ssh -f -N \
    -L "${SSH_TUNNEL_LOCAL_PORT}:${LIGHTSAIL_DB_HOST}:${SSH_TUNNEL_REMOTE_PORT}" \
    -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    ubuntu@${SSH_TUNNEL_REMOTE_HOST}

sleep 2

NEW_PID=$(lsof -ti:$SSH_TUNNEL_LOCAL_PORT 2>/dev/null || true)
if [ -n "$NEW_PID" ]; then
    echo -e "${GREEN}✅ 터널 시작 완료 (PID: $NEW_PID, Port: ${SSH_TUNNEL_LOCAL_PORT})${NC}"
    echo -e "${GREEN}   접속: mysql -h 127.0.0.1 -P ${SSH_TUNNEL_LOCAL_PORT} -u <user> -p<pass> commerce${NC}"
else
    echo -e "${RED}❌ 터널 시작 실패${NC}"
    exit 1
fi

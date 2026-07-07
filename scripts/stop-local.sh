#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FULL_CLEANUP="no"

usage() {
    cat <<'USAGE'
Usage: bash scripts/stop-local.sh [--all]

Options:
  --all   Stop app servers and fully remove local okhwadang Docker/test resources.
          This also clears okhwadang MySQL listeners on 3307/3308 and stale
          dev/test processes from sibling okhwadang worktrees.

Default mode stops backend/frontend/test workers/SSH tunnel but keeps Docker
containers running for faster next startup.
USAGE
}

for arg in "$@"; do
    case "$arg" in
        --all)
            FULL_CLEANUP="yes"
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 알 수 없는 옵션: $arg${NC}"
            usage
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🛑 옥화당 — 로컬 서버 종료 중...${NC}"
echo ""

kill_matching_processes() {
    local signal="$1"
    shift

    for pattern in "$@"; do
        pkill "-$signal" -f "$pattern" 2>/dev/null || true
    done
}

stop_backend() {
    # 1) 포트 점유 프로세스 종료
    if command -v lsof > /dev/null 2>&1; then
        BACKEND_PIDS=$(lsof -ti:3000 2>/dev/null || true)
        [ -n "$BACKEND_PIDS" ] && echo "$BACKEND_PIDS" | xargs kill -9 2>/dev/null || true
    fi
    # 2) nest --watch 좀비 프로세스 전부 종료 (포트 미점유 자식 포함)
    kill_matching_processes TERM "shop-okhwadang.*/node_modules/.bin/nest start" "nest start"
    sleep 0.5
    # SIGKILL로 잔여 프로세스 확실히 제거
    kill_matching_processes KILL "shop-okhwadang.*/node_modules/.bin/nest start" "nest start"
}

stop_frontend() {
    if command -v lsof > /dev/null 2>&1; then
        FRONTEND_PIDS=$(lsof -ti:5173 2>/dev/null || true)
        [ -n "$FRONTEND_PIDS" ] && echo "$FRONTEND_PIDS" | xargs kill -9 2>/dev/null || true
    fi
    kill_matching_processes TERM "shop-okhwadang.*/node_modules/.bin/next dev" "next dev"
    sleep 0.5
    kill_matching_processes KILL "shop-okhwadang.*/node_modules/.bin/next dev" "next dev"
}

stop_vitest_workers() {
    # 다른 워크트리에서 남아 있는 vitest worker 정리 (OOM 방지)
    kill_matching_processes TERM \
        "shop-okhwadang.*vitest" \
        "shop-okhwadang.*/node_modules/vitest/dist/workers/forks.js"
    sleep 0.5
    kill_matching_processes KILL \
        "shop-okhwadang.*vitest" \
        "shop-okhwadang.*/node_modules/vitest/dist/workers/forks.js"
}

stop_stale_worktree_processes() {
    # Explicit full cleanup only: stop long-running one-off commands that can
    # keep CPU busy even after their owning terminal/session is gone.
    kill_matching_processes TERM \
        "shop-okhwadang.*/node_modules/.bin/typeorm-ts-node-commonjs migration" \
        "shop-okhwadang.*/node_modules/.bin/tsx" \
        "shop-okhwadang.*/node_modules/.bin/ts-node"
    sleep 0.5
    kill_matching_processes KILL \
        "shop-okhwadang.*/node_modules/.bin/typeorm-ts-node-commonjs migration" \
        "shop-okhwadang.*/node_modules/.bin/tsx" \
        "shop-okhwadang.*/node_modules/.bin/ts-node"
}

stop_ssh_tunnel() {
    [ -f "$BACKEND_DIR/scripts/stop-ssh-tunnel.sh" ] && bash "$BACKEND_DIR/scripts/stop-ssh-tunnel.sh" 2>/dev/null || true
}

stop_docker_resources() {
    if ! command -v docker > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker 명령을 찾을 수 없어 Docker 정리를 건너뜁니다.${NC}"
        return 0
    fi

    if ! docker info > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker daemon 이 실행 중이 아니므로 Docker 정리를 건너뜁니다.${NC}"
        return 0
    fi

    echo -e "${YELLOW}Docker MySQL 컨테이너(3307/3308) 종료 중...${NC}"
    (
        cd "$BACKEND_DIR"
        docker compose --profile test down --remove-orphans 2>/dev/null || true
    )

    # Compose profiles or interrupted runs can leave named containers behind.
    docker rm -f okhwadang-mysql okhwadang-mysql-test 2>/dev/null || true
}

echo -e "${YELLOW}백엔드 + 프론트엔드 + Vitest + SSH 터널 종료 중...${NC}"
if command -v tmux > /dev/null 2>&1; then
    tmux kill-session -t okhwadang-backend 2>/dev/null || true
    tmux kill-session -t okhwadang-frontend 2>/dev/null || true
fi
stop_backend &
stop_frontend &
stop_vitest_workers &
stop_ssh_tunnel &
wait

if [ "$FULL_CLEANUP" = "yes" ]; then
    stop_stale_worktree_processes
    stop_docker_resources
fi

echo -e "${GREEN}✅ 모든 서버 종료됨${NC}"
echo ""
if [ "$FULL_CLEANUP" = "yes" ]; then
    echo -e "${BLUE}💡 전체 정리 모드로 Docker 컨테이너까지 종료했습니다.${NC}"
else
    echo -e "${BLUE}💡 Docker 컨테이너는 유지됩니다.${NC}"
    echo -e "   전체 정리: ${YELLOW}bash scripts/stop-local.sh --all${NC}"
fi
echo ""

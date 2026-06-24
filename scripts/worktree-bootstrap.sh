#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
CACHE_DIR="$PROJECT_ROOT/.omx/bootstrap-cache"
SHARED_CONFIG_DIR="${OKHWADANG_DEV_CONFIG_DIR:-$HOME/.config/okhwadang/dev}"
SHARED_ROOT_DIR="$SHARED_CONFIG_DIR/root"
SHARED_BACKEND_DIR="$SHARED_CONFIG_DIR/backend"
SHARED_BACKEND_KEYS_DIR="$SHARED_BACKEND_DIR/keys"
VENV_DIR="$PROJECT_ROOT/scripts/venv"
SENTINEL_FILE="$PROJECT_ROOT/.omx/.worktree_bootstrap_done"

RUN_VERIFY="false"

while (($#)); do
  case "$1" in
    --verify)
      RUN_VERIFY="true"
      ;;
    *)
      echo -e "${RED}❌ 알 수 없는 옵션: $1${NC}"
      echo "사용법: bash scripts/worktree-bootstrap.sh [--verify]"
      exit 1
      ;;
  esac
  shift
done

mkdir -p "$CACHE_DIR" "$SHARED_ROOT_DIR" "$SHARED_BACKEND_KEYS_DIR"
chmod 700 "$SHARED_CONFIG_DIR" "$SHARED_ROOT_DIR" "$SHARED_BACKEND_DIR" "$SHARED_BACKEND_KEYS_DIR" 2>/dev/null || true

hash_file() {
  local path="$1"
  shasum -a 256 "$path" | awk '{print $1}'
}

find_origin_worktree() {
  # git worktree list에서 main worktree(첫 번째 항목) 경로를 반환
  git -C "$PROJECT_ROOT" worktree list --porcelain 2>/dev/null \
    | awk '/^worktree / { path=$2; found=1; exit } END { if (found) print path }'
}

ensure_env_file() {
  local target="$1"
  local fallback="$2"
  local shared_source="$3"

  if [ -f "$target" ]; then
    if [ ! -f "$shared_source" ]; then
      mkdir -p "$(dirname "$shared_source")"
      cp "$target" "$shared_source"
      chmod 600 "$shared_source" 2>/dev/null || true
      echo -e "${GREEN}✅ ${target#$PROJECT_ROOT/} → 공통 dev 설정에 저장했습니다.${NC}"
    fi
    return 0
  fi

  if [ -f "$shared_source" ]; then
    cp "$shared_source" "$target"
    chmod 600 "$target" 2>/dev/null || true
    echo -e "${GREEN}✅ ${target#$PROJECT_ROOT/} → 공통 dev 설정에서 복사했습니다.${NC}"
    return 0
  fi

  # 현재 워크트리가 origin이 아닌 경우, origin의 실제 .env 파일을 복사
  local origin_worktree
  origin_worktree="$(find_origin_worktree)"
  local relative_path="${target#$PROJECT_ROOT/}"
  local origin_source="$origin_worktree/$relative_path"

  if [ -n "$origin_worktree" ] && [ "$origin_worktree" != "$PROJECT_ROOT" ] && [ -f "$origin_source" ]; then
    cp "$origin_source" "$target"
    cp "$target" "$shared_source"
    chmod 600 "$target" "$shared_source" 2>/dev/null || true
    echo -e "${GREEN}✅ ${relative_path} → origin worktree에서 복사했습니다.${NC}"
    return 0
  fi

  if [ -f "$fallback" ]; then
    cp "$fallback" "$target"
    echo -e "${YELLOW}⚠️  ${relative_path} 파일이 없어 기본 예시 파일로 생성했습니다.${NC}"
  else
    echo -e "${RED}❌ ${relative_path} 파일이 없고 기본 예시 파일도 찾지 못했습니다.${NC}"
    exit 1
  fi
}

ensure_jwt_key_file() {
  local filename="$1"
  local target="$BACKEND_DIR/keys/$filename"
  local shared_source="$SHARED_BACKEND_KEYS_DIR/$filename"

  mkdir -p "$BACKEND_DIR/keys"
  chmod 700 "$BACKEND_DIR/keys" 2>/dev/null || true

  if [ -s "$target" ]; then
    if [ ! -s "$shared_source" ]; then
      cp "$target" "$shared_source"
      chmod 600 "$shared_source" 2>/dev/null || true
      echo -e "${GREEN}✅ backend/keys/$filename → 공통 dev 설정에 저장했습니다.${NC}"
    fi
    return 0
  fi

  if [ -s "$shared_source" ]; then
    cp "$shared_source" "$target"
    echo -e "${GREEN}✅ backend/keys/$filename → 공통 dev 설정에서 복사했습니다.${NC}"
    return 0
  fi

  local origin_worktree
  origin_worktree="$(find_origin_worktree)"
  local origin_source="$origin_worktree/backend/keys/$filename"
  if [ -n "$origin_worktree" ] && [ "$origin_worktree" != "$PROJECT_ROOT" ] && [ -s "$origin_source" ]; then
    cp "$origin_source" "$target"
    cp "$target" "$shared_source"
    chmod 600 "$shared_source" 2>/dev/null || true
    echo -e "${GREEN}✅ backend/keys/$filename → origin worktree에서 복사했습니다.${NC}"
    return 0
  fi

  return 1
}

ensure_dev_jwt_keys() {
  if ensure_jwt_key_file "jwt-private.pem" && ensure_jwt_key_file "jwt-public.pem"; then
    chmod 600 "$BACKEND_DIR/keys/jwt-private.pem" 2>/dev/null || true
    chmod 644 "$BACKEND_DIR/keys/jwt-public.pem" 2>/dev/null || true
    return 0
  fi

  if ! command -v openssl >/dev/null 2>&1; then
    echo -e "${RED}❌ JWT dev key가 없고 openssl도 없어 자동 생성할 수 없습니다.${NC}"
    echo -e "${YELLOW}   해결: origin worktree의 backend/keys/*.pem 을 복사하거나 openssl 설치 후 재실행하세요.${NC}"
    exit 1
  fi

  echo -e "${YELLOW}⚠️  공통 dev JWT 키가 없어 새로 생성합니다: ${SHARED_BACKEND_KEYS_DIR}${NC}"
  openssl genrsa -out "$SHARED_BACKEND_KEYS_DIR/jwt-private.pem" 2048 >/dev/null 2>&1
  openssl rsa -in "$SHARED_BACKEND_KEYS_DIR/jwt-private.pem" -pubout -out "$SHARED_BACKEND_KEYS_DIR/jwt-public.pem" >/dev/null 2>&1
  chmod 600 "$SHARED_BACKEND_KEYS_DIR/jwt-private.pem"
  chmod 644 "$SHARED_BACKEND_KEYS_DIR/jwt-public.pem"

  cp "$SHARED_BACKEND_KEYS_DIR/jwt-private.pem" "$BACKEND_DIR/keys/jwt-private.pem"
  cp "$SHARED_BACKEND_KEYS_DIR/jwt-public.pem" "$BACKEND_DIR/keys/jwt-public.pem"
  chmod 600 "$BACKEND_DIR/keys/jwt-private.pem"
  chmod 644 "$BACKEND_DIR/keys/jwt-public.pem"
  echo -e "${GREEN}✅ backend/keys JWT dev 키 준비 완료${NC}"
}

ensure_node_modules() {
  local dir="$1"
  local name="$2"
  local lockfile="$dir/package-lock.json"
  local marker="$CACHE_DIR/${name}-package-lock.sha"

  if [ ! -f "$lockfile" ]; then
    echo -e "${RED}❌ $lockfile 파일이 없습니다.${NC}"
    exit 1
  fi

  local lock_hash
  lock_hash="$(hash_file "$lockfile")"
  local previous_hash=""
  if [ -f "$marker" ]; then
    previous_hash="$(cat "$marker")"
  fi

  if [ -d "$dir/node_modules" ] && [ "$lock_hash" = "$previous_hash" ]; then
    echo -e "${GREEN}✅ ${name} 의존성 캐시 재사용 (npm ci 생략)${NC}"
    return 0
  fi

  echo -e "${BLUE}📦 ${name} 의존성 설치 (npm ci)${NC}"
  (cd "$dir" && npm ci)
  echo "$lock_hash" > "$marker"
}

ensure_python_tooling() {
  if [ ! -x "$VENV_DIR/bin/python" ]; then
    echo -e "${BLUE}🐍 scripts/venv 생성${NC}"
    python3 -m venv "$VENV_DIR"
  fi

  "$VENV_DIR/bin/python" -m pip install --upgrade pip >/dev/null
  "$VENV_DIR/bin/pip" install code-review-graph >/dev/null
  echo -e "${GREEN}✅ code-review-graph 준비 완료${NC}"
}

run_verify() {
  echo -e "${BLUE}🧪 검증 실행 (frontend)${NC}"
  (cd "$PROJECT_ROOT" && npm run build && npm run test:run)
  echo -e "${BLUE}🧪 검증 실행 (backend)${NC}"
  (cd "$BACKEND_DIR" && npm run build && npm run test)
}

ensure_node_runtime() {
  if (cd "$PROJECT_ROOT" && node scripts/ensure-node-runtime.mjs >/dev/null 2>&1); then
    return 0
  fi

  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    # shellcheck disable=SC1090
    set +e
    source "${NVM_DIR:-$HOME/.nvm}/nvm.sh" >/dev/null 2>&1
    set -e

    if command -v nvm >/dev/null 2>&1; then
      echo -e "${YELLOW}⚠️  Node.js 버전 자동 전환 시도 (nvm install/use)${NC}"
      nvm install >/dev/null
      nvm use >/dev/null
    fi
  fi

  (cd "$PROJECT_ROOT" && node scripts/ensure-node-runtime.mjs)
}

echo -e "${BLUE}🔧 worktree bootstrap 시작${NC}"
ensure_node_runtime

ensure_env_file "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/.env.example" "$SHARED_ROOT_DIR/.env.local"
ensure_env_file "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.example" "$SHARED_BACKEND_DIR/.env"
ensure_dev_jwt_keys

ensure_node_modules "$PROJECT_ROOT" "frontend"
ensure_node_modules "$BACKEND_DIR" "backend"
ensure_python_tooling

date -u +"%Y-%m-%dT%H:%M:%SZ" > "$SENTINEL_FILE"
echo -e "${GREEN}✅ bootstrap 완료 (${SENTINEL_FILE#$PROJECT_ROOT/})${NC}"

if [ "$RUN_VERIFY" = "true" ]; then
  run_verify
fi

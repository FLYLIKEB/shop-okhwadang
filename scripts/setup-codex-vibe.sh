#!/bin/bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.env.codex.vibe.local"

detect_vibe_proxy_url() {
  local detected_host="127.0.0.1"
  local detected_port="8317"
  local merged_config="$HOME/.cli-proxy-api/merged-config.yaml"

  if [ -f "$merged_config" ]; then
    local cfg_host
    local cfg_port
    cfg_host="$(sed -n 's/^host:[[:space:]]*//p' "$merged_config" | head -n 1)"
    cfg_port="$(sed -n 's/^port:[[:space:]]*//p' "$merged_config" | head -n 1)"

    if [ -n "$cfg_host" ]; then
      detected_host="$cfg_host"
    fi

    if [ -n "$cfg_port" ]; then
      detected_port="$cfg_port"
    fi
  fi

  echo "http://${detected_host}:${detected_port}"
}

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/setup-codex-vibe.sh
  bash scripts/setup-codex-vibe.sh --check
  bash scripts/setup-codex-vibe.sh --no-check
  bash scripts/setup-codex-vibe.sh --print-env
  bash scripts/setup-codex-vibe.sh omc ask codex "hello"

Behavior:
  1) Reads .env.codex.vibe.local
  2) Exports OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL
  3) Verifies Vibe Proxy connectivity with /v1/models
  4) Optionally executes the command you pass after setup
EOF
}

ensure_config_file() {
  if [ -f "$CONFIG_FILE" ]; then
    return
  fi

  local default_key="${OPENAI_API_KEY:-}"
  local default_model="${OPENAI_MODEL:-codex-mini-latest}"

  if [ -z "$default_key" ]; then
    default_key="dummy-not-used"
  fi

  local default_url
  default_url="$(detect_vibe_proxy_url)"

  cat > "$CONFIG_FILE" <<EOF
VIBE_PROXY_URL=$default_url
VIBE_PROXY_API_KEY=$default_key
VIBE_CODEX_MODEL=$default_model
EOF

  echo -e "${YELLOW}⚠️  $CONFIG_FILE 파일이 없어 기본 템플릿을 생성했습니다.${NC}"
  if [ -z "$default_key" ]; then
    echo -e "${YELLOW}   VIBE_PROXY_API_KEY를 채운 뒤 다시 실행하세요.${NC}"
  fi
}

load_config() {
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a

  if [ -z "${VIBE_PROXY_URL:-}" ]; then
    echo -e "${RED}❌ VIBE_PROXY_URL이 비어 있습니다. ($CONFIG_FILE)${NC}"
    exit 1
  fi

  if [ -z "${VIBE_PROXY_API_KEY:-}" ]; then
    echo -e "${RED}❌ VIBE_PROXY_API_KEY가 비어 있습니다. ($CONFIG_FILE)${NC}"
    exit 1
  fi

  if [ -z "${VIBE_CODEX_MODEL:-}" ]; then
    VIBE_CODEX_MODEL="codex-mini-latest"
  fi
}

configure_env() {
  local normalized_url="${VIBE_PROXY_URL%/}"
  if [[ "$normalized_url" == */v1 ]]; then
    OPENAI_BASE_URL="$normalized_url"
  else
    OPENAI_BASE_URL="$normalized_url/v1"
  fi

  OPENAI_API_KEY="$VIBE_PROXY_API_KEY"
  OPENAI_MODEL="$VIBE_CODEX_MODEL"

  export OPENAI_BASE_URL
  export OPENAI_API_KEY
  export OPENAI_MODEL

  # 호환 변수 (도구별 fallback)
  export OPENAI_BASEURL="$OPENAI_BASE_URL"
  export OPENAI_API_BASE="$OPENAI_BASE_URL"
}

check_proxy() {
  local response_file
  response_file="/tmp/vibe-models-$$.json"

  local http_code
  http_code="$(curl -sS -o "$response_file" -w "%{http_code}" -H "Authorization: Bearer $OPENAI_API_KEY" "$OPENAI_BASE_URL/models" || true)"

  if [ "$http_code" != "200" ]; then
    echo -e "${RED}❌ Vibe Proxy 연결 실패 (HTTP $http_code)${NC}"
    echo -e "${YELLOW}   URL: $OPENAI_BASE_URL/models${NC}"
    echo -e "${YELLOW}   응답:${NC}"
    cat "$response_file" >&2 2>/dev/null || true
    rm -f "$response_file"
    exit 1
  fi

  if command -v jq > /dev/null 2>&1; then
    local model_count
    model_count="$(jq '.data | length' "$response_file" 2>/dev/null || echo 0)"
    if [ "$model_count" -eq 0 ]; then
      echo -e "${RED}❌ /models 응답에 모델이 없습니다.${NC}"
      rm -f "$response_file"
      exit 1
    fi

    if ! jq -e --arg m "$OPENAI_MODEL" '.data[] | select(.id == $m)' "$response_file" > /dev/null 2>&1; then
      local fallback_model
      fallback_model="$(jq -r '.data[] | .id' "$response_file" | grep -i 'codex' | head -n 1 || true)"

      if [ -z "$fallback_model" ]; then
        fallback_model="$(jq -r '.data[0].id' "$response_file")"
      fi

      if [ -n "$fallback_model" ] && [ "$fallback_model" != "null" ]; then
        OPENAI_MODEL="$fallback_model"
        export OPENAI_MODEL
        echo -e "${YELLOW}⚠️  요청 모델을 찾지 못해 $OPENAI_MODEL 로 자동 전환했습니다.${NC}"
      fi
    fi
  fi

  rm -f "$response_file"
}

PRINT_ENV=false
CHECK_ONLY=false
SKIP_CHECK=false

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h)
      print_usage
      exit 0
      ;;
    --print-env)
      PRINT_ENV=true
      SKIP_CHECK=true
      shift
      ;;
    --check)
      CHECK_ONLY=true
      SKIP_CHECK=false
      shift
      ;;
    --no-check)
      SKIP_CHECK=true
      shift
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
done

ensure_config_file
load_config
configure_env

if [ "$SKIP_CHECK" = false ]; then
  check_proxy
fi

if [ "$SKIP_CHECK" = false ]; then
  echo -e "${GREEN}✅ Vibe Proxy 연결 완료${NC}"
  echo -e "${BLUE}   OPENAI_BASE_URL=${OPENAI_BASE_URL}${NC}"
  echo -e "${BLUE}   OPENAI_MODEL=${OPENAI_MODEL}${NC}"
else
  echo -e "${YELLOW}⚠️  연결 확인은 건너뛰었습니다 (--no-check/--print-env).${NC}"
  echo -e "${BLUE}   OPENAI_BASE_URL=${OPENAI_BASE_URL}${NC}"
  echo -e "${BLUE}   OPENAI_MODEL=${OPENAI_MODEL}${NC}"
fi

if [ "$PRINT_ENV" = true ]; then
  echo "export OPENAI_BASE_URL=\"$OPENAI_BASE_URL\""
  echo "export OPENAI_API_KEY=\"$OPENAI_API_KEY\""
  echo "export OPENAI_MODEL=\"$OPENAI_MODEL\""
  echo "export OPENAI_BASEURL=\"$OPENAI_BASE_URL\""
  echo "export OPENAI_API_BASE=\"$OPENAI_BASE_URL\""
fi

if [ "$CHECK_ONLY" = true ]; then
  exit 0
fi

if [ $# -gt 0 ]; then
  echo -e "${BLUE}▶ 실행: $*${NC}"
  "$@"
  exit $?
fi

echo -e "${GREEN}다음 중 하나를 실행하세요:${NC}"
echo "  bash scripts/setup-codex-vibe.sh omc ask codex \"테스트 프롬프트\""
echo '  eval "$(bash scripts/setup-codex-vibe.sh --print-env | sed -n '\''/^export /p'\'')"'
echo "  omc ask codex \"테스트 프롬프트\""

#!/usr/bin/env bash
# Fast project invariant checks for Codex hooks.
# Keep this lightweight: no builds, no server starts, no network.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

failures=()
warnings=()

find_node() {
  local node_bin="${NODE_BIN:-}"
  if [ -z "$node_bin" ]; then
    node_bin="$(command -v node || true)"
  fi
  if [ -z "$node_bin" ]; then
    local candidate
    for candidate in "$HOME"/.nvm/versions/node/*/bin/node /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
      if [ -x "$candidate" ]; then
        node_bin="$candidate"
        break
      fi
    done
  fi
  printf '%s' "$node_bin"
}

add_failure() {
  failures+=("$1")
}

add_warning() {
  warnings+=("$1")
}

if command -v rg >/dev/null 2>&1; then
  if rg -n '^(<<<<<<< |=======$|>>>>>>> )' \
    --glob '!node_modules/**' \
    --glob '!.next/**' \
    --glob '!dist/**' \
    --glob '!backend/dist/**' \
    --glob '!backend/dist.nosync/**' \
    --glob '!coverage/**' \
    . >/tmp/okhwadang-conflict-markers.txt 2>/dev/null; then
    add_failure "merge conflict markers remain:\n$(cat /tmp/okhwadang-conflict-markers.txt)"
  fi
fi

node_bin="$(find_node)"
if [ -z "$node_bin" ]; then
  add_failure "node executable not found for locale JSON validation"
else
  for file in src/i18n/messages/ko.json src/i18n/messages/en.json; do
    if [ -f "$file" ]; then
      if ! "$node_bin" -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$file" >/dev/null 2>&1; then
        add_failure "invalid JSON: $file"
      fi
    fi
  done
fi

for script in scripts/start-local.sh scripts/stop-local.sh scripts/worktree-bootstrap.sh; do
  if [ -f "$script" ]; then
    if ! bash -n "$script" >/dev/null 2>&1; then
      add_failure "shell syntax check failed: $script"
    fi
  fi
done

if [ -f backend/.env ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      JWT_PRIVATE_KEY_PATH|JWT_PUBLIC_KEY_PATH)
        value="${value%%#*}"
        value="${value//\"/}"
        value="${value//\'/}"
        value="${value## }"
        value="${value%% }"
        if [ -n "$value" ] && [ ! -s "backend/$value" ]; then
          add_warning "backend/.env references missing $key file: backend/$value (run: make bootstrap)"
        fi
        ;;
    esac
  done < backend/.env
fi

if [ ${#warnings[@]} -gt 0 ]; then
  printf "${YELLOW}Okhwadang project guard warnings:${NC}\n" >&2
  for item in "${warnings[@]}"; do
    printf -- "- %b\n" "$item" >&2
  done
fi

if [ ${#failures[@]} -gt 0 ]; then
  printf "${RED}Okhwadang project guard failed:${NC}\n" >&2
  for item in "${failures[@]}"; do
    printf -- "- %b\n" "$item" >&2
  done
  exit 1
fi

exit 0

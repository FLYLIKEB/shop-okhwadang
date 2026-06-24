#!/usr/bin/env bash
set -euo pipefail

script_path="${1:?usage: run-node-script.sh <project-relative-script> [args...]}"
shift || true

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$script_path" == /* || "$script_path" == *".."* ]]; then
  echo "Refusing unsafe script path: $script_path" >&2
  exit 64
fi

target="$PROJECT_ROOT/$script_path"
if [[ ! -f "$target" ]]; then
  echo "Unable to find project script: $script_path" >&2
  exit 66
fi

node_bin="${NODE_BIN:-}"
if [[ -z "$node_bin" ]]; then
  node_bin="$(command -v node || true)"
fi
if [[ -z "$node_bin" ]]; then
  for candidate in "$HOME"/.nvm/versions/node/*/bin/node /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    if [[ -x "$candidate" ]]; then
      node_bin="$candidate"
      break
    fi
  done
fi

if [[ -z "$node_bin" ]]; then
  echo "Unable to find node. Set NODE_BIN to the Node executable." >&2
  exit 127
fi

exec "$node_bin" "$target" "$@"

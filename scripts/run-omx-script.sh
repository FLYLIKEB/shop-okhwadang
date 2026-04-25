#!/usr/bin/env bash
set -euo pipefail

script_path="${1:?usage: run-omx-script.sh <dist-relative-script> [args...]}"
shift || true

if [[ "$script_path" == /* || "$script_path" == *".."* ]]; then
  echo "Refusing unsafe OMX script path: $script_path" >&2
  exit 64
fi

node_bin="${NODE_BIN:-}"
if [[ -z "$node_bin" ]]; then
  node_bin="$(command -v node || true)"
fi

if [[ -z "$node_bin" ]]; then
  echo "Unable to find node. Set NODE_BIN to the Node executable used by oh-my-codex." >&2
  exit 127
fi

candidates=()

if [[ -n "${OMX_DIST_DIR:-}" ]]; then
  candidates+=("$OMX_DIST_DIR")
fi

if command -v npm >/dev/null 2>&1; then
  npm_root="$(npm root -g 2>/dev/null || true)"
  if [[ -n "$npm_root" ]]; then
    candidates+=("$npm_root/oh-my-codex/dist")
  fi
fi

if command -v omx >/dev/null 2>&1; then
  omx_bin="$(command -v omx)"
  candidates+=("$(cd "$(dirname "$omx_bin")/../lib/node_modules/oh-my-codex/dist" 2>/dev/null && pwd || true)")
fi

for version_dir in "$HOME"/.nvm/versions/node/*; do
  candidates+=("$version_dir/lib/node_modules/oh-my-codex/dist")
done

candidates+=(
  "/opt/homebrew/lib/node_modules/oh-my-codex/dist"
  "/usr/local/lib/node_modules/oh-my-codex/dist"
)

for dist_dir in "${candidates[@]}"; do
  [[ -n "$dist_dir" ]] || continue
  target="$dist_dir/$script_path"
  if [[ -f "$target" ]]; then
    if [[ "${OMX_SCRIPT_DRY_RUN:-}" == "1" ]]; then
      printf '%s\n' "$target"
      exit 0
    fi
    exec "$node_bin" "$target" "$@"
  fi
done

echo "Unable to locate oh-my-codex dist script: $script_path" >&2
echo "Set OMX_DIST_DIR to the oh-my-codex dist directory if it is installed in a custom location." >&2
exit 127

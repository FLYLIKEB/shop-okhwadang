#!/bin/bash

set -euo pipefail

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$PROJECT_ROOT/scripts/review-graph.sh"

if ! echo "$PROMPT" | grep -qiE '(^|[^[:alnum:]_])(code review|review|pr[[:space:]]*#?[0-9]+|![0-9]+|pull request)([^[:alnum:]_]|$)'; then
  exit 0
fi

if [ ! -x "$SCRIPT" ]; then
  exit 0
fi

REVIEW_OUTPUT="$($SCRIPT detect-changes 2>/dev/null | head -40 || true)"

if [ -z "$REVIEW_OUTPUT" ]; then
  exit 0
fi

ESCAPED=$(printf '\n[Code Review Graph]\n%s\n' "$REVIEW_OUTPUT" | jq -Rs .)
echo "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": $ESCAPED}}"

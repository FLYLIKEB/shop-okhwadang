#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

git config core.hooksPath .githooks
echo "✅ core.hooksPath=.githooks 설정 완료"
echo "   (확인: git config --get core.hooksPath)"

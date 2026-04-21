#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "== React Markdown static import 검사 =="
if rg -n "^[[:space:]]*import .*['\"]react-markdown['\"]" src; then
  echo "❌ static react-markdown import 발견"
  exit 1
else
  echo "✅ static react-markdown import 없음"
fi

echo
echo "== Stripe SDK static import 검사 =="
if rg -n "^[[:space:]]*import .*['\"]@stripe/stripe-js['\"]" src; then
  echo "❌ static @stripe/stripe-js import 발견"
  exit 1
else
  echo "✅ static @stripe/stripe-js import 없음"
fi

echo
echo "== Lucide wildcard import 검사 =="
if rg -n "^[[:space:]]*import \\* as .*['\"]lucide-react['\"]" src; then
  echo "❌ wildcard lucide-react import 발견"
  exit 1
else
  echo "✅ wildcard lucide-react import 없음"
fi

echo
echo "== lucide-react import 상위 파일(참고용) =="
python3 - <<'PY'
import pathlib
import re

root = pathlib.Path("src")
pattern = re.compile(r"^\s*import\s*\{([^}]+)\}\s*from\s*['\"]lucide-react['\"]")
rows = []
for path in root.rglob("*.ts*"):
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    total = 0
    for line in text.splitlines():
        m = pattern.match(line)
        if not m:
            continue
        names = [n.strip() for n in m.group(1).split(",") if n.strip()]
        total += len(names)
    if total >= 10:
        rows.append((total, str(path)))

for count, path in sorted(rows, reverse=True)[:10]:
    print(f"{count:>2} {path}")
if not rows:
    print("(10개 이상 import 파일 없음)")
PY

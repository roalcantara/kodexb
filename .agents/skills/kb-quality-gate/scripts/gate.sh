#!/usr/bin/env bash
# kb quality gate — run all checks sequentially, exit 1 on first failure
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PASS="\033[0;32m✔\033[0m"
FAIL="\033[0;31m✘\033[0m"

run_check() {
  local label="$1"; shift
  echo -n "  $label … "
  if "$@" > /tmp/kb-gate-out 2>&1; then
    echo -e "$PASS"
  else
    echo -e "$FAIL"
    cat /tmp/kb-gate-out
    exit 1
  fi
}

echo ""
echo "kb Quality Gate"
echo "═══════════════"

echo ""
echo "1 / Tests"
run_check "bun test" bun test

echo ""
echo "2 / Lint + Typecheck"
run_check "bun run lint" bun run lint

echo ""
echo "3 / Preview Server"
bun tools/preview/server.ts &
SERVER_PID=$!
sleep 3
HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3456/ || echo "000")
kill "$SERVER_PID" 2>/dev/null || true
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "  Preview server … $PASS"
else
  echo -e "  Preview server … $FAIL (HTTP $HTTP_STATUS)"
  exit 1
fi

echo ""
echo "4 / Knip (unused exports)"
run_check "knip" bunx knip

echo ""
echo "5 / JSCPD (duplication)"
run_check "jscpd" bunx jscpd src/ --min-lines 10 --threshold 5

echo ""
echo -e "\033[0;32mAll checks passed.\033[0m"

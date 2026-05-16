#!/usr/bin/env bash
# kb quality gate — run all stages sequentially, exit 1 on first failure.
# Mirrors the stage list in `.agents/skills/kb-quality-gate/SKILL.md`.
set -eu -o pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PASS="\033[0;32m✔\033[0m"
FAIL="\033[0;31m✘\033[0m"

run_check() {
  local mode="capture"
  if [[ "${1:-}" == "--tee" ]]; then
    mode="tee"
    shift
  fi
  local label="$1"
  shift
  if [[ "$mode" == "tee" ]]; then
    # Pipeline exit status is tee's without pipefail; use PIPESTATUS[0] for "$@".
    set +e
    "$@" 2>&1 | tee /tmp/kb-gate-out
    local cmd_status="${PIPESTATUS[0]}"
    set -e
    if [[ "$cmd_status" -eq 0 ]]; then
      echo -e "  $label … $PASS"
    else
      echo -e "  $label … $FAIL"
      exit 1
    fi
    return
  fi
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
echo "0 / Autofix (knip + ast-grep + biome + typecheck)"
run_check "bun run lint:fix" bun run lint:fix

echo ""
echo "0.5 / Policy (new suppressions + reminders)"
echo "──────────────────────────────────────────"
KB_GATE_EMBEDDED_POLICY=1 run_check --tee "Policy" \
  bash "$ROOT/.agents/skills/kb-quality-gate/scripts/gate_policy.sh"

echo ""
echo "1 / Lint + Typecheck (typecheck + biome + knip + depcruise + jscpd + ls + ast-grep + mise)"
run_check "bun run lint" bun run lint

echo ""
echo "2 / Tests"
run_check "bun test" bun test

echo ""
echo "3 / Preview server smoke"
bun tools/preview/server.ts &
SERVER_PID=$!
sleep 3
# Do not use curl -f: on 4xx/5xx it exits non-zero and would mask %{http_code} in diagnostics.
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/)
HTTP_STATUS=${HTTP_STATUS:-000}
kill "$SERVER_PID" 2>/dev/null || true
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "  Preview server … $PASS"
else
  echo -e "  Preview server … $FAIL (HTTP $HTTP_STATUS)"
  exit 1
fi

echo ""
echo "4 / Build smoke (skipped on non-macOS hosts)"
if [[ "$(uname -s)" == "Darwin" ]]; then
  run_check "bun run build" bun run build
else
  echo "  bun run build … (skipped — non-macOS host)"
fi

echo ""
echo -e "\033[0;32mAll gate stages passed.\033[0m"

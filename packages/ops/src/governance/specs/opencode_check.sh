#!/usr/bin/env bash
# Verify OpenCode + Spec Kit wiring for kb SDD handoff
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
FAIL=0

check() {
  if "$@"; then
    echo "✓ $*"
  else
    echo "✗ $*"
    FAIL=1
  fi
}

echo "── OpenCode SDD wiring check ──"

command -v opencode >/dev/null && echo "✓ opencode on PATH ($(opencode --version 2>/dev/null | head -1))" || {
  echo "✗ opencode not on PATH"
  FAIL=1
}

test -f opencode.json && echo "✓ opencode.json" || {
  echo "✗ missing opencode.json (OpenCode project config)"
  FAIL=1
}

test -f .opencode/commands/speckit.implement.md && echo "✓ .opencode/commands/speckit.implement.md" || {
  echo "✗ run: specify integration install opencode --force"
  FAIL=1
}

grep -q '"opencode"' .specify/integration.json && echo "✓ opencode in .specify/integration.json" || {
  echo "✗ opencode integration not registered"
  FAIL=1
}

if opencode mcp list 2>&1 | grep -q code-review-graph; then
  echo "✓ CRG MCP visible to opencode"
else
  echo "⚠ CRG MCP not listed (check opencode.json mcp.code-review-graph)"
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "OpenCode SDD wiring: OK"
  echo "Hand off implement: cd $REPO_ROOT && opencode → /speckit.implement"
  exit 0
fi
echo "OpenCode SDD wiring: FAILED"
exit 1

#!/usr/bin/env bash
# spec gate — lint + trace + app quality gate
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
FEATURE_DIR="${1:-assets/specs/001-sync-frecency-persistence}"

echo "── spec gate: ${FEATURE_DIR} ──"
bun tools/spec/lint.script.ts "$FEATURE_DIR" --strict
bun tools/spec/trace.script.ts "$FEATURE_DIR" --strict
bash .agents/skills/app-quality-gate/scripts/gate.sh
echo "spec gate: OK"

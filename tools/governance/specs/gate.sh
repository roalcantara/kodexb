#!/usr/bin/env bash
# spec gate — lint + trace + security + app quality gate
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
FEATURE_DIR="${1:-assets/specs/001-sync-frecency-persistence}"

echo "── spec gate: ${FEATURE_DIR} ──"
bun tools/governance/specs/lint.script.ts "$FEATURE_DIR" --strict
bun tools/governance/specs/trace.script.ts "$FEATURE_DIR" --strict
bun tools/governance/security/scan.script.ts --strict
bash .agents/skills/app-quality-gate/scripts/gate.sh
echo "spec gate: OK"

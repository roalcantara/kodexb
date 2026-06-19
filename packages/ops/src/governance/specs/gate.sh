#!/usr/bin/env bash
# spec gate — lint + trace + security + app quality gate
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
FEATURE_DIR="${1:-}"
if [[ -z "$FEATURE_DIR" ]]; then
  echo "Usage: packages/ops/src/governance/specs/gate.sh <feature-dir>" >&2
  exit 2
fi

echo "── spec gate: ${FEATURE_DIR} ──"
bun packages/ops/src/governance/specs/lint.script.ts "$FEATURE_DIR" --strict
bun packages/ops/src/governance/specs/trace.script.ts "$FEATURE_DIR" --strict
bun packages/ops/src/governance/security/scan.script.ts --strict
bash .agents/skills/app-quality-gate/scripts/gate.sh
echo "spec gate: OK"

#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
# shellcheck source=../../../scripts/bash/common.sh
source "$REPO_ROOT/.specify/scripts/bash/common.sh"
FEATURE_DIR="${SPECIFY_FEATURE_DIRECTORY:-}"
if [[ -z "$FEATURE_DIR" && -f .specify/feature.json ]]; then
  FEATURE_DIR="$(bun -e "console.log(JSON.parse(await Bun.file('.specify/feature.json').text()).feature_directory)")"
fi
[[ -n "$FEATURE_DIR" ]] || { echo "kb-preflight: no feature directory"; exit 1; }
[[ "$FEATURE_DIR" =~ ^assets/specs/[0-9]{3}- ]] || {
  echo "kb-preflight: feature_directory must be assets/specs/NNN-slug (got $FEATURE_DIR)"
  exit 1
}
for f in tasks.md spec.md plan.md; do
  [[ -f "$FEATURE_DIR/$f" ]] || { echo "kb-preflight: missing $FEATURE_DIR/$f"; exit 1; }
done
HANDOFF="$(first_existing_path "$FEATURE_DIR/artifacts/tasks/handoff.md" "$FEATURE_DIR/handoff.md")"
[[ -f "$HANDOFF" ]] || {
  echo "kb-preflight: missing handoff (expected artifacts/tasks/handoff.md or handoff.md)"
  exit 1
}
bun tools/spec/lint.ts "$FEATURE_DIR" || true
echo "kb-preflight: OK (handoff=$HANDOFF)"

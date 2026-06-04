#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
FEATURE_DIR="${SPECIFY_FEATURE_DIRECTORY:-}"
if [[ -z "$FEATURE_DIR" && -f "$REPO_ROOT/.specify/feature.json" ]]; then
  FEATURE_DIR="$(bun -e "console.log(JSON.parse(await Bun.file('.specify/feature.json').text()).feature_directory)")"
fi
[[ -n "$FEATURE_DIR" ]] || { echo "kb-handoff: no feature directory"; exit 1; }
if [[ -f "$REPO_ROOT/$FEATURE_DIR/artifacts/tasks/handoff.md" ]]; then
  HANDOFF="$REPO_ROOT/$FEATURE_DIR/artifacts/tasks/handoff.md"
elif [[ -f "$REPO_ROOT/$FEATURE_DIR/handoff.md" ]]; then
  HANDOFF="$REPO_ROOT/$FEATURE_DIR/handoff.md"
else
  HANDOFF="$REPO_ROOT/$FEATURE_DIR/artifacts/tasks/handoff.md"
  echo "kb-handoff: creating stub handoff at $HANDOFF"
  mkdir -p "$(dirname "$HANDOFF")"
  cat >"$HANDOFF" <<EOF
# Handoff — \`$(basename "$FEATURE_DIR")\`

**Spec:** \`$FEATURE_DIR/\`

## Acceptance criteria tracker

| ID | Done when | Evidence |
| --- | --- | --- |
EOF
fi
echo "kb-handoff: OK ($HANDOFF)"

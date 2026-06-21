#!/usr/bin/env bash
# Register in-progress catalog entry before implementation.
set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../../../scripts/bash/common.sh
source "$SCRIPT_DIR/../../../../scripts/bash/common.sh"

REPO_ROOT="$(get_repo_root)"
cd "$REPO_ROOT"

if ! command -v mise >/dev/null 2>&1; then
  echo "catalog-lifecycle: mise not found; skipped register" >&2
  exit 0
fi

if mise run catalog register; then
  exit 0
fi
echo "catalog-lifecycle: catalog register failed" >&2
exit 1

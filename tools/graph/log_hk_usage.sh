#!/usr/bin/env bash
# Append one HK CRG scan line (called from hk.pkl pre-commit).
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
LOG_DIR="$REPO_ROOT/.code-review-graph"
mkdir -p "$LOG_DIR"
commit="$(git rev-parse HEAD 2>/dev/null || echo null)"
printf '{"ts":"%s","source":"hk","commit":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$commit" >>"$LOG_DIR/hk-usage.jsonl"

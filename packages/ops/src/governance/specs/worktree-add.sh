#!/usr/bin/env bash
# spec worktree add — isolated tree for parallel features (branch from main)
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

FEATURE="${1:-}"
if [[ -z "$FEATURE" ]]; then
  echo "usage: spec worktree add <NNN-slug>" >&2
  exit 2
fi

BRANCH="feature/${FEATURE}"
WORKTREE_DIR="../kb-worktree-${FEATURE}"

if git worktree list | grep -q "$WORKTREE_DIR"; then
  echo "worktree already exists: $WORKTREE_DIR"
  exit 0
fi

git fetch origin main 2>/dev/null || true
BASE="$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse main 2>/dev/null || git rev-parse HEAD)"
git worktree add -b "$BRANCH" "$WORKTREE_DIR" "$BASE"
echo "✓ worktree $WORKTREE_DIR on $BRANCH (base ${BASE:0:8})"
echo "  Policy: branch from main/post-001-merge — rebase before implement if 001 touched schema."

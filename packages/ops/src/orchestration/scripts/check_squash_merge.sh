#!/usr/bin/env bash
# Validate that main received a single squash commit (not merge/rebase merge).
# CI: pass BEFORE and AFTER SHAs from github.event.before / github.event.after.
# Local: omit BEFORE to validate HEAD only (mise run ci release --check-squash).
set -euo pipefail

before="${1:-}"
after="${2:-HEAD}"

if [[ -n "$before" && "$before" == "0000000000000000000000000000000000000000" ]]; then
  echo "Initial push — skipping squash check."
  exit 0
fi

subject="$(git log -1 --pretty=%s "$after")"
if [[ "$subject" =~ \[skip\ ci\] ]]; then
  echo "Skipping release — commit message contains [skip ci]"
  exit 0
fi

if [[ "$subject" =~ ^Merge\ (pull\ request|branch) ]]; then
  echo "::error::Merge commit detected on main: '$subject'." >&2
  echo "::error::Merge PRs with squash only: gh pr merge <n> --squash" >&2
  echo "::error::Enable squash-only in repo settings (disable merge and rebase merge)." >&2
  exit 1
fi

if [[ -n "$before" ]]; then
  count="$(git log --oneline "$before..$after" | wc -l | tr -d ' ')"
  if [[ "$count" -gt 1 ]]; then
    echo "::error::Push contains $count commits — likely Rebase and Merge." >&2
    echo "::error::Repository must require Squash and Merge only." >&2
    exit 1
  fi
fi

echo "OK: single squash commit on main."

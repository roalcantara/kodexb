#!/usr/bin/env bash
# Push current branch and open or refresh a draft PR targeting main.
set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

FEATURE_DIR="${1:-}"
if [[ -z "$FEATURE_DIR" && -f "$REPO_ROOT/.specify/feature.json" ]]; then
  FEATURE_DIR="$(bun -e "console.log(JSON.parse(await Bun.file('.specify/feature.json').text()).feature_directory)")"
fi
[[ -n "$FEATURE_DIR" ]] || { echo "spec pr-draft: feature directory required" >&2; exit 1; }

BRANCH="$(git branch --show-current)"
if [[ ! "$BRANCH" =~ ^[0-9]{3}- ]]; then
  echo "spec pr-draft: branch must match NNN-slug (current: ${BRANCH})" >&2
  exit 1
fi

echo "── spec pr-draft: gate ${FEATURE_DIR} ──"
bash tools/spec/gate.sh "$FEATURE_DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "spec pr-draft: gh CLI required" >&2
  exit 1
fi

echo "── spec pr-draft: push ${BRANCH} ──"
git push -u origin HEAD

EXISTING="$(gh pr list --head "$BRANCH" --base main --json number,url --jq '.[0].url // empty')"
if [[ -n "$EXISTING" ]]; then
  echo "spec pr-draft: existing PR ${EXISTING}"
  gh pr view "$BRANCH" --web 2>/dev/null || true
else
  URL="$(gh pr create --draft --base main --fill)"
  echo "spec pr-draft: created ${URL}"
fi

echo "── spec pr-draft: checks (review-draft on draft PRs) ──"
gh pr checks "$BRANCH" 2>/dev/null || echo "spec pr-draft: checks pending — open PR in browser"

#!/usr/bin/env bash
# Policy checks aligned with AGENTS.md + assets/guides/DoD.md
# (R6 tool weakening, R7 Electrobun discipline). Complements mechanical linters.
set -eu -o pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

WARN="\033[0;33m!\033[0m"
INFO="\033[0;36mℹ\033[0m"
FAIL="\033[0;31m✘\033[0m"
PASS="\033[0;32m✔\033[0m"

if [[ "${GATE_SKIP_POLICY:-}" == "1" ]]; then
  echo -e "  Policy checks … ${INFO} skipped (GATE_SKIP_POLICY=1)"
  exit 0
fi

# Unified diffs: added lines start with '+' but not '+++' (file headers use three +).
# Match common suppressions / bypasses in TS/TSX and electrobun config.
SUPPRESSION_RX='^\+[^+].*(//[[:space:]]*biome-ignore|/\*.*biome-ignore|biome-ignore-all|@ts-expect-error|@ts-ignore|eslint-disable)'

collect_diff() {
  # Working tree vs HEAD and staged vs HEAD (HK pre-commit and quality gate).
  git diff --no-color HEAD -- src/ tools/ electrobun.config.ts 2>/dev/null || true
  git diff --cached --no-color -- src/ tools/ electrobun.config.ts 2>/dev/null || true
}

has_new_suppression() {
  if collect_diff | rg -q "$SUPPRESSION_RX" 2>/dev/null; then
    return 0
  fi
  return 1
}

if [[ -z "${GATE_EMBEDDED_POLICY:-}" ]]; then
  echo ""
  echo "0.5 / Policy (new suppressions + reminders)"
  echo "──────────────────────────────────────────"
fi

if has_new_suppression; then
  if [[ "${GATE_APPROVED_TOOL_WEAKENING:-}" == "1" ]]; then
    echo -e "  New suppressions in diff … ${WARN} allowed (GATE_APPROVED_TOOL_WEAKENING=1)"
    collect_diff | rg -n "$SUPPRESSION_RX" || true
  else
    echo -e "  New suppressions in diff … ${FAIL}"
    echo ""
    echo "  Added lines match: biome-ignore*, @ts-expect-error, @ts-ignore, eslint-disable"
    echo "  in src/, tools/, or electrobun.config.ts (working tree or index)."
    echo ""
    echo "  Per AGENTS.md / codebase-quality-audit R6: get maintainer PR approval, then either:"
    echo "    • Re-run gate with: GATE_APPROVED_TOOL_WEAKENING=1 bash .../gate.sh"
    echo "    • Or remove the suppression and fix the root cause."
    echo ""
    collect_diff | rg -n "$SUPPRESSION_RX" || true
    exit 1
  fi
else
  echo -e "  No new suppressions in diff … ${PASS}"
fi

# Surface touched guard configs (any edit may weaken or strengthen — human confirms).
GUARD_FILES=(
  biome.jsonc
  knip.jsonc
  .dependency-cruiser.cjs
  tsconfig.json
  .ls-lint.yml
  sgconfig.yml
)
touching=()
for f in "${GUARD_FILES[@]}"; do
  [[ -f "$f" ]] || continue
  if ! git diff --quiet HEAD -- "$f" 2>/dev/null; then
    touching+=("$f")
    continue
  fi
  if ! git diff --cached --quiet -- "$f" 2>/dev/null; then
    if [[ " ${touching[*]} " != *" $f "* ]]; then
      touching+=("$f")
    fi
  fi
done

if ((${#touching[@]} > 0)); then
  echo -e "  Guard config edits … ${WARN}"
  for f in "${touching[@]}"; do
    echo "    - $f"
  done
  echo "    Confirm changes do not weaken tools without maintainer approval (AGENTS.md)."
  if [[ "${GATE_APPROVED_TOOL_WEAKENING:-}" != "1" ]]; then
    echo "    (Informational only — set GATE_APPROVED_TOOL_WEAKENING=1 after approval if you hit the suppression check above.)"
  fi
else
  echo -e "  Guard configs unchanged … ${PASS}"
fi

echo ""
echo -e "  ${INFO} Electrobun (R7): for electrobun.config.ts, src/shell/main/, RPC, windows,"
echo "      build, or distribution — read .agents/skills/electrobun-best-practices/SKILL.md"
echo "      and .cursor/electrobun-skill-routing.md before relying on memory."

exit 0

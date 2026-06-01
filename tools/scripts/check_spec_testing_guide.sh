#!/usr/bin/env bash
# Machine-checkable rules from assets/guides/TESTING_GUIDE.md and FISHERY_GUIDE.md.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

failures=0

report() {
  echo "$1" >&2
  failures=$((failures + 1))
}

spec_glob=(--glob '*.spec.ts' --glob '*.spec.tsx')

if matches="$(rg -n 'const context\s*=\s*describe' src "${spec_glob[@]}" 2>/dev/null || true)" && [[ -n "$matches" ]]; then
  report "Use nested describe blocks; do not alias context = describe (TESTING_GUIDE §Better Specs)."
  echo "$matches" >&2
fi

if matches="$(rg -n '\btest\(' src "${spec_glob[@]}" 2>/dev/null || true)" && [[ -n "$matches" ]]; then
  report "Use it(), not test(), in src specs (TESTING_GUIDE §Bun)."
  echo "$matches" >&2
fi

if matches="$(rg -n "it\(['\"]should " src "${spec_glob[@]}" 2>/dev/null || true)" && [[ -n "$matches" ]]; then
  report "it() descriptions must not start with 'should' (TESTING_GUIDE §Better Specs)."
  echo "$matches" >&2
fi

# mock.module: discouraged (TESTING_GUIDE §Mocking) but still used for renderer RPC
# boundaries — not enforced here until those specs use injectable clients.

# Local factories for shapes registered in factories.builder.ts — use factoryFor from @testing.
banned_make='function make(Binding|BindingRef|Shortcut|Bookmark|Command|Cheat|Task)\b|function make(ShortcutKnowledge|BookmarkKnowledge|CommandKnowledge|CheatKnowledge|TaskKnowledge)\b'
if matches="$(rg -n "$banned_make" src "${spec_glob[@]}" 2>/dev/null || true)" && [[ -n "$matches" ]]; then
  report "Replace local make* knowledge/binding factories with factoryFor(...) (FISHERY_GUIDE §Promotion)."
  echo "$matches" >&2
fi

banned_const_make='const make(Bookmark|Command|Cheat|Task|Shortcut)\s*='
if matches="$(rg -n "$banned_const_make" src "${spec_glob[@]}" 2>/dev/null || true)" && [[ -n "$matches" ]]; then
  report "Replace const make* knowledge helpers with factoryFor(...) (FISHERY_GUIDE §Promotion)."
  echo "$matches" >&2
fi

if [[ "$failures" -gt 0 ]]; then
  echo "" >&2
  echo "check_spec_testing_guide: $failures violation(s). See assets/guides/TESTING_GUIDE.md" >&2
  exit 1
fi

echo "check_spec_testing_guide: ok"

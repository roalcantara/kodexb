#!/usr/bin/env bash
# Compile Tailwind v4 renderer CSS (same output as `mise run app styles`).
# Used in CI and Docker where mise is not available.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
input="src/shell/renderer/styles/app.css"
output="src/shell/renderer/styles/generated/app.css"
mkdir -p "$(dirname "$output")"
bunx @tailwindcss/cli -i "$input" -o "$output" --minify

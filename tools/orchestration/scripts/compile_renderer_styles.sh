#!/usr/bin/env bash
# Compile Tailwind v4 renderer CSS (same output as `mise run app styles`).
# Used in CI and Docker where mise is not available.
set -euo pipefail
root="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$root"
input="src/shell/renderer/styles/app.css"
output="src/shell/renderer/styles/generated/app.css"
mkdir -p "$(dirname "$output")"
bunx @tailwindcss/cli -i "$input" -o "$output" --minify

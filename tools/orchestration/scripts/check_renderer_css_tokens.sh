#!/usr/bin/env bash
# Fail when component CSS re-declares colours instead of using @theme tokens (REQ-007, D-008).
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DIR="$ROOT/src/shell/renderer/styles/components"

if [[ ! -d "$DIR" ]]; then
  echo "check_renderer_css_tokens: missing $DIR" >&2
  exit 1
fi

if matches="$(rg -n '#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(' "$DIR" --glob '*.css' 2>/dev/null || true)" && [[ -n "$matches" ]]; then
  echo "Hardcoded colour literals in renderer component CSS." >&2
  echo "Define values in src/shell/renderer/styles/theme.css @theme, then use var(--color-*)." >&2
  echo "" >&2
  echo "$matches" >&2
  exit 1
fi

echo "check_renderer_css_tokens: ok (component partials use theme tokens only)"

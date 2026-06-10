#!/usr/bin/env bash
# Stub CI provider: fails on first call, passes on subsequent calls.
# Persists state via a counter file.
set -u
RAW_ID="${RUN_ID:-unknown}"
SAFE_ID="$(echo "$RAW_ID" | tr -c 'a-zA-Z0-9_-' '_')"
COUNTER_FILE="${TMPDIR:-/tmp}/stub-ci-${SAFE_ID}.count"
COUNT=0
if [ -f "$COUNTER_FILE" ]; then
  CONTENT=$(cat "$COUNTER_FILE")
  case "$CONTENT" in
    ''|*[!0-9]*) COUNT=0 ;;
    *) COUNT="$CONTENT" ;;
  esac
fi
COUNT=$((COUNT + 1))
echo "$COUNT" > "${COUNTER_FILE}.tmp" && mv "${COUNTER_FILE}.tmp" "$COUNTER_FILE"
if [ "$COUNT" -eq 1 ]; then
  echo "CI failing (attempt $COUNT)"
  exit 1
fi
echo "CI passing (attempt $COUNT)"
exit 0

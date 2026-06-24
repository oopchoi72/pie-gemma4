#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5173}"
PROMPT="${1:-hello, reply in one short sentence}"

echo "==> health"
curl -sf "$BASE_URL/api/health" | python3 -m json.tool

echo "==> create session"
SESSION=$(curl -sf -X POST "$BASE_URL/api/sessions" \
  -H 'Content-Type: application/json' \
  -d '{}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "session=$SESSION"

echo "==> chat (SSE)"
OUTPUT=$(curl -sN -X POST "$BASE_URL/api/sessions/$SESSION/chat" \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"$PROMPT\"}" | tee /dev/stderr)

if echo "$OUTPUT" | rg -q '"type":"delta"'; then
  echo "RESULT: PASS (got delta)"
  exit 0
fi

if echo "$OUTPUT" | rg -qi 'killed|oom|500|error'; then
  echo "RESULT: FAIL"
  echo "$OUTPUT"
  exit 1
fi

echo "RESULT: FAIL (no delta)"
echo "$OUTPUT"
exit 1

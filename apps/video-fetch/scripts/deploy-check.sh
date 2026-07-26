#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3100}"
WORKER_URL="${2:-http://localhost:8000}"

echo "Checking web health at $BASE_URL"
curl -fsS "$BASE_URL" >/dev/null

echo "Checking worker health at $WORKER_URL/health"
curl -fsS "$WORKER_URL/health" | grep -q '"status":"ok"'

echo "Deploy check passed"

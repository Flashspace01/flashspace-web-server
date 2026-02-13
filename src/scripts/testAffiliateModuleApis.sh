#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COLLECTION_FILE="$ROOT_DIR/newman/affiliate-module.collection.json"
ENV_FILE="$ROOT_DIR/newman/affiliate-module.environment.json"
ENV_PATH="$ROOT_DIR/.env"

if [[ ! -f "$COLLECTION_FILE" ]]; then
  echo "Collection not found: $COLLECTION_FILE"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment not found: $ENV_FILE"
  exit 1
fi

# Read local server port from .env (fallback to 3000)
DEFAULT_PORT="3000"
if [[ -f "$ENV_PATH" ]]; then
  PORT_FROM_ENV="$(grep -E '^PORT=' "$ENV_PATH" | tail -n1 | cut -d'=' -f2- | tr -d '[:space:]')"
  if [[ -n "${PORT_FROM_ENV:-}" ]]; then
    DEFAULT_PORT="$PORT_FROM_ENV"
  fi
fi

BASE_URL="${BASE_URL:-http://localhost:$DEFAULT_PORT}"
AFFILIATE_EMAIL="${AFFILIATE_EMAIL:-affiliate@flashspace.com}"
AFFILIATE_PASSWORD="${AFFILIATE_PASSWORD:-Flash@1234}"
RUN_SEED="${RUN_SEED:-1}"

echo "Running affiliate module API tests with Newman..."
echo "BASE_URL=$BASE_URL"
echo "AFFILIATE_EMAIL=$AFFILIATE_EMAIL"

# Optional: keep test account/data fresh and credentials predictable.
if [[ "$RUN_SEED" == "1" ]]; then
  echo "Seeding affiliate data before tests..."
  npm run -s seed:affiliate
fi

# Preflight check: ensure the URL points to this API server
CHECK_STATUS="$(curl -s -o /tmp/flashspace_newman_check.json -w "%{http_code}" "$BASE_URL/api/auth/check-auth" || true)"
if [[ "$CHECK_STATUS" != "200" ]]; then
  echo "Preflight failed for $BASE_URL/api/auth/check-auth (status: $CHECK_STATUS)."
  echo "Ensure flashspace-web-server is running and BASE_URL is correct."
  exit 1
fi

if ! grep -q '"success"' /tmp/flashspace_newman_check.json; then
  echo "Preflight response is not from flashspace-web-server API."
  echo "BASE_URL currently points to a different service: $BASE_URL"
  exit 1
fi

npx newman run "$COLLECTION_FILE" \
  -e "$ENV_FILE" \
  --env-var "baseUrl=$BASE_URL" \
  --env-var "affiliateEmail=$AFFILIATE_EMAIL" \
  --env-var "affiliatePassword=$AFFILIATE_PASSWORD" \
  --bail \
  --reporters cli

#!/usr/bin/env bash
# Upload all API secrets to GCP Secret Manager.
# Run AFTER gcp-setup.sh completes.
# Reads current values from Fly.io environment.
set -euo pipefail

PROJECT="thecardlab-prod"

upsert_secret() {
  local name=$1
  local value=$2
  if [ -z "$value" ]; then
    echo "  ⚠  Skipping $name — value is empty"
    return
  fi
  echo -n "$value" | gcloud secrets create "$name" \
    --data-file=- --project="$PROJECT" 2>/dev/null && echo "  ✓ Created $name" || \
  echo -n "$value" | gcloud secrets versions add "$name" \
    --data-file=- --project="$PROJECT" && echo "  ✓ Updated $name"
}

echo "Uploading secrets to Secret Manager (project: $PROJECT)..."
echo "Enter values when prompted. Press Enter to skip (uses existing)."
echo ""

read_val() {
  local name=$1
  read -r -s -p "  $name: " val
  echo ""
  echo "$val"
}

upsert_secret "CLERK_SECRET_KEY"        "$(read_val CLERK_SECRET_KEY)"
upsert_secret "OPENAI_API_KEY"          "$(read_val OPENAI_API_KEY)"
upsert_secret "KV_REST_API_URL"         "$(read_val KV_REST_API_URL)"
upsert_secret "KV_REST_API_TOKEN"       "$(read_val KV_REST_API_TOKEN)"
upsert_secret "STRIPE_SECRET_KEY"       "$(read_val STRIPE_SECRET_KEY)"
upsert_secret "STRIPE_WEBHOOK_SECRET"   "$(read_val STRIPE_WEBHOOK_SECRET)"
upsert_secret "DATABASE_URL"            "$(read_val DATABASE_URL)"
upsert_secret "FIRECRAWL_API_KEY"       "$(read_val FIRECRAWL_API_KEY)"

echo ""
echo "✅ Secrets uploaded."

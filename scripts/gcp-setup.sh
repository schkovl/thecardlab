#!/usr/bin/env bash
# Run this ONCE after linking billing to thecardlab-prod at:
# https://console.cloud.google.com/billing/linkedaccount?project=thecardlab-prod
set -euo pipefail

PROJECT="thecardlab-prod"
REGION="us-east1"
SA="thecardlab-api@${PROJECT}.iam.gserviceaccount.com"
BUCKET="thecardlab-card-images"
REPO="thecardlab"
SERVICE="thecardlab-api"

echo "▶ Setting active project..."
gcloud config set project "$PROJECT"

echo "▶ Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  --project="$PROJECT"

echo "▶ Creating GCS bucket..."
gcloud storage buckets create "gs://${BUCKET}" \
  --project="$PROJECT" \
  --location="$REGION" \
  --uniform-bucket-level-access || echo "Bucket may already exist"

echo "▶ Granting SA access to GCS bucket..."
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${SA}" \
  --role="roles/storage.objectAdmin"

echo "▶ Granting SA Cloud Run invoker role..."
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA}" \
  --role="roles/run.invoker"

echo "▶ Creating Artifact Registry repo..."
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT" || echo "Repo may already exist"

echo "▶ Adding secrets to Secret Manager..."
# Reads from Fly.io secrets — export them first with: fly secrets list -a thecardlab-api
# Then set each below (replace placeholders):
read_secret() {
  local name=$1
  local value=$2
  echo -n "$value" | gcloud secrets create "$name" \
    --data-file=- \
    --project="$PROJECT" 2>/dev/null || \
  echo -n "$value" | gcloud secrets versions add "$name" \
    --data-file=- \
    --project="$PROJECT"
}

echo "  Skipping secret upload — run set-secrets.sh separately with plaintext values"

echo "▶ Granting SA access to secrets..."
for SECRET in CLERK_SECRET_KEY OPENAI_API_KEY KV_REST_API_URL KV_REST_API_TOKEN \
              STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET DATABASE_URL FIRECRAWL_API_KEY; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT" 2>/dev/null || true
done

echo "▶ Configuring Cloud Build service account..."
BUILD_SA="$(gcloud projects describe $PROJECT --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/artifactregistry.writer"

echo ""
echo "✅ GCP infrastructure ready."
echo ""
echo "Next steps:"
echo "  1. Upload secrets: bash scripts/set-secrets.sh"
echo "  2. First deploy:   gcloud builds submit --config=artifacts/api-server/cloudbuild.yaml --project=$PROJECT ."
echo "  3. Set Cloud Run URL in Vercel: VITE_API_BASE_URL=https://thecardlab-api-<hash>-ue.a.run.app"
echo "  4. Cut DNS from Fly: fly apps destroy thecardlab-api"

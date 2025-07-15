#!/usr/bin/env bash
#
# Usage:
#   chmod +x deploy
#   ./deploy
#
# This script:
#   1. Sets your Google Cloud project and region via gcloud config
#   2. Builds a Docker image
#   3. Pushes the image to Google Container Registry
#   4. Deploys the image to Cloud Run
#   5. Loads environment variables from .env, then .env.dev (which overrides .env)
#   6. Passes these env vars to Cloud Run

# Exit immediately if a command exits with a non-zero status
set -e

###############################################################################
# 1. CONFIGURE THESE VARIABLES
###############################################################################

# The Google Cloud project ID
GCLOUD_PROJECT_ID="code-reviewer-service"

# The Cloud Run region
CLOUD_RUN_REGION="us-central1"

# The name of the Cloud Run service
SERVICE_NAME="autom8-backend"

# Docker image reference in Google Container Registry
IMAGE="gcr.io/$GCLOUD_PROJECT_ID/$SERVICE_NAME:latest"

###############################################################################
# 2. LOAD .env, THEN .env.dev (override if present)
###############################################################################
if [ ! -f .env ]; then
  echo "ERROR: Cannot find .env file. Make sure it exists in this directory."
  exit 1
fi

# 2a) Load .env (ignoring # comments or blank lines)
echo "Loading environment variables from .env..."
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# 2b) If .env.dev exists, load it as well (overriding keys from .env)
if [ -f .env.dev ]; then
  echo "Loading environment variables from .env.dev (overrides .env if same keys)..."
  export $(grep -v '^#' .env.dev | grep -v '^$' | xargs)
fi

# 2c) Combine lines from both files into comma-separated KEY=VALUE pairs for Cloud Run
#     - If .env.dev doesn't exist, `cat` will skip it
ENV_FILES=".env"
if [ -f .env.dev ]; then
  ENV_FILES="$ENV_FILES .env.dev"
fi

ENV_VARS=$(cat $ENV_FILES | grep -v '^#' | grep -v '^$' | xargs | sed 's/ /,/g')
echo "ENV_VARS: $ENV_VARS"
###############################################################################
# 3. SET GCLOUD PROJECT AND REGION
###############################################################################
echo "Setting gcloud config to project: $GCLOUD_PROJECT_ID"
gcloud config set project "$GCLOUD_PROJECT_ID"

echo "Setting gcloud Cloud Run region: $CLOUD_RUN_REGION"
gcloud config set run/region "$CLOUD_RUN_REGION"

###############################################################################
# 4. BUILD DOCKER IMAGE
###############################################################################
echo "Building Docker image: $IMAGE"
docker build --platform=linux/amd64  -t "$IMAGE" .

echo "Docker build completed."

###############################################################################
# 5. PUSH DOCKER IMAGE TO GCR
###############################################################################
echo "Pushing Docker image to $IMAGE"
docker push "$IMAGE"

echo "Docker push completed."

###############################################################################
# 6. DEPLOY TO CLOUD RUN
###############################################################################
echo "Deploying service '$SERVICE_NAME' to Cloud Run in region '$CLOUD_RUN_REGION'..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --allow-unauthenticated \
  --project "$GCLOUD_PROJECT_ID" \
  --timeout 3600 \
  --set-env-vars "$ENV_VARS"

echo "Cloud Run deployment completed."

###############################################################################
# 7. PRINT SERVICE URL
###############################################################################
echo "=========================================================="
echo "Deployment successful!"
echo "Service URL:"
gcloud run services describe "$SERVICE_NAME" --region "$CLOUD_RUN_REGION" --format 'value(status.url)'
echo "=========================================================="

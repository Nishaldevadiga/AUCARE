#!/bin/bash
# =============================================================================
# MGCARE - GCP Project Setup Script
# =============================================================================
# Usage: ./scripts/setup-gcp.sh <project-id>
# =============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Error: Project ID is required${NC}"
    echo "Usage: ./scripts/setup-gcp.sh <project-id>"
    exit 1
fi

PROJECT_ID=$1
REGION=${2:-us-central1}

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  MGCARE GCP Project Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "Project ID: ${GREEN}$PROJECT_ID${NC}"
echo -e "Region: ${GREEN}$REGION${NC}"
echo ""

# Check for gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo -e "${YELLOW}Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
APIS=(
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "secretmanager.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "vpcaccess.googleapis.com"
    "compute.googleapis.com"
    "billingbudgets.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo -e "  Enabling $api..."
    gcloud services enable $api --quiet
done
echo -e "${GREEN}✓${NC} APIs enabled"

# Create Artifact Registry
echo -e "${YELLOW}Creating Artifact Registry...${NC}"
gcloud artifacts repositories create aucare-registry \
    --repository-format=docker \
    --location=$REGION \
    --description="MGCARE Docker images" \
    --quiet 2>/dev/null || echo "Registry already exists"
echo -e "${GREEN}✓${NC} Artifact Registry ready"

# Create secrets
echo -e "${YELLOW}Creating secrets in Secret Manager...${NC}"
SECRETS=("aucare-database-url" "aucare-jwt-secret" "aucare-secret-key")

for secret in "${SECRETS[@]}"; do
    gcloud secrets create $secret --quiet 2>/dev/null || echo "Secret $secret already exists"
done
echo -e "${GREEN}✓${NC} Secrets created"
echo -e "${YELLOW}Note: You need to add secret values manually via GCP Console or gcloud${NC}"

# Create Terraform state bucket
echo -e "${YELLOW}Creating Terraform state bucket...${NC}"
gsutil mb -l $REGION gs://${PROJECT_ID}-terraform-state 2>/dev/null || echo "Bucket already exists"
gsutil versioning set on gs://${PROJECT_ID}-terraform-state
echo -e "${GREEN}✓${NC} Terraform state bucket ready"

# Create service account for CI/CD
echo -e "${YELLOW}Creating CI/CD service account...${NC}"
SA_NAME="aucare-cicd"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $SA_NAME \
    --display-name="MGCARE CI/CD Service Account" \
    --quiet 2>/dev/null || echo "Service account already exists"

# Grant necessary roles
ROLES=(
    "roles/run.admin"
    "roles/artifactregistry.writer"
    "roles/secretmanager.secretAccessor"
    "roles/cloudsql.client"
    "roles/iam.serviceAccountUser"
)

for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --quiet
done
echo -e "${GREEN}✓${NC} Service account configured"

# Generate service account key
echo -e "${YELLOW}Generating service account key...${NC}"
gcloud iam service-accounts keys create ./gcp-sa-key.json \
    --iam-account=$SA_EMAIL \
    --quiet
echo -e "${GREEN}✓${NC} Service account key saved to gcp-sa-key.json"
echo -e "${RED}WARNING: Keep this key secure and never commit it to version control!${NC}"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  GCP Setup Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "1. Add secret values to Secret Manager:"
echo -e "   ${CYAN}gcloud secrets versions add aucare-database-url --data-file=-${NC}"
echo -e ""
echo -e "2. Update infrastructure/terraform/terraform.tfvars with your project settings"
echo -e ""
echo -e "3. Initialize and apply Terraform:"
echo -e "   ${CYAN}cd infrastructure/terraform${NC}"
echo -e "   ${CYAN}terraform init${NC}"
echo -e "   ${CYAN}terraform plan${NC}"
echo -e "   ${CYAN}terraform apply${NC}"
echo ""
echo -e "4. Add GCP_SA_KEY to GitHub Secrets (base64 encoded):"
echo -e "   ${CYAN}cat gcp-sa-key.json | base64${NC}"
echo ""

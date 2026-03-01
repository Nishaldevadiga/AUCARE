# GCP Setup Guide

This guide walks you through setting up Google Cloud Platform for the MGCARE SaaS platform.

## Prerequisites

1. Google Cloud account with billing enabled
2. Google Cloud SDK (`gcloud`) installed
3. $300 free credits (new accounts)

## Quick Setup

Run the automated setup script:

```bash
./scripts/setup-gcp.sh your-project-id
```

This script will:
- Enable required APIs
- Create Artifact Registry
- Create secrets in Secret Manager
- Create Terraform state bucket
- Create CI/CD service account

## Manual Setup

### 1. Create GCP Project

```bash
# Create project
gcloud projects create aucare-prod --name="MGCARE Production"

# Set project
gcloud config set project aucare-prod

# Link billing account
gcloud billing projects link aucare-prod --billing-account=BILLING_ACCOUNT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    vpcaccess.googleapis.com \
    compute.googleapis.com \
    billingbudgets.googleapis.com
```

### 3. Create Artifact Registry

```bash
gcloud artifacts repositories create aucare-registry \
    --repository-format=docker \
    --location=us-central1 \
    --description="MGCARE Docker images"
```

### 4. Create Secrets

```bash
# Create empty secrets
gcloud secrets create aucare-database-url
gcloud secrets create aucare-jwt-secret
gcloud secrets create aucare-secret-key

# Add secret values
echo -n "postgresql+asyncpg://user:pass@host/db" | \
    gcloud secrets versions add aucare-database-url --data-file=-

echo -n "your-secure-jwt-secret" | \
    gcloud secrets versions add aucare-jwt-secret --data-file=-

echo -n "your-secure-app-secret" | \
    gcloud secrets versions add aucare-secret-key --data-file=-
```

### 5. Create Terraform State Bucket

```bash
gsutil mb -l us-central1 gs://aucare-prod-terraform-state
gsutil versioning set on gs://aucare-prod-terraform-state
```

### 6. Create Service Account

```bash
# Create service account
gcloud iam service-accounts create aucare-cicd \
    --display-name="MGCARE CI/CD"

# Grant roles
SA_EMAIL="aucare-cicd@aucare-prod.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding aucare-prod \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding aucare-prod \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding aucare-prod \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding aucare-prod \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding aucare-prod \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountUser"

# Create key file
gcloud iam service-accounts keys create gcp-sa-key.json \
    --iam-account=$SA_EMAIL
```

## Cost Optimization Tips

### 1. Cloud Run Scale-to-Zero
Ensure all Cloud Run services have `min-instances: 0`:

```bash
gcloud run services update SERVICE_NAME --min-instances=0
```

### 2. Cloud SQL Instance Size
Use `db-f1-micro` which is the smallest (and cheapest) tier:
- 1 shared vCPU
- 614 MB RAM
- Suitable for development and light production

### 3. Artifact Registry Cleanup
Enable automatic cleanup of old images:

```bash
gcloud artifacts repositories set-cleanup-policies aucare-registry \
    --location=us-central1 \
    --policy=cleanup-policy.json
```

### 4. Budget Alerts
Set up budget alerts to avoid surprise charges:

```bash
# Via Console: Billing > Budgets & alerts > Create budget
# Set alerts at 25%, 50%, 75%, 90%, 100%
```

## GitHub Secrets

Add these secrets to your GitHub repository:

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Base64 encoded service account key |
| `API_BASE_URL` | Backend Cloud Run URL |

To encode the service account key:
```bash
cat gcp-sa-key.json | base64
```

## Verifying Setup

```bash
# Check enabled APIs
gcloud services list --enabled

# Check Artifact Registry
gcloud artifacts repositories list

# Check secrets
gcloud secrets list

# Check service account
gcloud iam service-accounts list
```

## Troubleshooting

### API Not Enabled Error
```bash
gcloud services enable SERVICE_NAME.googleapis.com
```

### Permission Denied
Check service account has required roles:
```bash
gcloud projects get-iam-policy PROJECT_ID \
    --filter="bindings.members:serviceAccount:SA_EMAIL"
```

### Cloud SQL Connection Issues
Ensure VPC connector is properly configured and Cloud Run service has correct annotation.

## Next Steps

1. [Deploy with Terraform](terraform-deployment.md)
2. [Set up CI/CD](ci-cd-setup.md)
3. [Configure custom domain](custom-domain.md)

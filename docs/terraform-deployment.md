# Terraform Deployment Guide

This guide covers deploying AUCARE infrastructure using Terraform.

## Prerequisites

1. [GCP Setup](gcp-setup.md) completed
2. Terraform 1.5+ installed
3. gcloud CLI authenticated

## Infrastructure Overview

The Terraform configuration deploys:

| Resource | Description |
|----------|-------------|
| Cloud Run (Frontend) | React SPA with nginx |
| Cloud Run (Backend) | FastAPI application |
| Cloud SQL | PostgreSQL db-f1-micro |
| Artifact Registry | Docker image storage |
| Secret Manager | Secure credential storage |
| VPC Connector | Private Cloud SQL access |
| Budget Alerts | Cost monitoring |

## Quick Deploy

```bash
cd infrastructure/terraform

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize
terraform init

# Plan
terraform plan

# Apply
terraform apply
```

## Configuration

### terraform.tfvars

```hcl
project_id      = "your-gcp-project-id"
region          = "us-central1"
billing_account = "XXXXXX-XXXXXX-XXXXXX"

app_name               = "aucare"
artifact_registry_name = "aucare-registry"
sql_instance_name      = "aucare-db"
database_name          = "aucare"
database_user          = "aucare-user"
vpc_connector_name     = "aucare-connector"

budget_amount = 25
alert_emails  = ["your-email@example.com"]
```

## Module Details

### Cloud Run Module

Deploys containerized applications with:
- Scale-to-zero (min_instances = 0)
- Auto-scaling (max_instances = 2)
- Health checks
- Secret Manager integration
- VPC Connector for private access

```hcl
module "backend" {
  source = "./modules/cloud-run"

  service_name  = "aucare-backend"
  image         = "us-central1-docker.pkg.dev/project/registry/backend:latest"
  port          = 8000
  min_instances = 0
  max_instances = 2
  memory        = "512Mi"
  cpu           = "1"

  env_vars = {
    ENVIRONMENT = "production"
  }

  secret_env_vars = {
    DATABASE_URL = "aucare-database-url"
  }
}
```

### Cloud SQL Module

Deploys PostgreSQL with:
- db-f1-micro tier (free tier eligible)
- 10GB HDD storage
- Automated backups
- Connection name for Cloud Run

```hcl
module "cloud_sql" {
  source = "./modules/cloud-sql"

  instance_name = "aucare-db"
  database_name = "aucare"
  database_user = "aucare-user"
}
```

### Secret Manager Module

Creates secrets with:
- Cloud Run service account access
- Automatic IAM bindings

```hcl
module "secrets" {
  source = "./modules/secrets"

  secrets = {
    "aucare-database-url" = ""
    "aucare-jwt-secret"   = ""
    "aucare-secret-key"   = ""
  }
}
```

### Budget Module

Sets up billing alerts at:
- 25% of budget
- 50% of budget
- 75% of budget
- 90% of budget
- 100% of budget

## First Deployment

### Step 1: Build and Push Images

Before Terraform can deploy Cloud Run services, images must exist:

```bash
# Authenticate Docker
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push frontend
docker build -t us-central1-docker.pkg.dev/PROJECT/aucare-registry/frontend:latest \
    -f frontend/Dockerfile frontend
docker push us-central1-docker.pkg.dev/PROJECT/aucare-registry/frontend:latest

# Build and push backend
docker build -t us-central1-docker.pkg.dev/PROJECT/aucare-registry/backend:latest \
    -f backend/Dockerfile backend
docker push us-central1-docker.pkg.dev/PROJECT/aucare-registry/backend:latest
```

### Step 2: Initialize Terraform

```bash
cd infrastructure/terraform

# Update backend config in main.tf
terraform init
```

### Step 3: Plan and Apply

```bash
# Review changes
terraform plan -out=tfplan

# Apply changes
terraform apply tfplan
```

### Step 4: Update Secrets

After Cloud SQL is created, update the database URL secret:

```bash
# Get database connection info from Terraform output
terraform output -json

# Update secret
echo -n "postgresql+asyncpg://user:pass@IP/aucare" | \
    gcloud secrets versions add aucare-database-url --data-file=-
```

### Step 5: Run Database Migrations

```bash
# Connect to Cloud SQL and run migrations
gcloud run jobs execute aucare-migrations --region=us-central1
```

## Updating Infrastructure

```bash
# Pull latest changes
git pull

# Plan changes
terraform plan

# Apply if looks good
terraform apply
```

## Destroying Infrastructure

```bash
# Destroy all resources (DANGEROUS!)
terraform destroy
```

## Outputs

After deployment, Terraform provides:

```bash
terraform output

# Example outputs:
# backend_url = "https://aucare-backend-xxxxx.run.app"
# frontend_url = "https://aucare-frontend-xxxxx.run.app"
# cloud_sql_connection_name = "project:region:instance"
```

## Troubleshooting

### Image Not Found
Ensure images are pushed before applying:
```bash
gcloud artifacts docker images list us-central1-docker.pkg.dev/PROJECT/aucare-registry
```

### Permission Denied
Check Terraform service account has required roles:
```bash
gcloud projects get-iam-policy PROJECT_ID
```

### Cloud SQL Connection Failed
1. Check VPC Connector is created
2. Verify Cloud Run has correct annotation
3. Check secret contains valid connection string

### State Lock Error
```bash
terraform force-unlock LOCK_ID
```

## Best Practices

1. **Always use `terraform plan`** before apply
2. **Store state remotely** in GCS bucket
3. **Use workspaces** for staging/production
4. **Version pin** provider versions
5. **Review costs** before applying changes

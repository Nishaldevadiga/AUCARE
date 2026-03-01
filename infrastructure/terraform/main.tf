# =============================================================================
# MGCARE Infrastructure - Main Terraform Configuration
# =============================================================================
# Cost-optimized GCP infrastructure for $300 free tier
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "aucare-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com",
    "billingbudgets.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# Artifact Registry for container images
module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id = var.project_id
  region     = var.region
  name       = var.artifact_registry_name

  depends_on = [google_project_service.apis]
}

# Cloud SQL (PostgreSQL) - db-f1-micro for free tier
module "cloud_sql" {
  source = "./modules/cloud-sql"

  project_id     = var.project_id
  region         = var.region
  instance_name  = var.sql_instance_name
  database_name  = var.database_name
  database_user  = var.database_user

  depends_on = [google_project_service.apis]
}

# Secret Manager
module "secrets" {
  source = "./modules/secrets"

  project_id = var.project_id
  secrets    = var.secrets

  depends_on = [google_project_service.apis]
}

# VPC Connector for Cloud Run to Cloud SQL
module "vpc_connector" {
  source = "./modules/vpc-connector"

  project_id = var.project_id
  region     = var.region
  name       = var.vpc_connector_name

  depends_on = [google_project_service.apis]
}

# Cloud Run - Backend
module "backend" {
  source = "./modules/cloud-run"

  project_id         = var.project_id
  region             = var.region
  service_name       = "${var.app_name}-backend"
  image              = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_name}/backend:latest"
  port               = 8000
  min_instances      = 0
  max_instances      = 2
  memory             = "512Mi"
  cpu                = "1"
  vpc_connector_name = module.vpc_connector.name
  allow_public       = true

  env_vars = {
    ENVIRONMENT = "production"
    DEBUG       = "false"
    API_PORT    = "8000"
  }

  secret_env_vars = {
    DATABASE_URL   = "aucare-database-url"
    JWT_SECRET_KEY = "aucare-jwt-secret"
    SECRET_KEY     = "aucare-secret-key"
  }

  depends_on = [
    module.artifact_registry,
    module.secrets,
    module.vpc_connector,
  ]
}

# Cloud Run - Frontend
module "frontend" {
  source = "./modules/cloud-run"

  project_id         = var.project_id
  region             = var.region
  service_name       = "${var.app_name}-frontend"
  image              = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_name}/frontend:latest"
  port               = 8080
  min_instances      = 0
  max_instances      = 2
  memory             = "256Mi"
  cpu                = "1"
  vpc_connector_name = null
  allow_public       = true

  env_vars = {}
  secret_env_vars = {}

  depends_on = [module.artifact_registry]
}

# Budget alerts
module "budget" {
  source = "./modules/budget"

  project_id     = var.project_id
  billing_account = var.billing_account
  budget_amount  = var.budget_amount
  alert_emails   = var.alert_emails

  depends_on = [google_project_service.apis]
}

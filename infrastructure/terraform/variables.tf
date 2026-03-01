# =============================================================================
# MGCARE Infrastructure - Terraform Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "aucare"
}

variable "billing_account" {
  description = "GCP Billing Account ID"
  type        = string
}

variable "artifact_registry_name" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "aucare-registry"
}

variable "sql_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "aucare-db"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "aucare"
}

variable "database_user" {
  description = "Database user"
  type        = string
  default     = "aucare-user"
}

variable "vpc_connector_name" {
  description = "VPC Connector name"
  type        = string
  default     = "aucare-connector"
}

variable "secrets" {
  description = "Map of secret names to create"
  type        = map(string)
  default = {
    "aucare-database-url" = ""
    "aucare-jwt-secret"   = ""
    "aucare-secret-key"   = ""
  }
  sensitive = true
}

variable "budget_amount" {
  description = "Monthly budget amount in USD"
  type        = number
  default     = 25
}

variable "alert_emails" {
  description = "Email addresses for budget alerts"
  type        = list(string)
  default     = []
}

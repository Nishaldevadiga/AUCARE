# =============================================================================
# AUCARE Infrastructure - Artifact Registry Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "name" {
  description = "Repository name"
  type        = string
}

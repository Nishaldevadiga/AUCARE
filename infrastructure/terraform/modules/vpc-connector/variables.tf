# =============================================================================
# AUCARE Infrastructure - VPC Connector Variables
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
  description = "VPC Connector name"
  type        = string
}

variable "network" {
  description = "VPC network name"
  type        = string
  default     = "default"
}

variable "ip_cidr_range" {
  description = "IP CIDR range for the connector"
  type        = string
  default     = "10.8.0.0/28"
}

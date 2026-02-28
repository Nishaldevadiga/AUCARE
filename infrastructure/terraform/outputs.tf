# =============================================================================
# AUCARE Infrastructure - Terraform Outputs
# =============================================================================

output "backend_url" {
  description = "Backend Cloud Run URL"
  value       = module.backend.url
}

output "frontend_url" {
  description = "Frontend Cloud Run URL"
  value       = module.frontend.url
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name"
  value       = module.cloud_sql.connection_name
}

output "cloud_sql_ip" {
  description = "Cloud SQL private IP"
  value       = module.cloud_sql.private_ip
  sensitive   = true
}

output "artifact_registry_url" {
  description = "Artifact Registry URL"
  value       = module.artifact_registry.url
}

output "vpc_connector_name" {
  description = "VPC Connector name"
  value       = module.vpc_connector.name
}

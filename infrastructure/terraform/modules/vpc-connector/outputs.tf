# =============================================================================
# AUCARE Infrastructure - VPC Connector Outputs
# =============================================================================

output "name" {
  description = "VPC Connector name"
  value       = google_vpc_access_connector.connector.name
}

output "id" {
  description = "VPC Connector ID"
  value       = google_vpc_access_connector.connector.id
}

output "self_link" {
  description = "VPC Connector self link"
  value       = google_vpc_access_connector.connector.self_link
}

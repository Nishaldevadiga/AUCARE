# =============================================================================
# MGCARE Infrastructure - Cloud SQL Outputs
# =============================================================================

output "connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.instance.connection_name
}

output "private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.instance.private_ip_address
  sensitive   = true
}

output "public_ip" {
  description = "Cloud SQL public IP address"
  value       = google_sql_database_instance.instance.public_ip_address
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = google_sql_database.database.name
}

output "database_user" {
  description = "Database user"
  value       = google_sql_user.user.name
}

output "database_password" {
  description = "Database password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "database_url" {
  description = "Full database connection URL"
  value       = "postgresql+asyncpg://${google_sql_user.user.name}:${random_password.db_password.result}@${google_sql_database_instance.instance.public_ip_address}:5432/${google_sql_database.database.name}"
  sensitive   = true
}

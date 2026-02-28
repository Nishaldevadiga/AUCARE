# =============================================================================
# AUCARE Infrastructure - Artifact Registry Outputs
# =============================================================================

output "url" {
  description = "Artifact Registry URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.registry.name}"
}

output "name" {
  description = "Repository name"
  value       = google_artifact_registry_repository.registry.name
}

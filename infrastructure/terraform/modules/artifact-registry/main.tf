# =============================================================================
# AUCARE Infrastructure - Artifact Registry Module
# =============================================================================

resource "google_artifact_registry_repository" "registry" {
  provider = google

  project       = var.project_id
  location      = var.region
  repository_id = var.name
  description   = "AUCARE Docker container registry"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }

  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"
    condition {
      older_than = "2592000s" # 30 days
    }
  }
}

# =============================================================================
# MGCARE Infrastructure - VPC Connector Module
# =============================================================================
# Serverless VPC Access connector for Cloud Run to Cloud SQL
# =============================================================================

resource "google_vpc_access_connector" "connector" {
  name          = var.name
  project       = var.project_id
  region        = var.region
  ip_cidr_range = var.ip_cidr_range
  network       = var.network

  min_instances = 2
  max_instances = 3

  machine_type = "e2-micro"
}

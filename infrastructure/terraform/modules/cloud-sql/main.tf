# =============================================================================
# MGCARE Infrastructure - Cloud SQL Module
# =============================================================================
# Cost-optimized PostgreSQL using db-f1-micro (free tier eligible)
# =============================================================================

resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  project          = var.project_id
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_size         = 10
    disk_type         = "PD_HDD"
    disk_autoresize   = false

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = false
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled    = true
      private_network = null

      authorized_networks {
        name  = "allow-all"
        value = "0.0.0.0/0"
      }
    }

    database_flags {
      name  = "max_connections"
      value = "50"
    }

    maintenance_window {
      day          = 7
      hour         = 3
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = false
      record_application_tags = false
      record_client_address   = false
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "database" {
  name     = var.database_name
  project  = var.project_id
  instance = google_sql_database_instance.instance.name
}

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_sql_user" "user" {
  name     = var.database_user
  project  = var.project_id
  instance = google_sql_database_instance.instance.name
  password = random_password.db_password.result
}

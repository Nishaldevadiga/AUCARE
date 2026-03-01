# =============================================================================
# MGCARE Infrastructure - Budget Alerts Module
# =============================================================================
# Cost protection for GCP free tier
# =============================================================================

resource "google_billing_budget" "budget" {
  billing_account = var.billing_account
  display_name    = "MGCARE Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.25
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.50
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.75
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.90
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  dynamic "all_updates_rule" {
    for_each = length(var.alert_emails) > 0 ? [1] : []
    content {
      monitoring_notification_channels = []
      disable_default_iam_recipients   = false
    }
  }
}

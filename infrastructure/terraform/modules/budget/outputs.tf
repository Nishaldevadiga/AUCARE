# =============================================================================
# AUCARE Infrastructure - Budget Outputs
# =============================================================================

output "budget_name" {
  description = "Budget display name"
  value       = google_billing_budget.budget.display_name
}

output "budget_id" {
  description = "Budget ID"
  value       = google_billing_budget.budget.name
}

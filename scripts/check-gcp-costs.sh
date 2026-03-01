#!/bin/bash
# =============================================================================
# MGCARE - GCP Cost Monitoring Script
# =============================================================================
# Usage: ./scripts/check-gcp-costs.sh
# =============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ID=$(gcloud config get-value project)

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  MGCARE GCP Cost Report${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "Project: ${GREEN}$PROJECT_ID${NC}"
echo ""

# Check Cloud Run services
echo -e "${YELLOW}Cloud Run Services:${NC}"
gcloud run services list --format="table(metadata.name,status.url,spec.template.spec.containers[0].resources.limits.memory)" 2>/dev/null || echo "No Cloud Run services"
echo ""

# Check Cloud SQL instances
echo -e "${YELLOW}Cloud SQL Instances:${NC}"
gcloud sql instances list --format="table(name,databaseVersion,settings.tier,region,state)" 2>/dev/null || echo "No Cloud SQL instances"
echo ""

# Check Artifact Registry
echo -e "${YELLOW}Artifact Registry:${NC}"
gcloud artifacts repositories list --format="table(name,format,location)" 2>/dev/null || echo "No Artifact Registry repositories"
echo ""

# Check Secret Manager
echo -e "${YELLOW}Secret Manager Secrets:${NC}"
gcloud secrets list --format="table(name)" 2>/dev/null || echo "No secrets"
echo ""

# Cost optimization tips
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Cost Optimization Tips${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "1. ${GREEN}Cloud Run${NC}: Ensure min-instances is 0 for scale-to-zero"
echo -e "2. ${GREEN}Cloud SQL${NC}: Use db-f1-micro tier (free tier eligible)"
echo -e "3. ${GREEN}Artifact Registry${NC}: Enable cleanup policies for old images"
echo -e "4. ${GREEN}Budget Alerts${NC}: Set up budget alerts at 25%, 50%, 75%, 90%"
echo ""

# Check if services are scale-to-zero
echo -e "${YELLOW}Checking scale-to-zero configuration...${NC}"
for service in $(gcloud run services list --format="value(metadata.name)" 2>/dev/null); do
    min_instances=$(gcloud run services describe $service --format="value(spec.template.metadata.annotations.'autoscaling.knative.dev/minScale')" 2>/dev/null)
    if [ "$min_instances" == "0" ] || [ -z "$min_instances" ]; then
        echo -e "  ${GREEN}✓${NC} $service: scale-to-zero enabled"
    else
        echo -e "  ${RED}✗${NC} $service: min-instances=$min_instances (should be 0)"
    fi
done
echo ""

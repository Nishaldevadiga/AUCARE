# =============================================================================
# MGCARE - Development Makefile
# =============================================================================
# Usage: make <target>
# =============================================================================

.PHONY: help install dev build test lint format clean docker-up docker-down \
        db-migrate db-upgrade db-downgrade frontend-dev backend-dev \
        terraform-init terraform-plan terraform-apply

# Default target
.DEFAULT_GOAL := help

# Colors
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(CYAN)MGCARE Development Commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Installation
# =============================================================================

install: ## Install all dependencies
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	cd frontend && npm ci
	cd backend && pip install -e ".[dev]"
	@echo "$(GREEN)Dependencies installed!$(RESET)"

install-frontend: ## Install frontend dependencies
	cd frontend && npm ci

install-backend: ## Install backend dependencies
	cd backend && pip install -e ".[dev]"

# =============================================================================
# Development
# =============================================================================

dev: ## Start all services for development
	docker-compose up -d

dev-logs: ## Show logs from all services
	docker-compose logs -f

frontend-dev: ## Start frontend development server (local)
	cd frontend && npm run dev

backend-dev: ## Start backend development server (local)
	cd backend && uvicorn app.main:app --reload --port 8000

# =============================================================================
# Docker
# =============================================================================

docker-up: ## Start Docker services
	docker-compose up -d

docker-down: ## Stop Docker services
	docker-compose down

docker-clean: ## Stop and remove Docker services with volumes
	docker-compose down -v --remove-orphans

docker-rebuild: ## Rebuild and start Docker services
	docker-compose up -d --build

docker-logs: ## Show Docker logs
	docker-compose logs -f

# =============================================================================
# Database
# =============================================================================

db-migrate: ## Create new database migration
	@read -p "Migration message: " msg; \
	cd backend && alembic revision --autogenerate -m "$$msg"

db-upgrade: ## Apply database migrations
	cd backend && alembic upgrade head

db-downgrade: ## Rollback last database migration
	cd backend && alembic downgrade -1

db-reset: ## Reset database (drop and recreate)
	docker-compose down -v
	docker-compose up -d db
	@sleep 5
	cd backend && alembic upgrade head

# =============================================================================
# Testing
# =============================================================================

test: test-frontend test-backend ## Run all tests

test-frontend: ## Run frontend tests
	cd frontend && npm run test -- --run

test-backend: ## Run backend tests
	cd backend && pytest -v

test-coverage: ## Run tests with coverage
	cd frontend && npm run test:coverage
	cd backend && pytest --cov=app --cov-report=html

# =============================================================================
# Linting & Formatting
# =============================================================================

lint: lint-frontend lint-backend ## Run all linters

lint-frontend: ## Lint frontend code
	cd frontend && npm run lint

lint-backend: ## Lint backend code
	cd backend && ruff check .

format: format-frontend format-backend ## Format all code

format-frontend: ## Format frontend code
	cd frontend && npm run format

format-backend: ## Format backend code
	cd backend && ruff format .

type-check: ## Run type checking
	cd frontend && npm run type-check
	cd backend && mypy app --ignore-missing-imports

# =============================================================================
# Build
# =============================================================================

build: build-frontend build-backend ## Build all services

build-frontend: ## Build frontend for production
	cd frontend && npm run build

build-backend: ## Build backend (currently just validates)
	cd backend && python -m py_compile app/main.py

docker-build: ## Build Docker images
	docker-compose build

# =============================================================================
# Infrastructure
# =============================================================================

terraform-init: ## Initialize Terraform
	cd infrastructure/terraform && terraform init

terraform-plan: ## Plan Terraform changes
	cd infrastructure/terraform && terraform plan

terraform-apply: ## Apply Terraform changes
	cd infrastructure/terraform && terraform apply

terraform-destroy: ## Destroy Terraform infrastructure
	cd infrastructure/terraform && terraform destroy

# =============================================================================
# Mobile (Capacitor)
# =============================================================================

mobile-init: ## Initialize Capacitor for mobile
	cd frontend && npx cap init MGCARE com.aucare.app --web-dir=dist

mobile-add-android: ## Add Android platform
	cd frontend && npx cap add android

mobile-add-ios: ## Add iOS platform
	cd frontend && npx cap add ios

mobile-sync: ## Sync web assets to mobile projects
	cd frontend && npm run build && npx cap sync

mobile-open-android: ## Open Android project in Android Studio
	cd frontend && npx cap open android

mobile-open-ios: ## Open iOS project in Xcode
	cd frontend && npx cap open ios

# =============================================================================
# Cleanup
# =============================================================================

clean: ## Clean build artifacts
	rm -rf frontend/dist frontend/node_modules/.cache
	rm -rf backend/__pycache__ backend/.pytest_cache backend/.mypy_cache
	rm -rf backend/.ruff_cache backend/htmlcov backend/.coverage
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

clean-all: clean docker-clean ## Clean everything including Docker volumes
	rm -rf frontend/node_modules
	rm -rf backend/.venv

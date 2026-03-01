# MGCARE SaaS Platform

A production-grade, cost-optimized SaaS platform scaffold built for Google Cloud Platform's $300 free tier.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MGCARE ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│   │   Mobile    │     │   Browser   │     │    PWA      │                   │
│   │  (Android/  │     │   Client    │     │   Client    │                   │
│   │    iOS)     │     │             │     │             │                   │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                   │
│          │                   │                   │                           │
│          └───────────────────┼───────────────────┘                           │
│                              │                                               │
│                              ▼                                               │
│   ┌──────────────────────────────────────────────────────────┐              │
│   │                    Cloud Run (Frontend)                   │              │
│   │               React + Vite + Tailwind + PWA               │              │
│   │                  min: 0, max: 2 instances                 │              │
│   └────────────────────────────┬─────────────────────────────┘              │
│                                │                                             │
│                                ▼                                             │
│   ┌──────────────────────────────────────────────────────────┐              │
│   │                    Cloud Run (Backend)                    │              │
│   │              FastAPI + SQLAlchemy + Async                 │              │
│   │                  min: 0, max: 2 instances                 │              │
│   └────────────┬──────────────────────────────┬──────────────┘              │
│                │                              │                              │
│                ▼                              ▼                              │
│   ┌────────────────────┐         ┌────────────────────────┐                 │
│   │  Secret Manager    │         │    Cloud SQL           │                 │
│   │  (Credentials)     │         │   (PostgreSQL)         │                 │
│   └────────────────────┘         │   db-f1-micro          │                 │
│                                  └────────────────────────┘                 │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────┐               │
│   │                  Artifact Registry                       │               │
│   │              (Docker Container Images)                   │               │
│   └─────────────────────────────────────────────────────────┘               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Python FastAPI with async SQLAlchemy
- **Mobile**: Capacitor-ready for Android & iOS
- **PWA**: Progressive Web App enabled
- **Infrastructure**: Terraform modules for GCP
- **CI/CD**: GitHub Actions pipelines
- **Cost Optimized**: Scale-to-zero, smallest instance sizes

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Google Cloud SDK (for deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/aucare.git
cd aucare

# Run setup script
./scripts/setup-local.sh

# Or manually:
cp .env.example .env
cd frontend && npm ci && cd ..
cd backend && pip install -e ".[dev]" && cd ..
docker-compose up -d

# Start development
make dev
```

### Available Commands

```bash
make help              # Show all commands
make dev               # Start all services
make test              # Run all tests
make lint              # Run linters
make format            # Format code
make build             # Build for production
make docker-up         # Start Docker services
make docker-down       # Stop Docker services
```

## Project Structure

```
aucare/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── common/       # Shared/atomic components
│   │   │   └── layout/       # Layout components
│   │   ├── pages/            # Page components
│   │   ├── routes/           # Route definitions
│   │   ├── services/         # API client layer
│   │   ├── stores/           # State management (Zustand)
│   │   ├── hooks/            # Custom hooks
│   │   ├── types/            # TypeScript types
│   │   ├── utils/            # Utility functions
│   │   ├── config/           # Configuration
│   │   └── styles/           # Global styles
│   ├── Dockerfile            # Production Dockerfile
│   ├── Dockerfile.dev        # Development Dockerfile
│   └── capacitor.config.ts   # Capacitor mobile config
│
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   └── v1/           # API version 1
│   │   │       └── endpoints/
│   │   ├── core/             # Core configuration
│   │   ├── db/               # Database setup
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Business logic
│   ├── alembic/              # Database migrations
│   ├── tests/                # Test suite
│   ├── Dockerfile            # Production Dockerfile
│   └── Dockerfile.dev        # Development Dockerfile
│
├── infrastructure/           # Infrastructure as Code
│   └── terraform/
│       ├── modules/
│       │   ├── artifact-registry/
│       │   ├── cloud-run/
│       │   ├── cloud-sql/
│       │   ├── secrets/
│       │   ├── vpc-connector/
│       │   └── budget/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
├── scripts/                  # Development & deployment scripts
│   ├── setup-local.sh        # Local setup
│   ├── setup-gcp.sh          # GCP project setup
│   └── check-gcp-costs.sh    # Cost monitoring
│
├── .github/workflows/        # CI/CD pipelines
│   ├── ci.yml                # Continuous Integration
│   └── cd.yml                # Continuous Deployment
│
├── docker-compose.yml        # Local development
├── Makefile                  # Development commands
└── README.md                 # This file
```

## Documentation

- [GCP Setup Guide](docs/gcp-setup.md)
- [Terraform Deployment Guide](docs/terraform-deployment.md)
- [Local Development Guide](docs/local-development.md)
- [Mobile Build Guide](docs/mobile-build.md)

## Cost Optimization

This scaffold is designed to stay within GCP's $300 free tier:

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| Cloud Run (Frontend) | min: 0, max: 2, 256Mi | ~$0/mo (scale-to-zero) |
| Cloud Run (Backend) | min: 0, max: 2, 512Mi | ~$0/mo (scale-to-zero) |
| Cloud SQL | db-f1-micro, 10GB HDD | ~$8/mo |
| Artifact Registry | Auto-cleanup enabled | ~$0/mo |
| Secret Manager | 3 secrets | ~$0/mo |
| VPC Connector | e2-micro | ~$5/mo |
| **Total** | | **~$13/mo** |

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- Tailwind CSS for styling
- TanStack Query for data fetching
- Zustand for state management
- Capacitor for mobile builds
- PWA enabled with Workbox

### Backend
- FastAPI with async support
- SQLAlchemy 2.0 with asyncpg
- Alembic for migrations
- Pydantic for validation
- JWT authentication scaffold
- Structured logging with structlog

### Infrastructure
- Terraform for IaC
- Google Cloud Run (serverless)
- Cloud SQL PostgreSQL
- Secret Manager
- Artifact Registry
- Budget alerts

## License

MIT License - see [LICENSE](LICENSE) for details.

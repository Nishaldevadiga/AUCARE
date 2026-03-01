# Local Development Guide

This guide covers setting up and running MGCARE locally for development.

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Git

## Quick Start

```bash
# Run the setup script
./scripts/setup-local.sh

# Start all services
make dev

# Or start individual services
make frontend-dev  # Frontend only
make backend-dev   # Backend only
```

## Manual Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/aucare.git
cd aucare
```

### 2. Environment Files

```bash
# Root environment
cp .env.example .env

# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

### 3. Install Dependencies

```bash
# Frontend
cd frontend
npm ci
cd ..

# Backend
cd backend
pip install -e ".[dev]"
cd ..
```

### 4. Start Services

#### Option A: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option B: Local Services

Terminal 1 - Database:
```bash
docker-compose up -d db redis
```

Terminal 2 - Backend:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Terminal 3 - Frontend:
```bash
cd frontend
npm run dev
```

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/api/docs |
| Database | localhost:5432 |
| Redis | localhost:6379 |

## Development Workflow

### Making Changes

1. **Frontend Changes**
   - Edit files in `frontend/src/`
   - Vite hot-reloads automatically
   - Check browser console for errors

2. **Backend Changes**
   - Edit files in `backend/app/`
   - Uvicorn auto-reloads on save
   - Check terminal for errors

3. **Database Changes**
   ```bash
   # Create migration
   make db-migrate
   # Message: "add user table"

   # Apply migration
   make db-upgrade

   # Rollback if needed
   make db-downgrade
   ```

### Running Tests

```bash
# All tests
make test

# Frontend only
make test-frontend

# Backend only
make test-backend

# With coverage
make test-coverage
```

### Linting & Formatting

```bash
# Lint all
make lint

# Format all
make format

# Type checking
make type-check
```

## Project Structure

### Frontend (`frontend/`)

```
src/
├── components/          # React components
│   ├── common/          # Reusable components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── LoadingSpinner.tsx
│   └── layout/          # Layout components
│       ├── Layout.tsx
│       ├── Header.tsx
│       └── Footer.tsx
├── pages/               # Page components
├── routes/              # React Router config
├── services/            # API client
│   └── api/
│       └── client.ts
├── stores/              # Zustand state stores
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
├── utils/               # Utility functions
├── config/              # Configuration
└── styles/              # Global CSS
```

### Backend (`backend/`)

```
app/
├── api/                 # API layer
│   ├── deps.py          # Dependencies (DI)
│   └── v1/
│       ├── __init__.py  # Router aggregation
│       └── endpoints/
│           ├── health.py
│           └── auth.py
├── core/                # Core modules
│   ├── config.py        # Settings
│   ├── logging.py       # Structured logging
│   └── security.py      # JWT, passwords
├── db/                  # Database
│   ├── base.py          # Base model
│   └── session.py       # Session management
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── services/            # Business logic
└── main.py              # Application entry
```

## Adding New Features

### Frontend Component

1. Create component in appropriate directory:
   ```typescript
   // frontend/src/components/common/Card.tsx
   interface CardProps {
     children: React.ReactNode;
     className?: string;
   }

   export function Card({ children, className }: CardProps) {
     return (
       <div className={cn('card', className)}>
         {children}
       </div>
     );
   }
   ```

2. Export from index:
   ```typescript
   // frontend/src/components/common/index.ts
   export { Card } from './Card';
   ```

### Backend Endpoint

1. Create endpoint:
   ```python
   # backend/app/api/v1/endpoints/users.py
   from fastapi import APIRouter, Depends
   from app.api.deps import DBSession, CurrentUserId

   router = APIRouter()

   @router.get("/me")
   async def get_current_user(
       db: DBSession,
       user_id: CurrentUserId,
   ):
       # Implementation
       pass
   ```

2. Register router:
   ```python
   # backend/app/api/v1/__init__.py
   from app.api.v1.endpoints import users

   router.include_router(users.router, prefix="/users", tags=["Users"])
   ```

### Database Model

1. Create model:
   ```python
   # backend/app/models/post.py
   from sqlalchemy import String, ForeignKey
   from sqlalchemy.orm import Mapped, mapped_column
   from app.db.base import Base

   class Post(Base):
       __tablename__ = "posts"

       title: Mapped[str] = mapped_column(String(255))
       user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
   ```

2. Import in models init:
   ```python
   # backend/app/models/__init__.py
   from app.models.post import Post
   ```

3. Create migration:
   ```bash
   make db-migrate  # "add posts table"
   make db-upgrade
   ```

## Debugging

### Frontend

- React DevTools browser extension
- Vite debug mode: `DEBUG=vite:* npm run dev`
- Console logging with structured data

### Backend

- FastAPI auto-generates OpenAPI docs at `/api/docs`
- Enable debug logging: `LOG_LEVEL=DEBUG`
- Use Python debugger: `import pdb; pdb.set_trace()`

### Database

```bash
# Connect to database
docker-compose exec db psql -U postgres -d aucare

# Common queries
\dt              # List tables
\d users         # Describe table
SELECT * FROM users;
```

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :8000

# Kill process
kill -9 PID
```

### Database Connection Error

```bash
# Check if database is running
docker-compose ps

# Restart database
docker-compose restart db

# Reset database
make db-reset
```

### Node Modules Issues

```bash
# Clear and reinstall
rm -rf frontend/node_modules
cd frontend && npm ci
```

### Python Environment Issues

```bash
# Create fresh virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

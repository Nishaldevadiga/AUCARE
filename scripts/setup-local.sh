#!/bin/bash
# =============================================================================
# AUCARE - Local Development Setup Script
# =============================================================================
# Usage: ./scripts/setup-local.sh
# =============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  AUCARE Local Development Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} $1 found"
}

echo -e "${YELLOW}Checking required tools...${NC}"
check_command docker
check_command docker-compose
check_command node
check_command npm
check_command python3
check_command pip

echo ""

# Create environment files if they don't exist
echo -e "${YELLOW}Setting up environment files...${NC}"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env from .env.example"
else
    echo -e "${GREEN}✓${NC} .env already exists"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✓${NC} Created frontend/.env from frontend/.env.example"
else
    echo -e "${GREEN}✓${NC} frontend/.env already exists"
fi

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓${NC} Created backend/.env from backend/.env.example"
else
    echo -e "${GREEN}✓${NC} backend/.env already exists"
fi

echo ""

# Install dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd frontend && npm ci
cd ..
echo -e "${GREEN}✓${NC} Frontend dependencies installed"

echo ""
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend && pip install -e ".[dev]"
cd ..
echo -e "${GREEN}✓${NC} Backend dependencies installed"

echo ""

# Start Docker services
echo -e "${YELLOW}Starting Docker services...${NC}"
docker-compose up -d db redis
echo -e "${GREEN}✓${NC} Docker services started"

# Wait for database
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 5

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
cd backend && alembic upgrade head 2>/dev/null || echo "No migrations to run"
cd ..
echo -e "${GREEN}✓${NC} Database ready"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "Start development with:"
echo -e "  ${CYAN}make dev${NC}          - Start all services with Docker"
echo -e "  ${CYAN}make frontend-dev${NC} - Start frontend only"
echo -e "  ${CYAN}make backend-dev${NC}  - Start backend only"
echo ""
echo -e "Other useful commands:"
echo -e "  ${CYAN}make help${NC}         - Show all available commands"
echo -e "  ${CYAN}make test${NC}         - Run all tests"
echo -e "  ${CYAN}make lint${NC}         - Run linters"
echo ""

-- =============================================================================
-- AUCARE - Database Initialization Script
-- =============================================================================
-- This script runs when the PostgreSQL container starts for the first time
-- =============================================================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE aucare TO postgres;

-- Create test database for running tests
CREATE DATABASE aucare_test;
GRANT ALL PRIVILEGES ON DATABASE aucare_test TO postgres;

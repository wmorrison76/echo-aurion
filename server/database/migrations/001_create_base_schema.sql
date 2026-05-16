-- ============================================================================
-- Migration 001: Base Schema Setup
-- Creates foundational tables, functions, and triggers
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search (optional but recommended)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Function to automatically update updated_at timestamp
 */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

/**
 * Function to prevent modification of archived records
 */
CREATE OR REPLACE FUNCTION prevent_archived_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot modify archived record';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- ORGANIZATIONS TABLE (Multi-tenancy)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- Contact
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US',
    
    -- Subscription
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status) WHERE archived_at IS NULL;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USERS TABLE (Authentication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Auth
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- For local auth
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url TEXT,
    
    -- Role & Permissions
    role VARCHAR(50) DEFAULT 'user', -- admin, manager, user, etc.
    permissions JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, suspended, invited
    last_login_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_users_org_id ON users(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status) WHERE archived_at IS NULL;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOG TABLE (Track all changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- What changed
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    
    -- Who changed it
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- SEED DATA (Development only)
-- ============================================================================

-- Create default organization (for development/testing)
INSERT INTO organizations (id, name, slug, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Demo Restaurant',
    'demo-restaurant',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Create default admin user
INSERT INTO users (id, org_id, email, first_name, last_name, role, status, email_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@demo.com',
    'Admin',
    'User',
    'admin',
    'active',
    TRUE
) ON CONFLICT (id) DO NOTHING;


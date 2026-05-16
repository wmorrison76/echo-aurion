-- ============================================================================
-- Migration 007: Integration Command Center (Enterprise)
-- Connections, config, desktop agents, audit log
-- ============================================================================

-- ============================================================================
-- INTEGRATION CONNECTIONS (per-org connected systems)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    system_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    credentials_encrypted TEXT,
    
    last_sync_at TIMESTAMPTZ,
    data_points_synced BIGINT DEFAULT 0,
    error_message TEXT,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(org_id, system_id)
);

CREATE INDEX idx_integration_connections_org ON integration_connections(org_id);
CREATE INDEX idx_integration_connections_system ON integration_connections(org_id, system_id);

CREATE TRIGGER update_integration_connections_updated_at
    BEFORE UPDATE ON integration_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INTEGRATION CONFIG (outlets, GL mappings, invoice rules per org)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    
    outlets JSONB NOT NULL DEFAULT '[]',
    gl_mappings JSONB NOT NULL DEFAULT '[]',
    invoice_rules JSONB NOT NULL DEFAULT '[]',
    
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_config_org ON integration_config(org_id);

CREATE TRIGGER update_integration_config_updated_at
    BEFORE UPDATE ON integration_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DESKTOP AGENTS (Mac/Windows agents registered per org)
-- ============================================================================

CREATE TABLE IF NOT EXISTS desktop_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    device_id VARCHAR(255) NOT NULL,
    os VARCHAR(20) NOT NULL,
    version VARCHAR(50),
    
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(org_id, device_id)
);

CREATE INDEX idx_desktop_agents_org ON desktop_agents(org_id);
CREATE INDEX idx_desktop_agents_last_seen ON desktop_agents(last_seen_at);

-- ============================================================================
-- INTEGRATION AUDIT LOG (who connected what, when)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(50) NOT NULL,
    system_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_audit_org ON integration_audit_log(org_id);
CREATE INDEX idx_integration_audit_created ON integration_audit_log(created_at);

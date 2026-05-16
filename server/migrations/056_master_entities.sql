-- ============================================================================
-- Master Entities Schema
-- ============================================================================
-- Phase 1 Critical Fix: MF-002 Canonical Data Model Missing
-- 
-- This migration creates the master_entities table which serves as the
-- single source of truth for all entities across LUCCCA modules.
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Master Entities Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS master_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    org_id UUID NOT NULL,
    outlet_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT master_entities_canonical_unique UNIQUE (canonical_id, org_id),
    CONSTRAINT master_entities_status_check CHECK (status IN ('active', 'inactive', 'archived')),
    CONSTRAINT master_entities_type_check CHECK (entity_type IN (
        'product', 'ingredient', 'sku', 'recipe', 'menu_item',
        'supplier', 'vendor', 'employee', 'customer', 'guest',
        'event', 'beo', 'outlet', 'location', 'department',
        'account', 'invoice', 'purchase_order'
    ))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_master_entities_org_id ON master_entities(org_id);
CREATE INDEX IF NOT EXISTS idx_master_entities_entity_type ON master_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_master_entities_org_type ON master_entities(org_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_master_entities_outlet ON master_entities(outlet_id) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_master_entities_status ON master_entities(status);
CREATE INDEX IF NOT EXISTS idx_master_entities_name ON master_entities(name);
CREATE INDEX IF NOT EXISTS idx_master_entities_canonical ON master_entities(canonical_id);

-- GIN index for JSONB data queries
CREATE INDEX IF NOT EXISTS idx_master_entities_data ON master_entities USING GIN (data);

-- ============================================================================
-- Entity Aliases Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES master_entities(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    alias_type VARCHAR(50) NOT NULL,
    alias_value VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT entity_aliases_type_check CHECK (alias_type IN (
        'sku', 'barcode', 'gtin', 'upc', 'vendor_code', 'legacy_id', 'external_id'
    )),
    -- Unique alias per org/type/value combination
    CONSTRAINT entity_aliases_unique UNIQUE (org_id, alias_type, alias_value)
);

-- Indexes for alias lookups
CREATE INDEX IF NOT EXISTS idx_entity_aliases_entity ON entity_aliases(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_aliases_lookup ON entity_aliases(org_id, alias_type, alias_value);
CREATE INDEX IF NOT EXISTS idx_entity_aliases_org ON entity_aliases(org_id);
CREATE INDEX IF NOT EXISTS idx_entity_aliases_primary ON entity_aliases(entity_id) WHERE is_primary = TRUE;

-- ============================================================================
-- Entity Metadata Table (for extended metadata like sync status)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES master_entities(id) ON DELETE CASCADE,
    source_module VARCHAR(100) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    conflict_details TEXT,
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT entity_metadata_sync_status_check CHECK (sync_status IN (
        'synced', 'pending', 'conflict', 'error'
    )),
    -- One metadata per entity per source
    CONSTRAINT entity_metadata_unique UNIQUE (entity_id, source_module)
);

-- Indexes for metadata lookups
CREATE INDEX IF NOT EXISTS idx_entity_metadata_entity ON entity_metadata(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_metadata_source ON entity_metadata(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_entity_metadata_sync ON entity_metadata(sync_status);

-- ============================================================================
-- Entity Links Table (for tracking merged/linked entities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_entity_id UUID NOT NULL REFERENCES master_entities(id) ON DELETE CASCADE,
    linked_entity_id UUID NOT NULL REFERENCES master_entities(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL DEFAULT 'merged',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT entity_links_type_check CHECK (link_type IN ('merged', 'related', 'parent', 'child')),
    CONSTRAINT entity_links_different CHECK (primary_entity_id != linked_entity_id),
    CONSTRAINT entity_links_unique UNIQUE (primary_entity_id, linked_entity_id)
);

-- Indexes for link lookups
CREATE INDEX IF NOT EXISTS idx_entity_links_primary ON entity_links(primary_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_links_linked ON entity_links(linked_entity_id);

-- ============================================================================
-- Entity Change Log (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_change_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    org_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason TEXT,
    
    -- Hash chain for tamper evidence
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64) NOT NULL,
    
    -- Constraints
    CONSTRAINT entity_change_log_type_check CHECK (change_type IN (
        'created', 'updated', 'deleted', 'merged', 'restored'
    ))
);

-- Indexes for change log queries
CREATE INDEX IF NOT EXISTS idx_entity_change_log_entity ON entity_change_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_change_log_org ON entity_change_log(org_id);
CREATE INDEX IF NOT EXISTS idx_entity_change_log_time ON entity_change_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_change_log_type ON entity_change_log(entity_type);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE master_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_change_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for master_entities
DROP POLICY IF EXISTS master_entities_org_isolation ON master_entities;
CREATE POLICY master_entities_org_isolation ON master_entities
    FOR ALL
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- RLS Policies for entity_aliases
DROP POLICY IF EXISTS entity_aliases_org_isolation ON entity_aliases;
CREATE POLICY entity_aliases_org_isolation ON entity_aliases
    FOR ALL
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- RLS Policies for entity_metadata (via entity join)
DROP POLICY IF EXISTS entity_metadata_org_isolation ON entity_metadata;
CREATE POLICY entity_metadata_org_isolation ON entity_metadata
    FOR ALL
    USING (
        entity_id IN (
            SELECT id FROM master_entities 
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

-- RLS Policies for entity_links (via entity join)
DROP POLICY IF EXISTS entity_links_org_isolation ON entity_links;
CREATE POLICY entity_links_org_isolation ON entity_links
    FOR ALL
    USING (
        primary_entity_id IN (
            SELECT id FROM master_entities 
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

-- RLS Policies for entity_change_log
DROP POLICY IF EXISTS entity_change_log_org_isolation ON entity_change_log;
CREATE POLICY entity_change_log_org_isolation ON entity_change_log
    FOR ALL
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ============================================================================
-- Triggers for automatic timestamp updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_master_entity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS master_entities_update_timestamp ON master_entities;
CREATE TRIGGER master_entities_update_timestamp
    BEFORE UPDATE ON master_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_master_entity_timestamp();

DROP TRIGGER IF EXISTS entity_metadata_update_timestamp ON entity_metadata;
CREATE TRIGGER entity_metadata_update_timestamp
    BEFORE UPDATE ON entity_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_master_entity_timestamp();

-- ============================================================================
-- Trigger for change log (audit trail)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_entity_changes()
RETURNS TRIGGER AS $$
DECLARE
    change_type_val VARCHAR(20);
    prev_hash VARCHAR(64);
    curr_hash VARCHAR(64);
BEGIN
    -- Determine change type
    IF TG_OP = 'INSERT' THEN
        change_type_val := 'created';
    ELSIF TG_OP = 'UPDATE' THEN
        change_type_val := 'updated';
    ELSIF TG_OP = 'DELETE' THEN
        change_type_val := 'deleted';
    END IF;
    
    -- Get previous hash for chain
    SELECT current_hash INTO prev_hash 
    FROM entity_change_log 
    WHERE entity_id = COALESCE(NEW.id, OLD.id)
    ORDER BY changed_at DESC 
    LIMIT 1;
    
    -- Calculate current hash
    curr_hash := encode(
        sha256(
            (COALESCE(prev_hash, '') || change_type_val || COALESCE(NEW.data::text, OLD.data::text, ''))::bytea
        ),
        'hex'
    );
    
    -- Insert change log entry
    INSERT INTO entity_change_log (
        entity_id, org_id, entity_type, change_type,
        previous_data, new_data, previous_hash, current_hash
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.org_id, OLD.org_id),
        COALESCE(NEW.entity_type, OLD.entity_type),
        change_type_val,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        prev_hash,
        curr_hash
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS master_entities_change_log ON master_entities;
CREATE TRIGGER master_entities_change_log
    AFTER INSERT OR UPDATE OR DELETE ON master_entities
    FOR EACH ROW
    EXECUTE FUNCTION log_entity_changes();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to resolve entity by alias
CREATE OR REPLACE FUNCTION resolve_entity_by_alias(
    p_org_id UUID,
    p_alias_type VARCHAR(50),
    p_alias_value VARCHAR(255)
) RETURNS TABLE (
    entity_id UUID,
    canonical_id VARCHAR(100),
    entity_type VARCHAR(50),
    name VARCHAR(255),
    data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.id,
        me.canonical_id,
        me.entity_type,
        me.name,
        me.data
    FROM master_entities me
    INNER JOIN entity_aliases ea ON ea.entity_id = me.id
    WHERE ea.org_id = p_org_id
      AND ea.alias_type = p_alias_type
      AND ea.alias_value = p_alias_value
      AND me.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to get entity with all aliases
CREATE OR REPLACE FUNCTION get_entity_with_aliases(p_entity_id UUID)
RETURNS TABLE (
    id UUID,
    canonical_id VARCHAR(100),
    entity_type VARCHAR(50),
    org_id UUID,
    name VARCHAR(255),
    description TEXT,
    data JSONB,
    status VARCHAR(20),
    aliases JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.id,
        me.canonical_id,
        me.entity_type,
        me.org_id,
        me.name,
        me.description,
        me.data,
        me.status,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'alias_type', ea.alias_type,
                    'alias_value', ea.alias_value,
                    'source', ea.source,
                    'is_primary', ea.is_primary
                )
            ) FILTER (WHERE ea.id IS NOT NULL),
            '[]'::jsonb
        ) as aliases
    FROM master_entities me
    LEFT JOIN entity_aliases ea ON ea.entity_id = me.id
    WHERE me.id = p_entity_id
    GROUP BY me.id, me.canonical_id, me.entity_type, me.org_id, me.name, me.description, me.data, me.status;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration Version Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by VARCHAR(100)
);

INSERT INTO migration_versions (version, description, applied_by)
VALUES ('056_master_entities', 'Create master entities schema for canonical data model', 'phase1_migration')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- Grant permissions (adjust as needed for your roles)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON master_entities TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON entity_aliases TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON entity_metadata TO app_user;
-- GRANT SELECT, INSERT ON entity_change_log TO app_user;
-- GRANT SELECT ON entity_links TO app_user;

-- ============================================================================
-- Migration 004: CRM Domain  
-- ============================================================================

CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    tags TEXT[],
    
    -- Contact
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Source
    lead_source VARCHAR(50) NOT NULL,
    referred_by VARCHAR(200),
    
    -- Status
    status VARCHAR(50) DEFAULT 'new',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    
    -- Event interest
    event_type VARCHAR(100),
    event_date TIMESTAMPTZ,
    estimated_guests INTEGER,
    estimated_budget INTEGER,
    
    -- Qualification
    qualified_at TIMESTAMPTZ,
    disqualified_at TIMESTAMPTZ,
    disqualification_reason TEXT,
    
    -- Conversion
    converted_to_client_id UUID, -- References clients
    converted_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    next_action_date TIMESTAMPTZ,
    next_action_type VARCHAR(100),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_prospects_org ON prospects(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_assigned ON prospects(assigned_to);

CREATE TRIGGER update_prospects_updated_at
    BEFORE UPDATE ON prospects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    tags TEXT[],
    
    -- Contact
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    
    -- Client type
    client_type VARCHAR(50) NOT NULL,
    
    -- Relationship
    account_manager UUID REFERENCES users(id) ON DELETE SET NULL,
    first_event_date TIMESTAMPTZ,
    last_event_date TIMESTAMPTZ,
    total_events INTEGER DEFAULT 0,
    
    -- Value
    lifetime_value INTEGER DEFAULT 0,
    average_event_value INTEGER DEFAULT 0,
    
    -- Preferences
    preferred_contact_method VARCHAR(20),
    dietary_restrictions TEXT[],
    special_requests TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_clients_org ON clients(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_status ON clients(status);

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


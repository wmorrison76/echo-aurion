-- ============================================================================
-- Migration 003: BEO/Events Domain
-- ============================================================================

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    location_id UUID, -- Could reference a locations table
    
    -- Capacity
    max_capacity INTEGER NOT NULL,
    min_capacity INTEGER,
    square_feet NUMERIC(10,2),
    ceiling_height NUMERIC(5,2),
    
    -- Features
    has_av BOOLEAN DEFAULT FALSE,
    has_kitchen BOOLEAN DEFAULT FALSE,
    has_bar BOOLEAN DEFAULT FALSE,
    has_dance_floor BOOLEAN DEFAULT FALSE,
    has_stage BOOLEAN DEFAULT FALSE,
    
    -- Pricing
    rental_rate INTEGER NOT NULL DEFAULT 0, -- cents
    rental_rate_type VARCHAR(20) DEFAULT 'hourly', -- hourly, daily, flat
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Media
    photo_urls TEXT[],
    floor_plan_url TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_rooms_org ON rooms(org_id) WHERE archived_at IS NULL;

CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS beos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    tags TEXT[],
    
    -- Dates
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    
    -- Approval
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Client
    client_id UUID, -- References clients table
    contact_name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    setup_time VARCHAR(5) NOT NULL, -- HH:MM
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    breakdown_time VARCHAR(5),
    
    -- Guests
    guaranteed_guests INTEGER NOT NULL,
    estimated_guests INTEGER NOT NULL,
    actual_guests INTEGER,
    
    -- Rooms
    room_ids UUID[],
    setup_style VARCHAR(100),
    
    -- Menu & Bar
    menu_id UUID, -- References event_menus
    has_bar BOOLEAN DEFAULT FALSE,
    bar_type VARCHAR(20),
    
    -- Financials
    estimated_revenue INTEGER NOT NULL DEFAULT 0,
    actual_revenue INTEGER,
    deposit_amount INTEGER NOT NULL DEFAULT 0,
    deposit_paid BOOLEAN DEFAULT FALSE,
    deposit_paid_date TIMESTAMPTZ,
    balance_due INTEGER NOT NULL DEFAULT 0,
    balance_due_date TIMESTAMPTZ NOT NULL,
    
    -- Staffing
    servers_needed INTEGER DEFAULT 0,
    chef_required BOOLEAN DEFAULT FALSE,
    bartenders_needed INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'inquiry',
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    cancellation_fee INTEGER,
    
    -- Documents
    contract_url TEXT,
    floor_plan_url TEXT,
    
    -- Notes
    special_requests TEXT,
    dietary_restrictions TEXT,
    internal_notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_beos_org ON beos(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_beos_event_date ON beos(event_date);
CREATE INDEX idx_beos_status ON beos(status);
CREATE INDEX idx_beos_client ON beos(client_id);

CREATE TRIGGER update_beos_updated_at
    BEFORE UPDATE ON beos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


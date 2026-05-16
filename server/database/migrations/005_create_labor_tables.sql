-- ============================================================================
-- Migration 005: Labor/HR Domain
-- ============================================================================

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    department VARCHAR(100) NOT NULL,
    
    min_pay_rate INTEGER NOT NULL,
    max_pay_rate INTEGER NOT NULL,
    default_pay_rate INTEGER NOT NULL,
    
    required_certifications TEXT[],
    experience_required TEXT,
    responsibilities TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_positions_org ON positions(org_id) WHERE archived_at IS NULL;

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth TIMESTAMPTZ,
    
    employee_number VARCHAR(50) NOT NULL,
    hire_date TIMESTAMPTZ NOT NULL,
    termination_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active',
    
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
    department VARCHAR(100) NOT NULL,
    location_id UUID,
    
    pay_rate INTEGER NOT NULL,
    pay_type VARCHAR(20) NOT NULL,
    pay_frequency VARCHAR(20),
    
    tax_id VARCHAR(50),
    w4_on_file BOOLEAN DEFAULT FALSE,
    i9_on_file BOOLEAN DEFAULT FALSE,
    
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ,
    
    CONSTRAINT unique_employee_number UNIQUE(org_id, employee_number)
);

CREATE INDEX idx_employees_org ON employees(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_position ON employees(position_id);

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

---

CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
    location_id UUID,
    
    shift_date TIMESTAMPTZ NOT NULL,
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    
    status VARCHAR(50) DEFAULT 'scheduled',
    
    actual_start_time VARCHAR(5),
    actual_end_time VARCHAR(5),
    actual_break_minutes INTEGER,
    
    scheduled_hours NUMERIC(5,2) NOT NULL,
    actual_hours NUMERIC(5,2),
    overtime_hours NUMERIC(5,2) DEFAULT 0,
    
    regular_pay INTEGER NOT NULL DEFAULT 0,
    overtime_pay INTEGER DEFAULT 0,
    total_pay INTEGER NOT NULL DEFAULT 0,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_shifts_org ON shifts(org_id);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_shifts_status ON shifts(status);

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

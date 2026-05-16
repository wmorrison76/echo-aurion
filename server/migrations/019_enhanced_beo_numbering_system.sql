-- Migration: Enhanced BEO Numbering System
-- Purpose: Implement new BEO numbering format: AUR-[GL]-[YYYYMMDD]-[Type]-[Seq]
-- Features: Event type support, atomic sequence generation, GL code mapping
-- Date: 2025-01-16

-- =====================================================
-- EVENT TYPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  code VARCHAR(10) NOT NULL, -- e.g., "WED", "COR", "BAN"
  label VARCHAR(100) NOT NULL, -- e.g., "Wedding", "Corporate Event"
  description TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color for UI
  icon VARCHAR(50), -- Icon name (lucide-react)
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_event_types_org ON event_types(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_event_types_code ON event_types(code);

-- =====================================================
-- OUTLET GL CODE MAPPING
-- =====================================================

CREATE TABLE IF NOT EXISTS outlet_gl_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  outlet_id UUID NOT NULL,
  gl_code VARCHAR(20) NOT NULL, -- e.g., "0" for restaurant, "1" for bar
  gl_account_code VARCHAR(50), -- Full GL account code e.g., "4100-00-00"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (outlet_id) REFERENCES calendar_outlets(id) ON DELETE CASCADE,
  UNIQUE(org_id, outlet_id)
);

CREATE INDEX IF NOT EXISTS idx_outlet_gl_org_outlet ON outlet_gl_codes(org_id, outlet_id);

-- =====================================================
-- BEO SEQUENCE TRACKER (Atomic sequence generation)
-- =====================================================

CREATE TABLE IF NOT EXISTS beo_sequence_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_date DATE NOT NULL,
  event_type_code VARCHAR(10) NOT NULL,
  gl_code VARCHAR(20) NOT NULL,
  
  -- Atomic counter for this org/date/type/gl combination
  next_sequence_number INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(org_id, event_date, event_type_code, gl_code)
);

CREATE INDEX IF NOT EXISTS idx_beo_seq_org_date ON beo_sequence_tracker(org_id, event_date);

-- =====================================================
-- SEED DEFAULT EVENT TYPES
-- =====================================================

INSERT INTO event_types (org_id, code, label, description, color, icon, sort_order)
SELECT 
  o.id,
  code,
  label,
  description,
  color,
  icon,
  sort_order
FROM organizations o,
LATERAL (
  VALUES
    ('WED', 'Wedding', 'Wedding reception and ceremony', '#ec4899', 'Heart', 1),
    ('COR', 'Corporate', 'Corporate meeting or event', '#3b82f6', 'Briefcase', 2),
    ('BAN', 'Banquet/Gala', 'Formal banquet or gala dinner', '#fbbf24', 'Sparkles', 3),
    ('BIR', 'Birthday', 'Birthday party celebration', '#8b5cf6', 'Cake', 4),
    ('ANV', 'Anniversary', 'Anniversary celebration', '#f97316', 'Clock', 5),
    ('CON', 'Conference', 'Conference or meeting', '#06b6d4', 'Users', 6),
    ('REU', 'Reunion', 'Reunion gathering', '#10b981', 'People', 7),
    ('REC', 'Reception', 'Reception event', '#6366f1', 'GlassesIcon', 8),
    ('SHW', 'Shower', 'Bridal or baby shower', '#ec4899', 'Gift', 9),
    ('HOL', 'Holiday', 'Holiday party', '#ef4444', 'Zap', 10)
) AS t(code, label, description, color, icon, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM event_types et 
  WHERE et.org_id = o.id AND et.code = t.code
)
ON CONFLICT (org_id, code) DO NOTHING;

-- =====================================================
-- ENHANCED BEO NUMBER GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_enhanced_beo_number(
  org_id UUID,
  outlet_id UUID,
  event_date DATE,
  event_type_code VARCHAR(10)
)
RETURNS VARCHAR AS $$
DECLARE
  gl_code VARCHAR(20);
  year_month_day VARCHAR(8);
  seq_number INTEGER;
  beo_number VARCHAR;
BEGIN
  -- Get GL code for outlet (default to "0" if not found)
  SELECT COALESCE(ogc.gl_code, '0')
  INTO gl_code
  FROM outlet_gl_codes ogc
  WHERE ogc.org_id = $1 AND ogc.outlet_id = $2
  LIMIT 1;
  
  IF gl_code IS NULL THEN
    gl_code := '0';
  END IF;
  
  -- Format date as YYYYMMDD
  year_month_day := TO_CHAR(event_date, 'YYYYMMDD');
  
  -- Get and increment sequence number atomically
  INSERT INTO beo_sequence_tracker (org_id, event_date, event_type_code, gl_code, next_sequence_number)
  VALUES ($1, event_date, event_type_code, gl_code, 1)
  ON CONFLICT (org_id, event_date, event_type_code, gl_code)
  DO UPDATE SET next_sequence_number = beo_sequence_tracker.next_sequence_number + 1
  RETURNING next_sequence_number INTO seq_number;
  
  -- Format: AUR-[GL]-[YYYYMMDD]-[Type]-[Seq]
  -- Example: AUR-0-20250314-WED-0001
  beo_number := 'AUR-' || gl_code || '-' || year_month_day || '-' || event_type_code || '-' || LPAD(seq_number::TEXT, 4, '0');
  
  RETURN beo_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE EXISTING BEO TABLE
-- =====================================================

-- Add event_type_code column to track the event type
ALTER TABLE beo_banquet_orders
ADD COLUMN IF NOT EXISTS event_type_code VARCHAR(10);

-- Add GL code column for audit trail
ALTER TABLE beo_banquet_orders
ADD COLUMN IF NOT EXISTS gl_code VARCHAR(20);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_beo_event_type ON beo_banquet_orders(event_type_code);
CREATE INDEX IF NOT EXISTS idx_beo_gl_code ON beo_banquet_orders(gl_code);

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_gl_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE beo_sequence_tracker ENABLE ROW LEVEL SECURITY;

-- Event types: Org members can view
CREATE POLICY event_types_select ON event_types FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

-- Outlet GL codes: Org members can manage
CREATE POLICY outlet_gl_select ON outlet_gl_codes FOR SELECT
  USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY outlet_gl_insert ON outlet_gl_codes FOR INSERT
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY outlet_gl_update ON outlet_gl_codes FOR UPDATE
  USING (org_id = auth.jwt() ->> 'org_id');

-- Sequence tracker: Service role only (for BEO generation)
CREATE POLICY beo_seq_all ON beo_sequence_tracker FOR ALL
  USING (org_id = auth.jwt() ->> 'org_id');

-- =====================================================
-- DEPRECATION NOTES
-- =====================================================

-- The old generate_beo_number function is deprecated in favor of generate_enhanced_beo_number
-- Migration: Old format "BEO-2025-001" → New format "AUR-0-20250314-WED-0001"
-- Both functions coexist during transition period

-- Migration 013: Supplier Certifications & Compliance Management
-- Tracks food safety certifications, compliance documents, audit history

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CERTIFICATION TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS certification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,  -- 'food_safety', 'organic', 'environmental', 'quality'
  description TEXT,
  required_for_food BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO certification_types (code, name, category, description, required_for_food) VALUES
  ('sqa', 'Safe Quality Food (SQF)', 'food_safety', 'GFSI certified food safety standard', TRUE),
  ('fssc', 'Food Safety System Certification (FSSC)', 'food_safety', 'GFSI certified system', TRUE),
  ('brc', 'BRC Global Standard', 'food_safety', 'GFSI certified supply chain security', TRUE),
  ('haccp', 'HACCP Certification', 'food_safety', 'Hazard Analysis and Critical Control Points', TRUE),
  ('organic', 'USDA Organic', 'organic', 'Certified organic producer', FALSE),
  ('non_gmo', 'Non-GMO Project Verified', 'organic', 'Non-GMO certification', FALSE),
  ('iso_9001', 'ISO 9001', 'quality', 'Quality management system', FALSE),
  ('iso_45001', 'ISO 45001', 'environmental', 'Occupational health and safety', FALSE),
  ('humane_certified', 'Humane Certified', 'environmental', 'Animal welfare certification', FALSE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SUPPLIER CERTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  certification_type_id UUID NOT NULL REFERENCES certification_types(id),
  cert_number TEXT,
  issued_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issuing_body TEXT,
  document_url TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'pending_renewal')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supplier_id, certification_type_id, cert_number)
);

CREATE INDEX supplier_certs_supplier_idx ON supplier_certifications (supplier_id);
CREATE INDEX supplier_certs_status_idx ON supplier_certifications (status);
CREATE INDEX supplier_certs_expiry_idx ON supplier_certifications (expiry_date);

-- ============================================================================
-- COMPLIANCE DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('insurance', 'liability', 'workers_comp', 'food_handler', 'other')),
  document_name TEXT NOT NULL,
  document_url TEXT,
  expiry_date DATE,
  required_for_trading BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'expired', 'missing', 'invalid')),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX compliance_docs_supplier_idx ON supplier_compliance_documents (supplier_id);
CREATE INDEX compliance_docs_status_idx ON supplier_compliance_documents (status);

-- ============================================================================
-- SUPPLIER AUDIT SCHEDULE
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_audit_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  audit_type TEXT CHECK (audit_type IN ('on_site', 'desk_review', 'third_party', 'self_audit')),
  risk_tier TEXT DEFAULT 'medium' CHECK (risk_tier IN ('low', 'medium', 'high')),
  audit_frequency_days INT,  -- e.g., 365 for annual, 90 for quarterly
  last_audit_date DATE,
  next_audit_due_date DATE,
  scheduled_audit_date DATE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, supplier_id)
);

CREATE INDEX audit_schedule_org_supplier_idx ON supplier_audit_schedule (organization_id, supplier_id);
CREATE INDEX audit_schedule_due_idx ON supplier_audit_schedule (next_audit_due_date);
CREATE INDEX audit_schedule_status_idx ON supplier_audit_schedule (status);

-- ============================================================================
-- AUDIT FINDINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_schedule_id UUID NOT NULL REFERENCES supplier_audit_schedule(id) ON DELETE CASCADE,
  finding_type TEXT,  -- 'non_conformance', 'observation', 'strength'
  severity TEXT CHECK (severity IN ('critical', 'major', 'minor', 'observation')),
  description TEXT NOT NULL,
  corrective_action TEXT,
  due_date DATE,
  closure_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'reopened')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX audit_findings_schedule_idx ON supplier_audit_findings (audit_schedule_id);
CREATE INDEX audit_findings_status_idx ON supplier_audit_findings (status);

-- ============================================================================
-- FUNCTION: Check certification expiry (for alerts)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_expiring_certifications(
  p_organization_id UUID,
  p_days_warning INT DEFAULT 30
)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name TEXT,
  cert_name TEXT,
  expiry_date DATE,
  days_until_expiry INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    ct.name,
    sc.expiry_date,
    (sc.expiry_date - CURRENT_DATE)::INT
  FROM supplier_certifications sc
  JOIN vendors v ON sc.supplier_id = v.id
  JOIN certification_types ct ON sc.certification_type_id = ct.id
  WHERE v.organization_id = p_organization_id
    AND sc.status = 'active'
    AND sc.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + (p_days_warning || ' days')::INTERVAL
  ORDER BY sc.expiry_date ASC;
END
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMPLIANCE STATUS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW supplier_compliance_status AS
SELECT
  v.id as supplier_id,
  v.name as supplier_name,
  v.organization_id,
  COUNT(DISTINCT ct.id) as required_cert_count,
  COUNT(DISTINCT CASE WHEN sc.status = 'active' THEN sc.id END) as valid_certs,
  COUNT(DISTINCT CASE WHEN sc.status = 'expired' THEN sc.id END) as expired_certs,
  COUNT(DISTINCT CASE WHEN scd.status = 'valid' THEN scd.id END) as valid_docs,
  COUNT(DISTINCT CASE WHEN scd.status IN ('expired', 'missing') THEN scd.id END) as missing_docs,
  CASE
    WHEN COUNT(DISTINCT CASE WHEN sc.status = 'expired' THEN sc.id END) > 0 THEN 'at_risk'
    WHEN COUNT(DISTINCT CASE WHEN scd.status IN ('expired', 'missing') THEN scd.id END) > 0 THEN 'at_risk'
    WHEN COUNT(DISTINCT ct.id) > 0 AND COUNT(DISTINCT CASE WHEN sc.status = 'active' THEN sc.id END) = COUNT(DISTINCT ct.id) THEN 'compliant'
    ELSE 'needs_review'
  END as compliance_status
FROM vendors v
LEFT JOIN certification_types ct ON ct.required_for_food = TRUE
LEFT JOIN supplier_certifications sc ON v.id = sc.supplier_id AND ct.id = sc.certification_type_id
LEFT JOIN supplier_compliance_documents scd ON v.id = scd.supplier_id
GROUP BY v.id, v.name, v.organization_id;

-- Invoice Processing & GL Integration
-- Advanced invoice processing with OCR, GL mapping, and multi-outlet/cost center tracking

CREATE TABLE IF NOT EXISTS invoice_processing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ocr_profile TEXT DEFAULT 'standard' CHECK (ocr_profile IN ('standard', 'advanced', 'enhanced')),
  extract_line_items BOOLEAN DEFAULT TRUE,
  auto_match_items BOOLEAN DEFAULT TRUE,
  auto_post_gl BOOLEAN DEFAULT FALSE,
  require_approval BOOLEAN DEFAULT TRUE,
  default_gl_code_id UUID REFERENCES gl_codes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, organization_id, name)
);

CREATE INDEX IF NOT EXISTS templates_org_vendor_idx ON invoice_processing_templates(organization_id, vendor_id);

CREATE TABLE IF NOT EXISTS invoice_extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  extraction_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_file_size INT,
  source_file_uri TEXT,
  extraction_method TEXT NOT NULL CHECK (extraction_method IN ('ocr', 'api', 'manual', 'edi')),
  ocr_confidence_overall NUMERIC(5,2),
  extracted_number TEXT,
  extracted_date DATE,
  extracted_vendor_name TEXT,
  extracted_subtotal NUMERIC(14,4),
  extracted_tax NUMERIC(14,4),
  extracted_total NUMERIC(14,4),
  extracted_line_count INT DEFAULT 0,
  line_extraction_status TEXT DEFAULT 'pending' CHECK (line_extraction_status IN ('pending', 'processing', 'completed', 'partial', 'failed')),
  variance_detected BOOLEAN DEFAULT FALSE,
  variance_details JSONB,
  raw_extraction_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS extraction_org_invoice_idx ON invoice_extraction_results(organization_id, invoice_id);
CREATE INDEX IF NOT EXISTS extraction_method_idx ON invoice_extraction_results(extraction_method, created_at DESC);
CREATE INDEX IF NOT EXISTS extraction_status_idx ON invoice_extraction_results(line_extraction_status, created_at DESC);

CREATE TABLE IF NOT EXISTS invoice_line_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  extraction_result_id UUID NOT NULL REFERENCES invoice_extraction_results(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
  line_number INT NOT NULL,
  extracted_description TEXT,
  extracted_sku TEXT,
  extracted_quantity NUMERIC(14,4),
  extracted_unit TEXT,
  extracted_unit_price NUMERIC(14,6),
  extracted_extended_price NUMERIC(14,4),
  confidence_score NUMERIC(5,2),
  matched_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  match_confidence NUMERIC(5,2),
  match_method TEXT CHECK (match_method IN ('sku_exact', 'sku_fuzzy', 'name_fuzzy', 'manual')),
  variance_flag BOOLEAN DEFAULT FALSE,
  variance_details JSONB,
  manual_override BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS line_extractions_extraction_idx ON invoice_line_extractions(extraction_result_id);
CREATE INDEX IF NOT EXISTS line_extractions_item_idx ON invoice_line_extractions(matched_item_id);
CREATE INDEX IF NOT EXISTS line_extractions_variance_idx ON invoice_line_extractions(variance_flag) WHERE variance_flag = TRUE;

CREATE TABLE IF NOT EXISTS invoice_gl_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_line_id UUID REFERENCES invoice_lines(id) ON DELETE SET NULL,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES gl_codes(id) ON DELETE SET NULL,
  cost_center_code TEXT,
  gl_code_id UUID NOT NULL REFERENCES gl_codes(id) ON DELETE CASCADE,
  gl_code TEXT NOT NULL,
  allocation_type TEXT NOT NULL DEFAULT 'invoice_line' CHECK (allocation_type IN (
    'invoice_line', 'proportional', 'manual', 'auto_mapped'
  )),
  allocated_amount NUMERIC(14,4) NOT NULL,
  allocation_percentage NUMERIC(5,2),
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  quantity NUMERIC(14,4),
  unit_cost NUMERIC(14,6),
  posting_status TEXT DEFAULT 'pending' CHECK (posting_status IN (
    'pending', 'approved', 'posted', 'reversed', 'error'
  )),
  posting_date DATE,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, invoice_line_id, outlet_id, gl_code_id)
);

CREATE INDEX IF NOT EXISTS allocations_org_outlet_idx ON invoice_gl_allocations(organization_id, outlet_id);
CREATE INDEX IF NOT EXISTS allocations_invoice_idx ON invoice_gl_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS allocations_gl_code_idx ON invoice_gl_allocations(gl_code_id);
CREATE INDEX IF NOT EXISTS allocations_status_idx ON invoice_gl_allocations(posting_status, created_at DESC);
CREATE INDEX IF NOT EXISTS allocations_posted_date_idx ON invoice_gl_allocations(post_period, posting_status);

CREATE TABLE IF NOT EXISTS invoice_variance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  variance_type TEXT NOT NULL CHECK (variance_type IN (
    'line_count', 'total_amount', 'tax_calculation', 'sku_mismatch',
    'quantity_variance', 'price_variance', 'duplicate', 'missing_item'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  expected_value NUMERIC(14,4),
  actual_value NUMERIC(14,4),
  variance_amount NUMERIC(14,4),
  variance_percentage NUMERIC(7,4),
  description TEXT NOT NULL,
  requires_manual_review BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS variance_org_idx ON invoice_variance_tracking(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS variance_invoice_idx ON invoice_variance_tracking(invoice_id);
CREATE INDEX IF NOT EXISTS variance_severity_idx ON invoice_variance_tracking(severity, requires_manual_review);

CREATE TABLE IF NOT EXISTS invoice_approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL DEFAULT 'standard' CHECK (workflow_type IN (
    'standard', 'high_value', 'variance_detected', 'variance_critical'
  )),
  total_amount NUMERIC(14,4),
  approval_threshold NUMERIC(14,4),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_review', 'approved', 'rejected', 'escalated'
  )),
  required_approvers INT DEFAULT 1,
  approvals_received INT DEFAULT 0,
  current_reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflows_org_idx ON invoice_approval_workflows(organization_id, status);
CREATE INDEX IF NOT EXISTS workflows_invoice_idx ON invoice_approval_workflows(invoice_id);
CREATE INDEX IF NOT EXISTS workflows_amount_idx ON invoice_approval_workflows(total_amount);

CREATE TABLE IF NOT EXISTS invoice_gl_posting_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES invoice_gl_allocations(id) ON DELETE CASCADE,
  post_period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'processing', 'posted', 'failed'
  )),
  posting_attempt INT DEFAULT 0,
  last_error TEXT,
  scheduled_post_date DATE,
  actual_post_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, allocation_id, post_period)
);

CREATE INDEX IF NOT EXISTS posting_queue_status_idx ON invoice_gl_posting_queue(status, scheduled_post_date);
CREATE INDEX IF NOT EXISTS posting_queue_period_idx ON invoice_gl_posting_queue(post_period);

CREATE TABLE IF NOT EXISTS vendor_invoice_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  payment_terms TEXT,
  net_days INT DEFAULT 30,
  discount_percentage NUMERIC(5,2),
  discount_days INT,
  early_payment_discount_percentage NUMERIC(5,2),
  early_payment_discount_days INT,
  freight_code TEXT,
  standard_freight_amount NUMERIC(12,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id)
);

CREATE INDEX IF NOT EXISTS terms_vendor_idx ON vendor_invoice_terms(vendor_id);

-- RLS POLICIES

ALTER TABLE invoice_processing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_extraction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_gl_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_variance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_gl_posting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_invoice_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_org_access ON invoice_processing_templates
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id IN (
        SELECT oi.outlet_id FROM outlets oi
        WHERE oi.id IN (
          SELECT om2.outlet_id FROM outlet_memberships om2 WHERE om2.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY extraction_org_access ON invoice_extraction_results
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
    )
  );

CREATE POLICY allocations_org_access ON invoice_gl_allocations
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = invoice_gl_allocations.outlet_id
    )
  );

CREATE POLICY allocations_insert ON invoice_gl_allocations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.outlet_id = invoice_gl_allocations.outlet_id
      AND om.role IN ('admin', 'manager', 'finance')
    )
  );

CREATE POLICY variance_org_access ON invoice_variance_tracking
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
    )
  );

CREATE POLICY workflows_org_access ON invoice_approval_workflows
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT om.user_id FROM outlet_memberships om
      WHERE om.role IN ('admin', 'manager', 'finance')
    )
  );

CREATE POLICY posting_queue_admin_access ON invoice_gl_posting_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM outlet_memberships om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- COMPOSITE INDEXES FOR PERFORMANCE

CREATE INDEX IF NOT EXISTS allocations_composite_idx ON invoice_gl_allocations(
  organization_id, outlet_id, posting_status, post_period
);

CREATE INDEX IF NOT EXISTS extraction_composite_idx ON invoice_extraction_results(
  organization_id, created_at DESC, line_extraction_status
);
